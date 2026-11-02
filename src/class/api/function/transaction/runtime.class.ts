import type { IApiFunctionTransactionFailure, IApiFunctionTransactionObservationOptions } from "@interface/class/api/function";
import type { TApiFunctionTransactionOwner } from "@type/class/api/function";
import type { DataSource, EntityManager, QueryRunner } from "typeorm";

import { randomUUID } from "node:crypto";

import { ApiFunctionContextStorage } from "@class/api/function/context-storage.class";
import { ApiFunctionTransactionLifecycle } from "@class/api/function/transaction/lifecycle.class";
import { ApiFunctionTransactionRegistry } from "@class/api/function/transaction/registry.class";
import { DATABASE_DRIVER_TYPE_CONSTANT } from "@constant/database-driver-type.constant";
import { EApiFunctionTransactionFailureStage, EApiFunctionTransactionOutcome } from "@enum/decorator/api";
import { FormatErrorEvidenceForLog } from "@utility/error/evidence-for-log.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { LoggerUtility } from "@utility/logger.utility";

const transactionLogger: LoggerUtility = LoggerUtility.getLogger("ApiFunctionTransactionRuntime");

export class ApiFunctionTransactionRuntime {
	private static readonly TURNS: WeakMap<DataSource, Promise<void>> = new WeakMap<DataSource, Promise<void>>();

	public static async execute<R>(options: { callback: (entityManager: EntityManager) => Promise<R>; dataSource: DataSource; observation?: Readonly<IApiFunctionTransactionObservationOptions>; owner: TApiFunctionTransactionOwner }): Promise<R> {
		if (ApiFunctionContextStorage.getTransactionRegistry()) {
			throw ErrorException("Cannot open an owning transaction inside an active Automator transaction");
		}

		const registry: ApiFunctionTransactionRegistry = new ApiFunctionTransactionRegistry(randomUUID(), options.owner, options.observation);

		const result: { value?: R } = {};
		let commitCleanupFailure: IApiFunctionTransactionFailure | undefined;
		let commitError: unknown;
		let hasCommitError: boolean = false;
		let hasOperationError: boolean = false;
		let operationError: unknown;
		let rollbackFailure: IApiFunctionTransactionFailure | undefined;

		// The turn ends with the transaction, so a hook that runs after it can open the next one.
		await ApiFunctionTransactionRuntime.runInTurn(options.dataSource, async (): Promise<void> => {
			const queryRunner: QueryRunner = options.dataSource.createQueryRunner();

			try {
				await queryRunner.connect();
				await queryRunner.startTransaction();
			} catch (error) {
				await ApiFunctionTransactionRuntime.releaseBestEffort(queryRunner);

				throw error;
			}

			await ApiFunctionContextStorage.runTransaction(queryRunner.manager, queryRunner, registry, async (): Promise<void> => {
				try {
					result.value = await options.callback(queryRunner.manager);
				} catch (error) {
					hasOperationError = true;
					operationError = error;
					rollbackFailure = await ApiFunctionTransactionRuntime.rollbackBestEffort(queryRunner);
					await ApiFunctionTransactionRuntime.releaseBestEffort(queryRunner);

					return;
				}

				try {
					await queryRunner.commitTransaction();
				} catch (error) {
					commitError = error;
					hasCommitError = true;
					commitCleanupFailure = await ApiFunctionTransactionRuntime.rollbackBestEffort(queryRunner);
				}

				await ApiFunctionTransactionRuntime.releaseBestEffort(queryRunner);
			});
		});

		for (const work of registry.takeWorkAfterSettlement()) {
			try {
				await work();
			} catch (error) {
				if (hasOperationError) {
					operationError = error;
				} else {
					transactionLogger.error(`Work after a settled transaction failed: ${FormatErrorEvidenceForLog(error)}`);
				}
			}
		}

		let outcome: EApiFunctionTransactionOutcome = EApiFunctionTransactionOutcome.COMMITTED;

		if (hasCommitError || rollbackFailure) outcome = EApiFunctionTransactionOutcome.UNKNOWN;
		else if (hasOperationError) outcome = EApiFunctionTransactionOutcome.ROLLED_BACK;

		try {
			if (hasOperationError) {
				return await ApiFunctionTransactionLifecycle.executeAfterRollback(registry, operationError, rollbackFailure);
			}

			if (hasCommitError) {
				return await ApiFunctionTransactionLifecycle.executeCommitUnknown(registry, commitError, commitCleanupFailure);
			}

			if (!("value" in result)) {
				throw ErrorException("Automator transaction completed without a committed result");
			}

			await ApiFunctionTransactionLifecycle.executeAfterCommit(registry);

			return result.value as R;
		} finally {
			registry.settleObservation(outcome);
		}
	}

	private static async releaseBestEffort(queryRunner: QueryRunner): Promise<void> {
		try {
			await queryRunner.release();
		} catch (error) {
			transactionLogger.error(`Failed to release transaction query runner: ${FormatErrorEvidenceForLog(error)}`);
		}
	}

	private static async rollbackBestEffort(queryRunner: QueryRunner): Promise<IApiFunctionTransactionFailure | undefined> {
		try {
			await queryRunner.rollbackTransaction();

			return undefined;
		} catch (error) {
			return Object.freeze({
				error,
				stage: EApiFunctionTransactionFailureStage.ROLLBACK,
			});
		}
	}

	private static async runInTurn(dataSource: DataSource, work: () => Promise<void>): Promise<void> {
		if (!DATABASE_DRIVER_TYPE_CONSTANT.SQLITE_FAMILY.has(dataSource.options.type)) {
			await work();

			return;
		}

		const turn: Promise<void> = (ApiFunctionTransactionRuntime.TURNS.get(dataSource) ?? Promise.resolve()).then(work);

		// A failed turn belongs to its own caller and must not stop the next one.
		ApiFunctionTransactionRuntime.TURNS.set(
			dataSource,
			turn.catch((): void => undefined),
		);

		await turn;
	}
}
