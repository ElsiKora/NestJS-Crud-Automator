import type { ApiFunctionTransactionRegistry } from "@class/api/function/transaction/registry.class";
import type { QueryRunner } from "typeorm";

import { ErrorException } from "@utility/error/exception.utility";

/**
 * Follows the transaction levels of the query runner an Automator transaction owns, so after-commit callbacks keep savepoint semantics.
 * TypeORM opens a savepoint when a transaction starts on a query runner that is already in one, as `entityManager.transaction` does on the manager of the transaction, and releases or rolls back that savepoint on its COMMIT or ROLLBACK.
 * The tracker wraps those three methods on the query runner instance only and puts them back when the transaction has ended.
 * After each call, also one that throws, it lines the levels of the registry up with the transaction depth TypeORM keeps, so a failed RELEASE SAVEPOINT or a TypeORM transaction subscriber that throws cannot leave them out of step.
 */
export class ApiFunctionTransactionSavepointTracker {
	/**
	 * Runs work while the transaction methods of a query runner report each level to the registry, and puts the methods back afterwards, also when the work throws.
	 * @template R - Work result type.
	 * @param {QueryRunner} queryRunner - Query runner the Automator transaction owns.
	 * @param {ApiFunctionTransactionRegistry} registry - Registry of the transaction.
	 * @param {() => Promise<R>} work - Work that starts and ends the transaction on the query runner.
	 * @returns {Promise<R>} Work result.
	 * @throws {Error} When the query runner keeps no TypeORM transaction depth.
	 */
	public static async run<R>(queryRunner: QueryRunner, registry: ApiFunctionTransactionRegistry, work: () => Promise<R>): Promise<R> {
		ApiFunctionTransactionSavepointTracker.readDepth(queryRunner);

		const names: ReadonlyArray<"commitTransaction" | "rollbackTransaction" | "startTransaction"> = ["commitTransaction", "rollbackTransaction", "startTransaction"];
		const descriptors: ReadonlyArray<PropertyDescriptor | undefined> = names.map((name: "commitTransaction" | "rollbackTransaction" | "startTransaction"): PropertyDescriptor | undefined => Object.getOwnPropertyDescriptor(queryRunner, name));
		const startTransaction: QueryRunner["startTransaction"] = queryRunner.startTransaction.bind(queryRunner);
		const commitTransaction: QueryRunner["commitTransaction"] = queryRunner.commitTransaction.bind(queryRunner);
		const rollbackTransaction: QueryRunner["rollbackTransaction"] = queryRunner.rollbackTransaction.bind(queryRunner);

		const track = async (call: () => Promise<void>, isReleased: boolean): Promise<void> => {
			try {
				await call();
			} finally {
				registry.alignAfterCommitLevels(ApiFunctionTransactionSavepointTracker.readDepth(queryRunner), isReleased);
			}
		};

		try {
			queryRunner.startTransaction = async (...parameters: Parameters<QueryRunner["startTransaction"]>): Promise<void> => {
				await track(async (): Promise<void> => {
					await startTransaction(...parameters);
				}, false);
			};

			queryRunner.commitTransaction = async (): Promise<void> => {
				await track(async (): Promise<void> => {
					await commitTransaction();
				}, true);
			};

			queryRunner.rollbackTransaction = async (): Promise<void> => {
				await track(async (): Promise<void> => {
					await rollbackTransaction();
				}, false);
			};

			return await work();
		} finally {
			for (const [index, name] of names.entries()) {
				const descriptor: PropertyDescriptor | undefined = descriptors[index];

				if (descriptor) {
					Object.defineProperty(queryRunner, name, descriptor);
				} else {
					Reflect.deleteProperty(queryRunner, name);
				}
			}
		}
	}

	private static readDepth(queryRunner: QueryRunner): number {
		// TypeORM keeps the depth protected on every query runner; it counts the transaction and each savepoint open inside it.
		const depth: unknown = Reflect.get(queryRunner, "transactionDepth");

		if (typeof depth !== "number" || !Number.isSafeInteger(depth) || depth < 0) {
			throw ErrorException("Automator transactions need the TypeORM transaction depth of their query runner");
		}

		return depth;
	}
}
