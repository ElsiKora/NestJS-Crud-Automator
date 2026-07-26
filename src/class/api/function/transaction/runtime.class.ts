import type { IApiFunctionTransactionFailure } from "@interface/class/api/function";
import type { TApiFunctionTransactionOwner } from "@type/class/api/function";
import type { DataSource, EntityManager, QueryRunner } from "typeorm";

import { randomUUID } from "node:crypto";

import { ApiFunctionContextStorage } from "@class/api/function/context-storage.class";
import { ApiFunctionTransactionLifecycle } from "@class/api/function/transaction/lifecycle.class";
import { ApiFunctionTransactionRegistry } from "@class/api/function/transaction/registry.class";
import { EApiFunctionTransactionFailureStage } from "@enum/decorator/api";
import { ErrorException } from "@utility/error/exception.utility";
import { LoggerUtility } from "@utility/logger.utility";

const transactionLogger: LoggerUtility = LoggerUtility.getLogger("ApiFunctionTransactionRuntime");

export class ApiFunctionTransactionRuntime {
	public static async execute<R>(options: { callback: (entityManager: EntityManager) => Promise<R>; dataSource: DataSource; owner: TApiFunctionTransactionOwner }): Promise<R> {
		if (ApiFunctionContextStorage.getTransactionRegistry()) {
			throw ErrorException("Cannot open an owning transaction inside an active Automator transaction");
		}

		const queryRunner: QueryRunner = options.dataSource.createQueryRunner();

		try {
			await queryRunner.connect();
			await queryRunner.startTransaction();
		} catch (error) {
			await ApiFunctionTransactionRuntime.releaseBestEffort(queryRunner);

			throw error;
		}

		const registry: ApiFunctionTransactionRegistry = new ApiFunctionTransactionRegistry(randomUUID(), options.owner);
		const result: { value?: R } = {};
		let commitCleanupFailure: IApiFunctionTransactionFailure | undefined;
		let commitError: unknown;
		let hasCommitError: boolean = false;
		let hasOperationError: boolean = false;
		let operationError: unknown;
		let rollbackFailure: IApiFunctionTransactionFailure | undefined;

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
	}

	private static async releaseBestEffort(queryRunner: QueryRunner): Promise<void> {
		try {
			await queryRunner.release();
		} catch (error) {
			transactionLogger.error("Failed to release transaction query runner", error);
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
}
