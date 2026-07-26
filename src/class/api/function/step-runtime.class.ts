import type { EApiFunctionTransactionMode } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiFunctionStepContext } from "@interface/class/api/function";
import type { IApiFunctionStepProperties } from "@interface/decorator/api/function/step-properties.interface";
import type { EntityManager, Repository } from "typeorm";

import { ApiFunctionContextStorage } from "@class/api/function/context-storage.class";
import { ApiFunctionServiceContextFactory } from "@class/api/function/service-context.factory.class";
import { EApiFunctionTransactionTraceType } from "@enum/decorator/api";
import { ApiFunctionExecuteWithTransaction } from "@utility/api/function-transaction.utility";

export class ApiFunctionStepRuntime {
	/**
	 * Executes an internal function step with Automator transaction semantics.
	 * @template E - Entity type associated with the decorated step.
	 * @param {object} options - Step execution options.
	 * @param {Array<unknown>} options.functionArguments - Original method arguments.
	 * @param {string} [options.methodName] - Decorated step method name used for transaction tracing.
	 * @param {(...arguments_: Array<unknown>) => Promise<unknown>} options.originalMethod - Original step method.
	 * @param {IApiFunctionStepProperties<E>} options.properties - Step configuration.
	 * @param {{ repository?: Repository<E> }} options.target - Service instance that owns the step.
	 * @param {EApiFunctionTransactionMode} options.transactionMode - Resolved transaction mode.
	 * @returns {Promise<unknown>} Original step result.
	 */
	public static async execute<E extends IApiBaseEntity>(options: { functionArguments: Array<unknown>; methodName?: string; originalMethod: (...arguments_: Array<unknown>) => Promise<unknown>; properties: IApiFunctionStepProperties<E>; target: { repository?: Repository<E> }; transactionMode: EApiFunctionTransactionMode }): Promise<unknown> {
		return await ApiFunctionExecuteWithTransaction({
			callback: async (eventManager: EntityManager | undefined): Promise<unknown> => {
				const context: IApiFunctionStepContext<E> = ApiFunctionServiceContextFactory.createStep({
					entity: options.properties.entity,
					eventManager,
					target: options.target,
				});

				return await ApiFunctionContextStorage.runStep(context, async (): Promise<unknown> => await options.originalMethod.apply(options.target, options.functionArguments));
			},
			entity: options.properties.entity,
			functionType: EApiFunctionTransactionTraceType.STEP,
			label: "ApiFunctionStep",
			methodName: options.methodName ?? (options.originalMethod.name || "anonymous"),
			mode: options.transactionMode,
			repository: options.target.repository,
		});
	}
}
