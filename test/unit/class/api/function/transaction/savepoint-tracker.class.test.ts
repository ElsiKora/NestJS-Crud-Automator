import type { DataSource, EntityManager, QueryRunner } from "typeorm";

import { AsyncResource } from "node:async_hooks";

import { ApiFunctionTransactionPostCommitException } from "@class/api/function/transaction/exception";
import { ApiFunctionTransactionRegistry } from "@class/api/function/transaction/registry.class";
import { ApiFunctionTransactionRuntime } from "@class/api/function/transaction/runtime.class";
import { ApiFunctionTransactionScope } from "@class/api/function/transaction/scope.class";
import { EApiFunctionTransactionFailureStage, EApiFunctionTransactionOutcome, EApiFunctionTransactionOwnerKind } from "@enum/decorator/api";
import { LoggerUtility } from "@utility/logger.utility";
import { afterEach, describe, expect, it, vi } from "vitest";

const OWNER = { kind: EApiFunctionTransactionOwnerKind.SCOPE, name: "savepoints" } as const;

/**
 * A query runner that keeps the transaction depth and the savepoint statements as TypeORM 1.x does, with its transaction methods on the prototype.
 */
class FakeQueryRunner {
	public readonly dataSource: DataSource;

	public failNextRelease: boolean = false;

	// Whether the driver counts its transaction and savepoints, which SAP and Spanner do not in TypeORM 1.1.
	public isDepthKept: boolean = true;

	public isTransactionActive: boolean = false;

	public readonly manager: EntityManager;

	public readonly statements: Array<string> = [];

	public throwAfterNextCommit: boolean = false;

	public throwAfterNextStart: boolean = false;

	protected transactionDepth: number = 0;

	constructor(dataSource: DataSource) {
		this.dataSource = dataSource;
		this.manager = { dataSource } as unknown as EntityManager;
	}

	public async commitTransaction(): Promise<void> {
		if (!this.isTransactionActive) throw new Error("Transaction is not started");

		if (this.transactionDepth > 1) {
			if (this.failNextRelease) {
				this.failNextRelease = false;

				throw new Error("RELEASE SAVEPOINT failed");
			}

			this.statements.push(`RELEASE SAVEPOINT typeorm_${String(this.transactionDepth - 1)}`);
		} else {
			this.statements.push("COMMIT");
			this.isTransactionActive = false;
		}

		if (this.isDepthKept) this.transactionDepth -= 1;

		if (this.throwAfterNextCommit) {
			this.throwAfterNextCommit = false;

			throw new Error("transaction subscriber failed");
		}
	}

	public async connect(): Promise<void> {
		this.statements.push("CONNECT");
	}

	public async release(): Promise<void> {
		this.statements.push("RELEASE");
	}

	public async rollbackTransaction(): Promise<void> {
		if (!this.isTransactionActive) throw new Error("Transaction is not started");

		if (this.transactionDepth > 1) {
			this.statements.push(`ROLLBACK TO SAVEPOINT typeorm_${String(this.transactionDepth - 1)}`);
		} else {
			this.statements.push("ROLLBACK");
			this.isTransactionActive = false;
		}

		if (this.isDepthKept) this.transactionDepth -= 1;
	}

	public async startTransaction(): Promise<void> {
		this.isTransactionActive = true;
		this.statements.push(this.transactionDepth === 0 ? "START TRANSACTION" : `SAVEPOINT typeorm_${String(this.transactionDepth)}`);
		if (this.isDepthKept) this.transactionDepth += 1;

		if (this.throwAfterNextStart) {
			this.throwAfterNextStart = false;

			throw new Error("transaction subscriber failed");
		}
	}

	/**
	 * Runs work in a nested transaction the way TypeORM `EntityManager.transaction` does on the manager of a transaction.
	 * @param {() => Promise<R>} work - Work inside the savepoint.
	 * @returns {Promise<R>} Work result.
	 */
	public async transaction<R>(work: () => Promise<R>): Promise<R> {
		try {
			await this.startTransaction();
			const result: R = await work();
			await this.commitTransaction();

			return result;
		} catch (error) {
			try {
				await this.rollbackTransaction();
			} catch {
				// TypeORM throws the original error even when the rollback fails.
			}

			throw error;
		}
	}
}

function createDataSource(type: string = "postgres"): { dataSource: DataSource; queryRunner: FakeQueryRunner } {
	const dataSource = { options: { type } } as unknown as DataSource;
	const queryRunner: FakeQueryRunner = new FakeQueryRunner(dataSource);

	Object.assign(dataSource, { createQueryRunner: (): QueryRunner => queryRunner as unknown as QueryRunner });

	return { dataSource, queryRunner };
}

async function runOwner<R>(dataSource: DataSource, callback: () => Promise<R>): Promise<R> {
	return await ApiFunctionTransactionRuntime.execute({ callback, dataSource, owner: OWNER });
}

