import type { IApiFunctionTransactionObservationOptions } from "@interface/class/api/function";

import { ApiFunctionContextStorage } from "@class/api/function/context-storage.class";
import { ApiFunctionTransactionCommitUnknownOutcomeException, ApiFunctionTransactionRollbackException } from "@class/api/function/transaction/exception";
import { ApiFunctionTransactionScope } from "@class/api/function/transaction/scope.class";
import { EApiFunctionTransactionOwnerKind, EApiFunctionTransactionOutcome, EApiFunctionTransactionTraceType, EApiFunctionTransactionMode } from "@enum/decorator/api";
import { ApiFunctionExecuteWithTransaction } from "@utility/api/function-transaction.utility";
import { describe, expect, it, vi } from "vitest";

import { createTransactionFixture } from "@test/unit/fixture";

describe("ApiFunctionTransactionScope", () => {
	it("owns a trimmed named transaction and permits join-only manager scopes", async () => {
		const { dataSource, entityManager, queryRunner } = createTransactionFixture();

		const result = await ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "  registration  " }, async (ownerEntityManager) => {
			expect(ownerEntityManager).toBe(entityManager);
			expect(ApiFunctionContextStorage.get()?.eventManager).toBe(entityManager);
			expect(ApiFunctionContextStorage.getTransactionRegistry()?.getTransaction()).toMatchObject({
				id: expect.any(String),
				owner: {
					kind: EApiFunctionTransactionOwnerKind.SCOPE,
					name: "registration",
				},
			});

			return await ApiFunctionTransactionScope.runWithEntityManager(ownerEntityManager, async () => {
				expect(ApiFunctionContextStorage.get()?.eventManager).toBe(entityManager);

				return "joined";
			});
		});

		expect(result).toBe("joined");
		expect(dataSource.createQueryRunner).toHaveBeenCalledTimes(1);
		expect(queryRunner.connect).toHaveBeenCalledTimes(1);
		expect(queryRunner.startTransaction).toHaveBeenCalledTimes(1);
		expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
		expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
		expect(queryRunner.release).toHaveBeenCalledTimes(1);
		expect(ApiFunctionContextStorage.get()).toBeUndefined();
		expect(ApiFunctionContextStorage.getTransactionRegistry()).toBeUndefined();
	});

	it("rejects join-only manager scopes without an Automator owner registry", async () => {
		const { entityManager } = createTransactionFixture();

		await expect(ApiFunctionTransactionScope.runWithEntityManager(entityManager, async () => undefined)).rejects.toThrow("runWithEntityManager requires an existing Automator transaction owner registry");
	});

	it("rejects a different manager while an owner registry is active", async () => {
		const owner = createTransactionFixture();
		const other = createTransactionFixture();

		await expect(ApiFunctionTransactionScope.runWithDataSource(owner.dataSource, { name: "owner" }, async () => await ApiFunctionTransactionScope.runWithEntityManager(other.entityManager, async () => undefined))).rejects.toThrow("runWithEntityManager requires an existing Automator transaction owner registry");
	});

	it("rejects a nested owning data-source transaction", async () => {
		const outer = createTransactionFixture();
		const inner = createTransactionFixture();

		await expect(ApiFunctionTransactionScope.runWithDataSource(outer.dataSource, { name: "outer" }, async () => await ApiFunctionTransactionScope.runWithDataSource(inner.dataSource, { name: "inner" }, async () => undefined))).rejects.toThrow("Cannot open an owning transaction inside an active Automator transaction");
		expect(inner.dataSource.createQueryRunner).not.toHaveBeenCalled();
	});

	it.each(["", " ", "\t\n"])("rejects the empty scope name %j", async (name: string) => {
		const { dataSource } = createTransactionFixture();

		await expect(ApiFunctionTransactionScope.runWithDataSource(dataSource, { name }, async () => undefined)).rejects.toThrow("name must be a non-empty string");
		expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
	});

	it("rolls back and rethrows callback errors unchanged", async () => {
		const { dataSource, queryRunner } = createTransactionFixture();
		const error = new Error("scope failed");

		await expect(
			ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "rollback" }, async () => {
				throw error;
			}),
		).rejects.toBe(error);
		expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
		expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
		expect(queryRunner.release).toHaveBeenCalledTimes(1);
	});

	it("reports rollback failure while retaining the operation error", async () => {
		const { dataSource, queryRunner } = createTransactionFixture();
		const operationError = new Error("scope failed");
		const rollbackError = new Error("rollback failed");

		vi.mocked(queryRunner.rollbackTransaction).mockRejectedValueOnce(rollbackError);

		await expect(
			ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "rollback-failure" }, async () => {
				throw operationError;
			}),
		).rejects.toMatchObject({
			name: ApiFunctionTransactionRollbackException.name,
			operationError,
			rollbackFailure: {
				error: rollbackError,
			},
		});
		expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
		expect(queryRunner.release).toHaveBeenCalledTimes(1);
	});

	it("reports an unknown outcome and attempts cleanup when COMMIT fails", async () => {
		const { dataSource, queryRunner } = createTransactionFixture();
		const commitError = new Error("commit failed");

		vi.mocked(queryRunner.commitTransaction).mockRejectedValueOnce(commitError);

		await expect(ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "commit-failure" }, async () => "result")).rejects.toMatchObject({
			commitFailure: {
				error: commitError,
			},
			name: ApiFunctionTransactionCommitUnknownOutcomeException.name,
		});
		expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
		expect(queryRunner.release).toHaveBeenCalledTimes(1);
	});

	it("attaches best-effort cleanup failure to an unknown COMMIT outcome", async () => {
		const { dataSource, queryRunner } = createTransactionFixture();
		const commitError = new Error("commit failed");
		const cleanupError = new Error("cleanup rollback failed");

		vi.mocked(queryRunner.commitTransaction).mockRejectedValueOnce(commitError);
		vi.mocked(queryRunner.rollbackTransaction).mockRejectedValueOnce(cleanupError);

		await expect(ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "commit-cleanup-failure" }, async () => "result")).rejects.toMatchObject({
			cleanupFailure: {
				error: cleanupError,
			},
			commitFailure: {
				error: commitError,
			},
			name: ApiFunctionTransactionCommitUnknownOutcomeException.name,
		});
		expect(queryRunner.release).toHaveBeenCalledTimes(1);
	});

	it.each(["connect", "startTransaction"] as const)("releases the query runner when %s fails", async (phase: "connect" | "startTransaction") => {
		const { dataSource, queryRunner } = createTransactionFixture();
		const error = new Error(`${phase} failed`);

		vi.mocked(queryRunner[phase]).mockRejectedValueOnce(error);

		await expect(ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: phase }, async () => undefined)).rejects.toBe(error);
		expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
		expect(queryRunner.release).toHaveBeenCalledTimes(1);
	});
	it("copies observation configuration before connection I/O and never exposes transaction authority", async () => {
		class Entity {}
		class OtherEntity {}
		const { dataSource, queryRunner } = createTransactionFixture();
		const originalObserver = vi.fn();
		const replacementObserver = vi.fn();
		const selector = { entity: Entity, functionType: EApiFunctionTransactionTraceType.STEP, methodName: "step" };
		const observation = { onSettled: originalObserver, selectors: [selector] };
		vi.mocked(queryRunner.connect).mockImplementationOnce(async () => {
			observation.onSettled = replacementObserver;
			selector.entity = OtherEntity;
			selector.methodName = "changed";
			observation.selectors.length = 0;
		});
		await ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "copied", observation }, async () => await ApiFunctionExecuteWithTransaction({ callback: async () => "result", entity: Entity, functionType: EApiFunctionTransactionTraceType.STEP, methodName: "step", mode: EApiFunctionTransactionMode.MANDATORY }));
		expect(originalObserver).toHaveBeenCalledWith({ droppedCount: 0, measurements: [{ durationMs: expect.any(Number), selectorIndex: 0, status: "SUCCEEDED" }], outcome: EApiFunctionTransactionOutcome.COMMITTED });
		expect(replacementObserver).not.toHaveBeenCalled();
	});

	it("rejects invalid observation contracts before query-runner creation", async () => {
		class Entity {}
		const selector = { entity: Entity, functionType: EApiFunctionTransactionTraceType.STEP, methodName: "step" };
		const invalid = [
			{ onSettled: null, selectors: [selector] },
			{ onSettled: vi.fn(), selectors: null },
			{ onSettled: vi.fn(), selectors: Array.from({ length: 33 }, (_, index) => ({ ...selector, methodName: `step${index}` })) },
			{ onSettled: vi.fn(), selectors: [selector, { ...selector }] },
			...[null, { ...selector, entity: {} }, { ...selector, functionType: "unknown" }, { ...selector, methodName: " " }, { ...selector, methodName: "a".repeat(257) }].map((value) => ({ onSettled: vi.fn(), selectors: [value] })),
		];
		for (const observation of invalid) {
			const { dataSource } = createTransactionFixture();
			await expect(ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "invalid", observation: observation as unknown as IApiFunctionTransactionObservationOptions }, async () => undefined)).rejects.toThrow("Invalid transaction observation");
			expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
		}
	});

	it.each(["connect", "startTransaction"] as const)("does not observe a scope whose %s fails", async (phase) => {
		const { dataSource, queryRunner } = createTransactionFixture();
		const observe = vi.fn();
		const error = new Error("startup");
		vi.mocked(queryRunner[phase]).mockRejectedValueOnce(error);
		await expect(ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "startup", observation: { onSettled: observe, selectors: [] } }, async () => undefined)).rejects.toBe(error);
		expect(observe).not.toHaveBeenCalled();
	});

	it("keeps concurrent owner observations separate and delivers after context teardown", async () => {
		class Entity {}
		const first = createTransactionFixture();
		const second = createTransactionFixture();
		let unblock: (() => void) | undefined;
		const barrier = new Promise<void>((resolve) => {
			unblock = resolve;
		});
		const contexts: Array<unknown> = [];
		const firstObserver = vi.fn(() => {
			contexts.push(ApiFunctionContextStorage.getTransactionRegistry());
		});
		const secondObserver = vi.fn(() => {
			contexts.push(ApiFunctionContextStorage.getTransactionRegistry());
		});
		const selectors = [{ entity: Entity, functionType: EApiFunctionTransactionTraceType.STEP, methodName: "step" }];
		const firstResult = ApiFunctionTransactionScope.runWithDataSource(
			first.dataSource,
			{ name: "first", observation: { onSettled: firstObserver, selectors } },
			async () =>
				await ApiFunctionExecuteWithTransaction({
					callback: async () => {
						await barrier;
						return "first";
					},
					entity: Entity,
					functionType: EApiFunctionTransactionTraceType.STEP,
					methodName: "step",
					mode: EApiFunctionTransactionMode.MANDATORY,
				}),
		);
		const secondResult = ApiFunctionTransactionScope.runWithDataSource(second.dataSource, { name: "second", observation: { onSettled: secondObserver, selectors } }, async () => "second");
		await expect(secondResult).resolves.toBe("second");
		expect(firstObserver).not.toHaveBeenCalled();
		unblock?.();
		await expect(firstResult).resolves.toBe("first");
		expect(firstObserver).toHaveBeenCalledWith(expect.objectContaining({ measurements: [expect.objectContaining({ selectorIndex: 0 })] }));
		expect(secondObserver).toHaveBeenCalledWith(expect.objectContaining({ measurements: [] }));
		expect(contexts).toEqual([undefined, undefined]);
	});
});
