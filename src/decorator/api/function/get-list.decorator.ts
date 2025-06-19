import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunctionExecutionContext } from "@interface/class/api/subscriber/function-execution-context.interface";
import type { IApiFunctionGetListExecutorProperties, IApiFunctionProperties, IApiGetListResponseResult } from "@interface/decorator/api";
import type { TApiFunctionGetListProperties } from "@type/decorator/api/function";
import type { EntityManager, Repository } from "typeorm";

import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { EApiFunctionType, EApiSubscriberOnType } from "@enum/decorator/api";
import { EErrorStringAction } from "@enum/utility";
import { HttpException, InternalServerErrorException } from "@nestjs/common";
import { ErrorException } from "@utility/error-exception.utility";
import { ErrorString } from "@utility/error-string.utility";
import { LoggerUtility } from "@utility/logger.utility";

/**
 * Creates a decorator that adds entity list retrieval functionality to a service method
 * @param {IApiFunctionProperties} properties - Configuration properties for the get-list function
 * @returns {(target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor} A decorator function that modifies the target method to handle entity list retrieval
 */

/**
 *
 * @param properties
 */
export function ApiFunctionGetList<E extends IApiBaseEntity>(properties: IApiFunctionProperties<E>): (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor {
	const { entity }: IApiFunctionProperties<E> = properties;

	return function (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
		descriptor.value = async function (this: { repository: Repository<E> }, getListProperties: TApiFunctionGetListProperties<E>, eventManager?: EntityManager): Promise<IApiGetListResponseResult<E>> {
			const entityInstance = new entity();

			const executionContext: IApiSubscriberFunctionExecutionContext<E, TApiFunctionGetListProperties<E>, any> = {
				data: { eventManager, getListProperties, repository: this.repository },
				entity: entityInstance,
				functionType: EApiFunctionType.GET_LIST,
				result: getListProperties,
			};

			const result = await ApiSubscriberExecutor.executeFunctionSubscribers(this.constructor as new () => any, entityInstance, EApiFunctionType.GET_LIST, EApiSubscriberOnType.BEFORE as any, executionContext);

			if (result) {
				executionContext.result = result;
			}

			const repository: Repository<E> = this.repository;

			if (!repository) {
				await ApiSubscriberExecutor.executeFunctionSubscribers(this.constructor as new () => any, entityInstance, EApiFunctionType.GET_LIST, EApiSubscriberOnType.BEFORE_ERROR as any, executionContext, new Error("Repository is not available in this context"));

				throw ErrorException("Repository is not available in this context");
			}

			return executor<E>({ constructor: this.constructor as new () => any, entity, eventManager, properties: executionContext.result!, repository });
		};

		return descriptor;
	};
}

/**
 * Executes the entity list retrieval operation with error handling
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
			currentPage: items.length === 0 ? 0 : (properties.skip ? Math.ceil(properties.skip / (properties.take ?? 1)) + 1 : 1),
			items,
			totalCount,
			totalPages: Math.ceil(totalCount / (properties.take ?? 1)),
		};

		const executionContext: IApiSubscriberFunctionExecutionContext<E, IApiGetListResponseResult<E>, any> = {
			data: { eventManager, properties, repository },
			entity: new entity(),
			functionType: EApiFunctionType.GET_LIST,
			result: result,
		};

		const afterResult = await ApiSubscriberExecutor.executeFunctionSubscribers(constructor, new entity(), EApiFunctionType.GET_LIST, EApiSubscriberOnType.AFTER as any, executionContext);

		if (afterResult) {
			return afterResult;
		}

		return result;
	} catch (error) {
		const entityInstance = new entity();
		const executionContext: IApiSubscriberFunctionExecutionContext<E, never, any> = {
			data: { properties, eventManager, repository },
			entity: entityInstance,
			functionType: EApiFunctionType.GET_LIST,
		};

		if (error instanceof HttpException) {
			await ApiSubscriberExecutor.executeFunctionSubscribers(constructor, entityInstance, EApiFunctionType.GET_LIST, EApiSubscriberOnType.AFTER_ERROR as any, executionContext, error);
			throw error;
		}

		LoggerUtility.getLogger("ApiFunctionGetList").verbose(`Error fetching list for entity ${String(entity.name)}:`, error);
		await ApiSubscriberExecutor.executeFunctionSubscribers(constructor, entityInstance, EApiFunctionType.GET_LIST, EApiSubscriberOnType.AFTER_ERROR as any, executionContext, error as Error);

		throw new InternalServerErrorException(
			ErrorString({
				entity: entity,
				type: EErrorStringAction.FETCHING_LIST_ERROR,
			}),
		);
	}
}