describe("ApiFunctionTransactionSavepointTracker", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("runs the callbacks after the outermost COMMIT in registration order", async () => {
		const { dataSource, queryRunner } = createDataSource();
		const released: Array<string> = [];

		const result: string = await runOwner(dataSource, async () => {
			ApiFunctionTransactionScope.onAfterCommit(() => {
				released.push(`first after ${String(queryRunner.statements.at(-2))}`);
			});
			ApiFunctionTransactionScope.onAfterCommit(async () => {
				released.push("second");
			});

			return "result";
		});

		expect(result).toBe("result");
		expect(released).toEqual(["first after COMMIT", "second"]);
	});

	it("drops the callbacks on rollback", async () => {
		const { dataSource } = createDataSource();
		const callback = vi.fn();
		const operationError = new Error("operation failed");

		await expect(
			runOwner(dataSource, async () => {
				ApiFunctionTransactionScope.onAfterCommit(callback);

				throw operationError;
			}),
		).rejects.toBe(operationError);
		expect(callback).not.toHaveBeenCalled();
	});

	it("drops the callbacks when the COMMIT outcome is unknown", async () => {
		const { dataSource, queryRunner } = createDataSource();
		const callback = vi.fn();

		vi.spyOn(queryRunner, "commitTransaction").mockRejectedValueOnce(new Error("connection lost"));

		await expect(
			runOwner(dataSource, async () => {
				ApiFunctionTransactionScope.onAfterCommit(callback);
			}),
		).rejects.toMatchObject({ outcome: EApiFunctionTransactionOutcome.UNKNOWN });
		expect(callback).not.toHaveBeenCalled();
	});

	it("keeps a callback of a released savepoint and drops one of a savepoint that rolled back, for nested transactions and manual starts", async () => {
		const { dataSource, queryRunner } = createDataSource();
		const released: Array<string> = [];
		const register = (name: string): void => {
			ApiFunctionTransactionScope.onAfterCommit(() => {
				released.push(name);
			});
		};

		await runOwner(dataSource, async () => {
			register("outer before");
			await queryRunner.transaction(async () => {
				register("released savepoint");
				await queryRunner
					.transaction(async () => {
						register("inner savepoint that rolls back");

						throw new Error("inner failed");
					})
					.catch(() => undefined);
				register("released savepoint after its child rolled back");
			});
			await queryRunner
				.transaction(async () => {
					register("savepoint that rolls back");
					await queryRunner.transaction(async () => {
						register("released into a savepoint that rolls back");
					});

					throw new Error("savepoint failed");
				})
				.catch(() => undefined);

			await queryRunner.startTransaction();
			register("manual savepoint that rolls back");
			await queryRunner.rollbackTransaction();
			await queryRunner.startTransaction();
			register("manual savepoint that is released");
			await queryRunner.commitTransaction();
			register("outer after");
		});

		expect(released).toEqual(["outer before", "released savepoint", "released savepoint after its child rolled back", "manual savepoint that is released", "outer after"]);
		expect(queryRunner.statements).toContain("ROLLBACK TO SAVEPOINT typeorm_2");
		expect(queryRunner.statements.filter((statement: string) => statement === "COMMIT")).toHaveLength(1);
	});

	it("drops the callbacks of a savepoint whose RELEASE failed and that then rolled back, and keeps its parent's", async () => {
		const { dataSource, queryRunner } = createDataSource();
		const released: Array<string> = [];

		await runOwner(dataSource, async () => {
			ApiFunctionTransactionScope.onAfterCommit(() => {
				released.push("outer");
			});
			queryRunner.failNextRelease = true;
			await expect(
				queryRunner.transaction(async () => {
					ApiFunctionTransactionScope.onAfterCommit(() => {
						released.push("savepoint");
					});
				}),
			).rejects.toThrow("RELEASE SAVEPOINT failed");
		});

		expect(released).toEqual(["outer"]);
	});

	it("follows the transaction depth when a TypeORM transaction subscriber throws after the savepoint changed", async () => {
		const { dataSource, queryRunner } = createDataSource();
		const released: Array<string> = [];

		await runOwner(dataSource, async () => {
			// The savepoint opened before the subscriber threw, so the rollback that follows undoes it.
			queryRunner.throwAfterNextStart = true;
			await expect(
				queryRunner.transaction(async () => {
					released.push("never runs");
				}),
			).rejects.toThrow("transaction subscriber failed");

			// The savepoint was released before the subscriber threw, so its callback joins the transaction.
			await queryRunner.startTransaction();
			ApiFunctionTransactionScope.onAfterCommit(() => {
				released.push("released savepoint");
			});
			queryRunner.throwAfterNextCommit = true;
			await expect(queryRunner.commitTransaction()).rejects.toThrow("transaction subscriber failed");
			ApiFunctionTransactionScope.onAfterCommit(() => {
				released.push("outer");
			});
		});

		expect(released).toEqual(["released savepoint", "outer"]);
		expect(queryRunner.statements).toEqual(["CONNECT", "START TRANSACTION", "SAVEPOINT typeorm_1", "ROLLBACK TO SAVEPOINT typeorm_1", "SAVEPOINT typeorm_1", "RELEASE SAVEPOINT typeorm_1", "COMMIT", "RELEASE"]);
	});

	it("puts the transaction methods back and leaks no callback into the next transaction on a shared query runner", async () => {
		const { dataSource, queryRunner } = createDataSource("better-sqlite3");
		const released: Array<string> = [];

		await runOwner(dataSource, async () => {
			ApiFunctionTransactionScope.onAfterCommit(() => {
				released.push("first");
			});
			await queryRunner
				.transaction(async () => {
					ApiFunctionTransactionScope.onAfterCommit(() => {
						released.push("first savepoint");
					});

					throw new Error("savepoint failed");
				})
				.catch(() => undefined);
		});

		expect(Object.hasOwn(queryRunner, "startTransaction")).toBe(false);
		expect(Object.hasOwn(queryRunner, "commitTransaction")).toBe(false);
		expect(Object.hasOwn(queryRunner, "rollbackTransaction")).toBe(false);

		await runOwner(dataSource, async () => {
			ApiFunctionTransactionScope.onAfterCommit(() => {
				released.push("second");
			});
		});

		expect(released).toEqual(["first", "second"]);
		expect(Object.hasOwn(queryRunner, "startTransaction")).toBe(false);
	});

	it("puts the transaction methods back when the connection, the start or the release fails", async () => {
		const failures: ReadonlyArray<"connect" | "release" | "startTransaction"> = ["connect", "startTransaction", "release"];

		vi.spyOn(LoggerUtility.prototype, "error").mockImplementation((): void => undefined);

		for (const method of failures) {
			const { dataSource, queryRunner } = createDataSource();
			const own: Record<string, unknown> = queryRunner as unknown as Record<string, unknown>;
			const original: unknown = own[method];

			// An own property, as a test double or a driver may have, is put back as it was.
			own[method] = vi.fn(async () => {
				throw new Error(`${method} failed`);
			});
			const replaced: unknown = own[method];
			const outcome: Promise<void> = runOwner(dataSource, async () => undefined);

			if (method === "release") {
				await expect(outcome).resolves.toBeUndefined();
			} else {
				await expect(outcome).rejects.toThrow(`${method} failed`);
			}

			expect(own[method]).toBe(replaced);
			expect(own[method]).not.toBe(original);

			for (const name of ["commitTransaction", "rollbackTransaction", "startTransaction"].filter((candidate: string) => candidate !== method)) {
				expect(Object.hasOwn(queryRunner, name)).toBe(false);
			}
		}
	});

	it("refuses a query runner without a TypeORM transaction depth before it connects", async () => {
		const { dataSource, queryRunner } = createDataSource();

		Reflect.set(queryRunner, "transactionDepth", undefined);

		await expect(runOwner(dataSource, async () => undefined)).rejects.toThrow("Automator transactions need the TypeORM transaction depth of their query runner");
		expect(queryRunner.statements).toEqual([]);
	});

	it("runs every callback when one fails, then the subscriber hooks, and throws one post-commit exception with the first error as cause", async () => {
		const { dataSource } = createDataSource();
		const errorLog = vi.spyOn(LoggerUtility.prototype, "error").mockImplementation((): void => undefined);
		const firstError = Object.assign(new Error("secret payload in message"), { code: "23505" });
		const secondError = new TypeError("second");
		const third = vi.fn();
		let thrown: unknown;

		try {
			await runOwner(dataSource, async () => {
				ApiFunctionTransactionScope.onAfterCommit(() => {
					throw firstError;
				});
				ApiFunctionTransactionScope.onAfterCommit(async () => {
					throw secondError;
				});
				ApiFunctionTransactionScope.onAfterCommit(third);
			});
		} catch (error) {
			thrown = error;
		}

		expect(thrown).toBeInstanceOf(ApiFunctionTransactionPostCommitException);
		expect(thrown).toMatchObject({
			cause: firstError,
			hookFailures: [
				{ error: firstError, stage: EApiFunctionTransactionFailureStage.AFTER_COMMIT, subscriberName: undefined },
				{ error: secondError, stage: EApiFunctionTransactionFailureStage.AFTER_COMMIT, subscriberName: undefined },
			],
			outcome: EApiFunctionTransactionOutcome.COMMITTED,
		});
		expect(third).toHaveBeenCalledOnce();
		expect(errorLog.mock.calls.map((call: Array<unknown>) => call[0])).toEqual([expect.stringMatching(/^After-commit callback 1 of transaction [\da-f-]+ failed: errorType=Error sqlState=23505$/u), expect.stringMatching(/^After-commit callback 2 of transaction [\da-f-]+ failed: errorType=TypeError$/u)]);
		expect(JSON.stringify(errorLog.mock.calls)).not.toContain("secret payload");
	});

	it("drops the committed callbacks unrun when the COMMIT succeeded but a TypeORM transaction subscriber threw after it", async () => {
		const { dataSource, queryRunner } = createDataSource();
		const callback = vi.fn();
		const take = vi.spyOn(ApiFunctionTransactionRegistry.prototype, "takeAfterCommitCallbacks");

		await expect(
			runOwner(dataSource, async () => {
				ApiFunctionTransactionScope.onAfterCommit(callback);
				queryRunner.throwAfterNextCommit = true;
			}),
		).rejects.toMatchObject({ outcome: EApiFunctionTransactionOutcome.UNKNOWN });

		expect(queryRunner.statements).toContain("COMMIT");
		expect(callback).not.toHaveBeenCalled();
		// The owner takes the committed callbacks off the registry anyway, so it keeps no closure alive.
		expect(take.mock.results.map((result: { value: unknown }) => result.value)).toEqual([[callback]]);
	});

	it("refuses a callback with the name of the driver when the open transaction keeps the depth at 0, and still commits", async () => {
		const { dataSource, queryRunner } = createDataSource("sap");
		let refusal: unknown;

		queryRunner.isDepthKept = false;

		await expect(
			runOwner(dataSource, async () => {
				try {
					ApiFunctionTransactionScope.onAfterCommit(() => undefined);
				} catch (error) {
					refusal = error;
				}

				return "committed";
			}),
		).resolves.toBe("committed");
		expect((refusal as Error).message).toContain("Automator after-commit callbacks need the TypeORM transaction depth, which the sap driver does not keep");
		expect(queryRunner.statements).toContain("COMMIT");
	});

	it("shares the level of an open savepoint with parallel work in the same transaction, so a rollback of that savepoint drops the parallel callback too", async () => {
		const { dataSource, queryRunner } = createDataSource();
		const released: Array<string> = [];
		let openSavepoint: () => void = () => undefined;
		let rollBack: () => void = () => undefined;
		const isSavepointOpen: Promise<void> = new Promise<void>((resolve: () => void) => {
			openSavepoint = resolve;
		});
		const mayRollBack: Promise<void> = new Promise<void>((resolve: () => void) => {
			rollBack = resolve;
		});

		await runOwner(dataSource, async () => {
			await Promise.all([
				queryRunner
					.transaction(async () => {
						openSavepoint();
						await mayRollBack;

						throw new Error("savepoint failed");
					})
					.catch(() => undefined),
				(async (): Promise<void> => {
					await isSavepointOpen;
					// This branch opened no savepoint, but the innermost open level is the other branch's.
					ApiFunctionTransactionScope.onAfterCommit(() => {
						released.push("parallel branch");
					});
					rollBack();
				})(),
			]);
			ApiFunctionTransactionScope.onAfterCommit(() => {
				released.push("after both");
			});
		});

		expect(released).toEqual(["after both"]);
	});

	describe("registration", () => {
		it("refuses a callback outside an Automator transaction and a value that is not a function", async () => {
			const { dataSource } = createDataSource();

			expect(() => ApiFunctionTransactionScope.onAfterCommit(() => undefined)).toThrow("ApiFunctionTransactionScope.onAfterCommit requires an active Automator transaction");
			await runOwner(dataSource, async () => {
				expect(() => ApiFunctionTransactionScope.onAfterCommit("publish" as never)).toThrow("ApiFunctionTransactionScope.onAfterCommit requires a function callback");
			});
		});

		it("refuses a callback from the async context of a transaction that has ended, and from a running callback", async () => {
			const { dataSource } = createDataSource();
			let registerLater: () => void = () => undefined;
			let errorInCallback: unknown;

			await runOwner(dataSource, async () => {
				// Work that keeps the async context of the transaction, as a timer started inside it does.
				registerLater = AsyncResource.bind((): void => {
					ApiFunctionTransactionScope.onAfterCommit(() => undefined);
				});
				ApiFunctionTransactionScope.onAfterCommit(() => {
					try {
						ApiFunctionTransactionScope.onAfterCommit(() => undefined);
					} catch (error) {
						errorInCallback = error;
					}
				});
			});

			expect(registerLater).toThrow("Cannot register an after-commit callback on an Automator transaction that has ended");
			expect(errorInCallback).toBeInstanceOf(Error);
			expect((errorInCallback as Error).message).toContain("ApiFunctionTransactionScope.onAfterCommit requires an active Automator transaction");
		});
	});
});
