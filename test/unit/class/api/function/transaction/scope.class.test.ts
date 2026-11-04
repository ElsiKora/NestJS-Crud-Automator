import type { IApiFunctionTransactionObservationOptions } from "@interface/class/api/function";
import type { EntityManager } from "typeorm";

import { AsyncResource } from "node:async_hooks";

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

	it("gives another data source its own transaction inside an active one", async () => {
		const outer = createTransactionFixture();
		const inner = createTransactionFixture();
		const managers: Array<EntityManager> = [];

		await ApiFunctionTransactionScope.runWithDataSource(outer.dataSource, { name: "outer" }, async () => {
			await ApiFunctionTransactionScope.runWithDataSource(inner.dataSource, { name: "inner" }, async (entityManager: EntityManager) => {
				managers.push(entityManager);
			});
			managers.push(ApiFunctionContextStorage.getEventManager() as EntityManager);
		});

		expect(managers).toEqual([inner.entityManager, outer.entityManager]);
		expect(inner.queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
		expect(outer.queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
	});

	it("joins an active transaction again from another data source's scope", async () => {
		const outer = createTransactionFixture();
		const inner = createTransactionFixture();
		let joined: EntityManager | undefined;

		await ApiFunctionTransactionScope.runWithDataSource(outer.dataSource, { name: "outer" }, async () => {
			await ApiFunctionTransactionScope.runWithDataSource(inner.dataSource, { name: "inner" }, async () => {
				await ApiFunctionTransactionScope.runWithDataSource(outer.dataSource, { name: "back" }, async (entityManager: EntityManager) => {
					joined = entityManager;
				});
			});
		});

		expect(joined).toBe(outer.entityManager);
		expect(outer.dataSource.createQueryRunner).toHaveBeenCalledTimes(1);
	});

	it.each([
		["a scope", async (outer: ReturnType<typeof createTransactionFixture>): Promise<EntityManager | undefined> => await ApiFunctionTransactionScope.runWithDataSource(outer.dataSource, { name: "back" }, async (entityManager: EntityManager) => entityManager)],
		["a REQUIRED function", async (outer: ReturnType<typeof createTransactionFixture>): Promise<EntityManager | undefined> => await ApiFunctionExecuteWithTransaction({ callback: async (entityManager: EntityManager | undefined) => entityManager, entity: class {}, functionType: EApiFunctionTransactionTraceType.STEP, methodName: "back", mode: EApiFunctionTransactionMode.REQUIRED, repository: { manager: outer.entityManager } as never })],
	])("joins an active transaction again from %s after a call on another data source without a transaction", async (_name: string, callBack: (outer: ReturnType<typeof createTransactionFixture>) => Promise<EntityManager | undefined>) => {
		const outer = createTransactionFixture();
		const inner = createTransactionFixture();
		let hop: EntityManager | undefined;
		let joined: EntityManager | undefined;

		await ApiFunctionTransactionScope.runWithDataSource(outer.dataSource, { name: "outer" }, async () => {
			await ApiFunctionExecuteWithTransaction({
				callback: async (entityManager: EntityManager | undefined) => {
					hop = entityManager;
					joined = await callBack(outer);
				},
				entity: class {},
				functionType: EApiFunctionTransactionTraceType.STEP,
				methodName: "hop",
				mode: EApiFunctionTransactionMode.SUPPORTS,
				repository: { manager: inner.entityManager } as never,
			});
		});

		expect(hop).toBeUndefined();
		expect(joined).toBe(outer.entityManager);
		expect(outer.dataSource.createQueryRunner).toHaveBeenCalledTimes(1);
		expect(inner.dataSource.createQueryRunner).not.toHaveBeenCalled();
	});

	it("joins an active transaction on the same data source", async () => {
		const { dataSource, entityManager, queryRunner } = createTransactionFixture();
		let joined: EntityManager | undefined;

		await ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "outer" }, async () => {
			await ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "inner" }, async (manager: EntityManager) => {
				joined = manager;
			});
		});

		expect(joined).toBe(entityManager);
		expect(dataSource.createQueryRunner).toHaveBeenCalledTimes(1);
		expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
	});

	it("refuses an observation when it joins an active transaction", async () => {
		const { dataSource } = createTransactionFixture();

		await expect(ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "outer" }, async () => await ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "inner", observation: { onSettled: () => undefined, selectors: [] } }, async () => undefined))).rejects.toThrow("cannot use an observation");
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

	describe("transaction values", () => {
		const KEY: unique symbol = Symbol("authority");

		const runFunction = async <R>(mode: EApiFunctionTransactionMode, entityManager: EntityManager, callback: () => Promise<R>): Promise<R> => await ApiFunctionExecuteWithTransaction({ callback, entity: class {}, functionType: EApiFunctionTransactionTraceType.STEP, methodName: "participant", mode, repository: { manager: entityManager } as never });

		it("refuses to bind a value outside an Automator transaction and reads none there", async () => {
			expect(() => ApiFunctionTransactionScope.setValue(KEY, "value")).toThrow("ApiFunctionTransactionScope.setValue requires an active Automator transaction");
			await expect(ApiFunctionTransactionScope.runWithValue(KEY, "value", async () => undefined)).rejects.toThrow("ApiFunctionTransactionScope.runWithValue requires an active Automator transaction");
			expect(ApiFunctionTransactionScope.getValue(KEY)).toBeUndefined();
		});

		it("refuses a key that is not a symbol", async () => {
			const { dataSource } = createTransactionFixture();

			await ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "key" }, async () => {
				expect(() => ApiFunctionTransactionScope.setValue("authority" as unknown as symbol, "value")).toThrow("ApiFunctionTransactionScope.setValue requires a symbol key");
			});
		});

		it("shows the value to every participant that joined the transaction", async () => {
			const { dataSource, entityManager } = createTransactionFixture();
			const seen: Array<unknown> = [];

			await ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "owner" }, async () => {
				ApiFunctionTransactionScope.setValue(KEY, "owner");
				await runFunction(EApiFunctionTransactionMode.REQUIRED, entityManager, async () => {
					seen.push(ApiFunctionTransactionScope.getValue(KEY));
					await runFunction(EApiFunctionTransactionMode.MANDATORY, entityManager, async () => {
						seen.push(ApiFunctionTransactionScope.getValue(KEY));
						ApiFunctionTransactionScope.setValue(KEY, "participant");
					});
				});
				await ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "joined" }, async (joined: EntityManager) => {
					seen.push(ApiFunctionTransactionScope.getValue(KEY));
					await ApiFunctionTransactionScope.runWithEntityManager(joined, async () => {
						seen.push(ApiFunctionTransactionScope.getValue(KEY));
					});
				});
			});

			expect(seen).toEqual(["owner", "owner", "participant", "participant"]);
			expect(dataSource.createQueryRunner).toHaveBeenCalledTimes(1);
		});

		it("keeps the values of a transaction another DataSource opens inside it apart", async () => {
			const outer = createTransactionFixture();
			const inner = createTransactionFixture();
			const seen: Array<unknown> = [];

			await ApiFunctionTransactionScope.runWithDataSource(outer.dataSource, { name: "outer" }, async () => {
				ApiFunctionTransactionScope.setValue(KEY, "outer");
				await ApiFunctionTransactionScope.runWithDataSource(inner.dataSource, { name: "inner" }, async () => {
					seen.push(ApiFunctionTransactionScope.getValue(KEY));
					ApiFunctionTransactionScope.setValue(KEY, "inner");
					await ApiFunctionTransactionScope.runWithDataSource(outer.dataSource, { name: "back" }, async () => {
						seen.push(ApiFunctionTransactionScope.getValue(KEY));
					});
					seen.push(ApiFunctionTransactionScope.getValue(KEY));
				});
				seen.push(ApiFunctionTransactionScope.getValue(KEY));
			});

			expect(seen).toEqual([undefined, "outer", "inner", "outer"]);
		});

		it("reads none and binds none after a hop to another DataSource without a transaction", async () => {
			const outer = createTransactionFixture();
			const inner = createTransactionFixture();
			const seen: Array<unknown> = [];

			await ApiFunctionTransactionScope.runWithDataSource(outer.dataSource, { name: "outer" }, async () => {
				ApiFunctionTransactionScope.setValue(KEY, "outer");
				await runFunction(EApiFunctionTransactionMode.SUPPORTS, inner.entityManager, async () => {
					seen.push(ApiFunctionTransactionScope.getValue(KEY));
					expect(() => ApiFunctionTransactionScope.setValue(KEY, "hop")).toThrow("requires an active Automator transaction");
					await runFunction(EApiFunctionTransactionMode.REQUIRED, outer.entityManager, async () => {
						seen.push(ApiFunctionTransactionScope.getValue(KEY));
					});
				});
			});

			expect(seen).toEqual([undefined, "outer"]);
			expect(inner.dataSource.createQueryRunner).not.toHaveBeenCalled();
		});

		it.each([
			["commit", async (): Promise<void> => undefined],
			[
				"rollback",
				async (): Promise<void> => {
					throw new Error("rolled back");
				},
			],
		])("releases the values after %s, also for work that keeps the async context of the transaction", async (_outcome: string, finish: () => Promise<void>) => {
			const { dataSource } = createTransactionFixture();
			let read: (() => unknown) | undefined;
			let write: (() => void) | undefined;

			await ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "settled" }, async () => {
				ApiFunctionTransactionScope.setValue(KEY, "value");
				read = AsyncResource.bind(() => ApiFunctionTransactionScope.getValue(KEY));
				write = AsyncResource.bind(() => ApiFunctionTransactionScope.setValue(KEY, "late"));
				expect(read()).toBe("value");
				await finish();
			}).catch(() => undefined);

			expect(read?.()).toBeUndefined();
			expect(() => write?.()).toThrow("Cannot bind a value to an Automator transaction that has ended");
			expect(ApiFunctionTransactionScope.getValue(KEY)).toBeUndefined();
			await ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "next" }, async () => {
				expect(ApiFunctionTransactionScope.getValue(KEY)).toBeUndefined();
			});
		});

		it("gives two parallel transactions their own value under the same key", async () => {
			const first = createTransactionFixture();
			const second = createTransactionFixture();
			let bound: number = 0;
			let unblock: (() => void) | undefined;
			const barrier: Promise<void> = new Promise<void>((resolve) => {
				unblock = resolve;
			});

			// Both transactions bind their value before either reads it.
			const run = async (dataSource: typeof first.dataSource, value: string): Promise<unknown> =>
				await ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: value }, async () => {
					ApiFunctionTransactionScope.setValue(KEY, value);
					bound += 1;

					if (bound === 2) unblock?.();
					await barrier;

					return ApiFunctionTransactionScope.getValue(KEY);
				});

			await expect(Promise.all([run(first.dataSource, "first"), run(second.dataSource, "second")])).resolves.toEqual(["first", "second"]);
		});

		it("puts back the previous value or its absence after runWithValue, also when the callback throws", async () => {
			const { dataSource } = createTransactionFixture();
			const seen: Array<unknown> = [];
			const error: Error = new Error("callback failed");

			await ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "restore" }, async () => {
				await ApiFunctionTransactionScope.runWithValue(KEY, "first", async () => {
					seen.push(ApiFunctionTransactionScope.getValue(KEY));
					await expect(
						ApiFunctionTransactionScope.runWithValue(KEY, "second", async () => {
							seen.push(ApiFunctionTransactionScope.getValue(KEY));

							throw error;
						}),
					).rejects.toBe(error);
					seen.push(ApiFunctionTransactionScope.getValue(KEY));
				});
				seen.push(ApiFunctionTransactionScope.getValue(KEY), ApiFunctionContextStorage.getTransactionRegistry()?.hasValue(KEY));
			});

			expect(seen).toEqual(["first", "second", "first", undefined, false]);
		});

		it("returns the callback result of runWithValue", async () => {
			const { dataSource } = createTransactionFixture();

			await expect(ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "result" }, async () => await ApiFunctionTransactionScope.runWithValue(KEY, 1, async () => ApiFunctionTransactionScope.getValue<number>(KEY)))).resolves.toBe(1);
		});
	});
});
