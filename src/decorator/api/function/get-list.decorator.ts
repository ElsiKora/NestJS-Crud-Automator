import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunctionErrorExecutionContext } from "@interface/class/api/subscriber/function-error-execution-context.interface";
import type { IApiSubscriberFunctionExecutionContext } from "@interface/class/api/subscriber/function-execution-context.interface";
import type { IApiFunctionGetListExecutorProperties, IApiFunctionProperties, IApiGetListResponseResult } from "@interface/decorator/api";
import type { TApiFunctionGetListProperties } from "@type/decorator/api/function";
import type { EntityManager, Repository } from "typeorm";
import type { FindManyOptions } from "typeorm/index";

import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { EApiFunctionType, EApiSubscriberOnType } from "@enum/decorator/api";
import { EErrorStringAction } from "@enum/utility";
import { HttpException, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { DatabaseTypeOrmIsEntityMetadataNotFound } from "@utility/database/typeorm/is/entity/metadata-not-found.utility";
import { DatabaseTypeOrmIsEntityNotFound } from "@utility/database/typeorm/is/entity/not-found.utility";
import { ErrorException } from "@utility/error-exception.utility";
import { ErrorString } from "@utility/error-string.utility";
import { LoggerUtility } from "@utility/logger.utility";

/**
 * Creates a decorator that adds entity list retrieval functionality to a service method
 * @template E The entity type
 * @param {IApiFunctionProperties<E>} properties - Configuration properties for the get-list function
 * @returns {(target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor} A decorator function that modifies the target method to handle entity list retrieval
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/api-reference/decorators/api-function/api-function-get-list | API Reference - ApiFunctionGetList}
 */
export function ApiFunctionGetList<E extends IApiBaseEntity>(properties: IApiFunctionProperties<E>): (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor {
	const { entity }: IApiFunctionProperties<E> = properties;

	return function (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
		descriptor.value = async function (this: { repository: Repository<E> }, getListProperties: TApiFunctionGetListProperties<E>, eventManager?: EntityManager): Promise<IApiGetListResponseResult<E>> {
			const entityInstance: E = new entity();

			const executionContext: IApiSubscriberFunctionExecutionContext<E, TApiFunctionGetListProperties<E>> = {
				DATA: { eventManager, getListProperties, repository: this.repository },
				ENTITY: entityInstance,
				FUNCTION_TYPE: EApiFunctionType.GET_LIST,
				result: getListProperties,
			};

			const result: FindManyOptions<E> | undefined = await ApiSubscriberExecutor.executeFunctionSubscribers(this.constructor as new (...arguments_: Array<unknown>) => unknown, entityInstance, EApiFunctionType.GET_LIST, EApiSubscriberOnType.BEFORE, executionContext);

			if (result) {
				executionContext.result = result;
			}

			const repository: Repository<E> = this.repository;

			if (!repository) {
				const errorExecutionContext: IApiSubscriberFunctionErrorExecutionContext<E, Record<string, unknown>> = {
					DATA: { eventManager, getListProperties, repository: this.repository },
					ENTITY: entityInstance,
					FUNCTION_TYPE: EApiFunctionType.GET_LIST,
				};

				await ApiSubscriberExecutor.executeFunctionErrorSubscribers(this.constructor as new (...arguments_: Array<unknown>) => unknown, entityInstance, EApiFunctionType.GET_LIST, EApiSubscriberOnType.BEFORE_ERROR, errorExecutionContext, new Error("Repository is not available in this context"));

				throw ErrorException("Repository is not available in this context");
			}

			return executor<E>({ constructor: this.constructor as new (...arguments_: Array<unknown>) => unknown, entity, eventManager, properties: executionContext.result ?? ({} as unknown as TApiFunctionGetListProperties<E>), repository });
		};

		return descriptor;
	};
}

/**
 * Calculates the current page number based on the provided properties.
 * @template E The entity type
 * @param {TApiFunctionGetListProperties<E>} properties - The properties for the get-list function.
 * @param {number} itemsLength - The number of items on the current page.
 * @returns {number} The current page number.
 */
function calculateCurrentPage<E extends IApiBaseEntity>(properties: TApiFunctionGetListProperties<E>, itemsLength: number): number {
	if (itemsLength === 0) {
		return 0;
	}

	if (properties.skip) {
		return Math.ceil(properties.skip / (properties.take ?? 1)) + 1;
	}

	return 1;
}

/**
 * Executes the entity list retrieval operation with error handling
 * @template E The entity type
 * @param {IApiFunctionGetListExecutorProperties<E>} options - Properties required for entity list retrieval
 * @returns {Promise<IApiGetListResponseResult<E>>} The paginated list of entities with count information
 * @throws {InternalServerErrorException} If the list retrieval operation fails
 */
async function executor<E extends IApiBaseEntity>(options: IApiFunctionGetListExecutorProperties<E>): Promise<IApiGetListResponseResult<E>> {
	const { constructor, entity, eventManager, properties, repository }: IApiFunctionGetListExecutorProperties<E> = options;

	try {
		let items: Array<E>;
		let totalCount: number;

		if (eventManager) {
			const eventRepository: Repository<E> = eventManager.getRepository<E>(entity);
			[items, totalCount] = await eventRepository.findAndCount(properties);
		} else {
			[items, totalCount] = await repository.findAndCount(properties);
		}

		const result: IApiGetListResponseResult<E> = {
			count: items.length,
			currentPage: calculateCurrentPage<E>(properties, items.length),
			items,
			totalCount,
			totalPages: Math.ceil(totalCount / (properties.take ?? 1)),
		};

		const executionContext: IApiSubscriberFunctionExecutionContext<E, IApiGetListResponseResult<E>> = {
			DATA: { eventManager, properties, repository },
			ENTITY: new entity(),
			FUNCTION_TYPE: EApiFunctionType.GET_LIST,
			result: result,
		};

		const afterResult: IApiGetListResponseResult<E> | undefined = await ApiSubscriberExecutor.executeFunctionSubscribers(constructor, new entity(), EApiFunctionType.GET_LIST, EApiSubscriberOnType.AFTER, executionContext);

		if (afterResult) {
			return afterResult;
		}

		return result;
	} catch (caughtError) {
		const entityInstance: E = new entity();

		const errorExecutionContext: IApiSubscriberFunctionErrorExecutionContext<E, Record<string, unknown>> = {
			DATA: { eventManager, properties, repository },
			ENTITY: entityInstance,
			FUNCTION_TYPE: EApiFunctionType.GET_LIST,
		};

		let error: unknown = caughtError;

		if (DatabaseTypeOrmIsEntityNotFound(caughtError)) {
			error = new NotFoundException(ErrorString({ entity, type: EErrorStringAction.NOT_FOUND }), { cause: caughtError });
		}

		if (DatabaseTypeOrmIsEntityMetadataNotFound(caughtError)) {
			error = new InternalServerErrorException(ErrorString({ entity, type: EErrorStringAction.DATABASE_ERROR }), { cause: caughtError });
		}

		if (error instanceof HttpException) {
			await ApiSubscriberExecutor.executeFunctionErrorSubscribers(constructor, entityInstance, EApiFunctionType.GET_LIST, EApiSubscriberOnType.AFTER_ERROR, errorExecutionContext, error);

			throw error;
		}

		LoggerUtility.getLogger("ApiFunctionGetList").verbose(`Error fetching list for entity ${entity.name}:`, error);
		await ApiSubscriberExecutor.executeFunctionErrorSubscribers(constructor, entityInstance, EApiFunctionType.GET_LIST, EApiSubscriberOnType.AFTER_ERROR, errorExecutionContext, error as Error);

		throw new InternalServerErrorException(
			ErrorString({
				entity: entity,
				type: EErrorStringAction.FETCHING_LIST_ERROR,
			}),
			{ cause: caughtError },
		);
	}
}
