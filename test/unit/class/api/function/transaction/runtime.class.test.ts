import type { IApiFunctionTransaction } from "@interface/class/api/function";
import type { EntityManager } from "typeorm";

import { ApiFunctionContextStorage } from "@class/api/function/context-storage.class";
import { ApiFunctionTransactionLifecycle } from "@class/api/function/transaction/lifecycle.class";
import { ApiFunctionTransactionRuntime } from "@class/api/function/transaction/runtime.class";
import { EApiFunctionTransactionOutcome, EApiFunctionTransactionOwnerKind, EApiRouteType } from "@enum/decorator/api";
import { LoggerUtility } from "@utility/logger.utility";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createTransactionFixture } from "@test/unit/fixture";

describe("ApiFunctionTransactionRuntime", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("binds a route-shaped owner and manager through the owning transaction", async () => {
		const { dataSource, entityManager, queryRunner } = createTransactionFixture();
		let transaction: Readonly<IApiFunctionTransaction> | undefined;

		const result = await ApiFunctionTransactionRuntime.execute({
			callback: async (manager: EntityManager) => {
				expect(manager).toBe(entityManager);
				expect(ApiFunctionContextStorage.getEventManager()).toBe(entityManager);
				transaction = ApiFunctionContextStorage.getTransactionRegistry()?.getTransaction();

				return "result";
			},
			dataSource,
			owner: {
				entityName: "RouteEntity",
				kind: EApiFunctionTransactionOwnerKind.ROUTE,
				methodName: "create",
				routeType: EApiRouteType.CREATE,
			},
		});

		expect(result).toBe("result");
		expect(transaction).toEqual({
			id: expect.any(String),
			owner: {
				entityName: "RouteEntity",
				kind: EApiFunctionTransactionOwnerKind.ROUTE,
				methodName: "create",
				routeType: EApiRouteType.CREATE,
			},
		});
		expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
		expect(queryRunner.release).toHaveBeenCalledTimes(1);
		expect(ApiFunctionContextStorage.getTransactionRegistry()).toBeUndefined();
	});

	it("logs only bounded evidence when query-runner release fails", async () => {
		const { dataSource, queryRunner } = createTransactionFixture();
		const secretSentinel: string = "SECRET_RELEASE_QUERY_PARAMETERS_MESSAGE_STACK";
		const driverError: Error & { code?: string; query?: string } = new Error(secretSentinel);
		driverError.code = "08006";
		driverError.query = secretSentinel;
		const releaseError = Object.assign(new Error(secretSentinel, { cause: driverError }), {
			driverError,
			name: "QueryFailedError",
			parameters: [secretSentinel],
			query: secretSentinel,
		});
		const errorLog = vi.spyOn(LoggerUtility.prototype, "error").mockImplementation(() => undefined);

		vi.mocked(queryRunner.release).mockRejectedValue(releaseError);

		await expect(
			ApiFunctionTransactionRuntime.execute({
				callback: async () => "result",
				dataSource,
				owner: { kind: EApiFunctionTransactionOwnerKind.SCOPE, name: "release-evidence" },
			}),
		).resolves.toBe("result");

		expect(errorLog).toHaveBeenCalledTimes(1);
		expect(errorLog.mock.calls[0]).toEqual(["Failed to release transaction query runner: errorType=QueryFailedError sqlState=08006"]);
		expect(errorLog.mock.calls.flat().join(" ")).not.toContain(secretSentinel);
	});
	it.each([
		{ expected: EApiFunctionTransactionOutcome.COMMITTED, failure: "none" },
		{ expected: EApiFunctionTransactionOutcome.ROLLED_BACK, failure: "operation" },
		{ expected: EApiFunctionTransactionOutcome.ROLLED_BACK, failure: "undefined" },
		{ expected: EApiFunctionTransactionOutcome.UNKNOWN, failure: "rollback" },
		{ expected: EApiFunctionTransactionOutcome.UNKNOWN, failure: "commit" },
		{ expected: EApiFunctionTransactionOutcome.COMMITTED, failure: "post-commit" },
	])("observes $failure only after release and terminal lifecycle, with outcome $expected", async ({ expected, failure }) => {
		const { dataSource, queryRunner } = createTransactionFixture();
		const operationError = new Error("operation");
		const lifecycleError = new Error("post-commit");
		if (failure === "rollback") vi.mocked(queryRunner.rollbackTransaction).mockRejectedValueOnce(new Error("rollback"));
		if (failure === "commit") vi.mocked(queryRunner.commitTransaction).mockRejectedValueOnce(new Error("commit"));
		const order: Array<string> = [];
		const originalCommit = ApiFunctionTransactionLifecycle.executeAfterCommit;
		const originalRollback = ApiFunctionTransactionLifecycle.executeAfterRollback;
		const originalUnknown = ApiFunctionTransactionLifecycle.executeCommitUnknown;
		vi.spyOn(ApiFunctionTransactionLifecycle, "executeAfterCommit").mockImplementation(async (registry) => {
			order.push("lifecycle");
			if (failure === "post-commit") throw lifecycleError;
			return await originalCommit(registry);
		});
		vi.spyOn(ApiFunctionTransactionLifecycle, "executeAfterRollback").mockImplementation(async (...arguments_) => {
			order.push("lifecycle");
			return await originalRollback(...arguments_);
		});
		vi.spyOn(ApiFunctionTransactionLifecycle, "executeCommitUnknown").mockImplementation(async (...arguments_) => {
			order.push("lifecycle");
			return await originalUnknown(...arguments_);
		});
		const observations: Array<unknown> = [];
		const observe = vi.fn((snapshot) => {
			order.push("observation");
			observations.push({ snapshot, registry: ApiFunctionContextStorage.getTransactionRegistry(), releases: vi.mocked(queryRunner.release).mock.calls.length });
		});
		const result = ApiFunctionTransactionRuntime.execute({
			callback: async () => {
				if (failure === "undefined") throw undefined;
				if (failure === "operation" || failure === "rollback") throw operationError;
				return undefined;
			},
			dataSource,
			observation: { onSettled: observe, selectors: [] },
			owner: { kind: EApiFunctionTransactionOwnerKind.SCOPE, name: "observed" },
		});
		if (failure === "none") await expect(result).resolves.toBeUndefined();
		else if (failure === "operation") await expect(result).rejects.toBe(operationError);
		else if (failure === "undefined") await expect(result).rejects.toBeUndefined();
		else if (failure === "post-commit") await expect(result).rejects.toBe(lifecycleError);
		else await expect(result).rejects.toMatchObject({ outcome: EApiFunctionTransactionOutcome.UNKNOWN });
		expect(order).toEqual(["lifecycle", "observation"]);
		expect(observations).toEqual([{ snapshot: { droppedCount: 0, measurements: [], outcome: expected }, registry: undefined, releases: 1 }]);
		expect(observe).toHaveBeenCalledTimes(1);
	});

	it.each(["throw", "reject", "thenable", "getter", "pending"])("isolates a %s observer without awaiting or changing the native result", async (failure) => {
		const { dataSource, queryRunner } = createTransactionFixture();
		const observe = vi.fn(() => {
			if (failure === "throw") throw new Error("observer");
			if (failure === "reject") return Promise.reject(new Error("observer"));
			if (failure === "thenable")
				return {
					then: (_resolve: unknown, reject: (error: Error) => void) => {
						reject(new Error("observer"));
					},
				};
			if (failure === "getter")
				return Object.defineProperty({}, "then", {
					get: () => {
						throw new Error("observer");
					},
				});
			return new Promise<void>(() => undefined);
		});
		const result = { stable: true };
		await expect(ApiFunctionTransactionRuntime.execute({ callback: async () => result, dataSource, observation: { onSettled: observe, selectors: [] }, owner: { kind: EApiFunctionTransactionOwnerKind.SCOPE, name: "observer-failure" } })).resolves.toBe(result);
		await new Promise<void>((resolve) => {
			setImmediate(resolve);
		});
		expect(observe).toHaveBeenCalledTimes(1);
		expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
		expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
	});

	it("preserves a thrown undefined when the observer also fails", async () => {
		const { dataSource } = createTransactionFixture();
		const observe = vi.fn(() => {
			throw new Error("observer");
		});
		await expect(
			ApiFunctionTransactionRuntime.execute({
				callback: async () => {
					throw undefined;
				},
				dataSource,
				observation: { onSettled: observe, selectors: [] },
				owner: { kind: EApiFunctionTransactionOwnerKind.SCOPE, name: "undefined" },
			}),
		).rejects.toBeUndefined();
		expect(observe).toHaveBeenCalledTimes(1);
	});
});
