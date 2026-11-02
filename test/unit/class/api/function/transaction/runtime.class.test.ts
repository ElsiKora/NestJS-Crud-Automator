import type { IApiFunctionTransaction } from "@interface/class/api/function";
import type { DataSource, EntityManager } from "typeorm";

import { setTimeout } from "node:timers/promises";

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

	describe("on a driver with one connection", () => {
		const OWNER = { entityName: "Entity", kind: EApiFunctionTransactionOwnerKind.ROUTE, methodName: "create", routeType: EApiRouteType.CREATE } as const;

		function createTrackedDataSource(type: string): { dataSource: DataSource; events: Array<string> } {
			const { dataSource, queryRunner } = createTransactionFixture();
			const events: Array<string> = [];

			Object.assign(dataSource, { options: { type } });
			vi.mocked(queryRunner.startTransaction).mockImplementation(async () => {
				events.push("begin");
			});
			vi.mocked(queryRunner.commitTransaction).mockImplementation(async () => {
				events.push("commit");
			});
			vi.mocked(queryRunner.rollbackTransaction).mockImplementation(async () => {
				events.push("rollback");
			});

			return { dataSource, events };
		}

		it.each([["better-sqlite3"], ["capacitor"], ["cordova"], ["expo"], ["nativescript"], ["react-native"], ["sqljs"]])("runs the transactions of %s one after another, whatever each one's outcome", async (type: string) => {
			const { dataSource, events } = createTrackedDataSource(type);
			const results: Array<PromiseSettledResult<string>> = await Promise.allSettled(
				["first", "second", "third"].map(
					async (name: string) =>
						await ApiFunctionTransactionRuntime.execute({
							callback: async () => {
								await setTimeout(1);

								if (name === "second") {
									throw new Error("second failed");
								}

								return name;
							},
							dataSource,
							owner: OWNER,
						}),
				),
			);

			expect(events).toEqual(["begin", "commit", "begin", "rollback", "begin", "commit"]);
			expect(results.map((result: PromiseSettledResult<string>) => result.status)).toEqual(["fulfilled", "rejected", "fulfilled"]);
		});

		it("keeps the turn of each DataSource apart", async () => {
			const first = createTrackedDataSource("better-sqlite3");
			const second = createTrackedDataSource("better-sqlite3");
			let release: () => void = () => undefined;
			const held: Promise<void> = new Promise<void>((resolve: () => void) => {
				release = resolve;
			});
			const holding: Promise<void> = ApiFunctionTransactionRuntime.execute({ callback: async () => await held, dataSource: first.dataSource, owner: OWNER });

			await ApiFunctionTransactionRuntime.execute({ callback: async () => undefined, dataSource: second.dataSource, owner: OWNER });

			expect(second.events).toEqual(["begin", "commit"]);
			release();
			await holding;
		});

		it("lets transactions overlap on a driver with a connection pool", async () => {
			const { dataSource, events } = createTrackedDataSource("postgres");

			await Promise.all(["first", "second"].map(async () => await ApiFunctionTransactionRuntime.execute({ callback: async () => await setTimeout(1), dataSource, owner: OWNER })));

			expect(events).toEqual(["begin", "begin", "commit", "commit"]);
		});

		it("ends the turn before the post-transaction hooks, so a hook can open the next transaction", async () => {
			const { dataSource, events } = createTrackedDataSource("better-sqlite3");

			vi.spyOn(ApiFunctionTransactionLifecycle, "executeAfterCommit").mockImplementationOnce(async () => {
				await ApiFunctionTransactionRuntime.execute({ callback: async () => undefined, dataSource, owner: OWNER });
			});

			await ApiFunctionTransactionRuntime.execute({ callback: async () => undefined, dataSource, owner: OWNER });

			expect(events).toEqual(["begin", "commit", "begin", "commit"]);
		});

		it("still refuses to open a transaction inside an active one instead of waiting for its own turn", async () => {
			const { dataSource } = createTrackedDataSource("better-sqlite3");

			await expect(
				ApiFunctionTransactionRuntime.execute({
					callback: async () => await ApiFunctionTransactionRuntime.execute({ callback: async () => undefined, dataSource, owner: OWNER }),
					dataSource,
					owner: OWNER,
				}),
			).rejects.toThrow("Cannot open an owning transaction inside an active Automator transaction");
		});

		it("gives the next transaction its turn after one fails to begin", async () => {
			const { dataSource, events } = createTrackedDataSource("better-sqlite3");
			const queryRunner = dataSource.createQueryRunner();

			vi.mocked(queryRunner.startTransaction).mockRejectedValueOnce(new Error("busy"));

			await expect(ApiFunctionTransactionRuntime.execute({ callback: async () => undefined, dataSource, owner: OWNER })).rejects.toThrow("busy");
			await ApiFunctionTransactionRuntime.execute({ callback: async () => undefined, dataSource, owner: OWNER });

			expect(events).toEqual(["begin", "commit"]);
		});
	});

	describe("work kept until the transaction settles", () => {
		const OWNER = { kind: EApiFunctionTransactionOwnerKind.FUNCTION, name: "create" } as never;

		it("runs after the rollback and outside the transaction", async () => {
			const { dataSource, queryRunner } = createTransactionFixture();
			const failure: Error = new Error("insert failed");
			let wasRolledBack: boolean | undefined;
			let registryInWork: unknown = "unset";

			await expect(
				ApiFunctionTransactionRuntime.execute({
					callback: async (): Promise<void> => {
						ApiFunctionContextStorage.getTransactionRegistry()?.deferUntilSettled(async (): Promise<void> => {
							wasRolledBack = vi.mocked(queryRunner.rollbackTransaction).mock.calls.length === 1;
							registryInWork = ApiFunctionContextStorage.getTransactionRegistry();
						});

						throw failure;
					},
					dataSource,
					owner: OWNER,
				}),
			).rejects.toBe(failure);

			expect(wasRolledBack).toBe(true);
			expect(registryInWork).toBeUndefined();
		});

		it("answers with the error of work that failed after a rollback", async () => {
			const { dataSource } = createTransactionFixture();
			const replacement: Error = new Error("from the hook");

			await expect(
				ApiFunctionTransactionRuntime.execute({
					callback: async (): Promise<void> => {
						ApiFunctionContextStorage.getTransactionRegistry()?.deferUntilSettled(async (): Promise<void> => {
							throw replacement;
						});

						throw new Error("insert failed");
					},
					dataSource,
					owner: OWNER,
				}),
			).rejects.toBe(replacement);
		});

		it("keeps the committed result when work fails after a commit", async () => {
			const { dataSource, queryRunner } = createTransactionFixture();
			const errorLog = vi.spyOn(LoggerUtility.prototype, "error").mockImplementation((): void => undefined);

			await expect(
				ApiFunctionTransactionRuntime.execute({
					callback: async (): Promise<string> => {
						ApiFunctionContextStorage.getTransactionRegistry()?.deferUntilSettled(async (): Promise<void> => {
							throw new Error("from the hook");
						});

						return "committed";
					},
					dataSource,
					owner: OWNER,
				}),
			).resolves.toBe("committed");

			expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
			expect(errorLog).toHaveBeenCalledWith(expect.stringContaining("Work after a settled transaction failed"));
		});
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
