import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunctionExecutionContext } from "@interface/class/api/subscriber/function-execution-context.interface";
import type { IApiFunctionGetManyExecutorProperties, IApiFunctionProperties } from "@interface/decorator/api";
import type { TApiFunctionGetManyProperties } from "@type/decorator/api/function";
import type { EntityManager, Repository } from "typeorm";

import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { EApiFunctionType, EApiSubscriberOnType } from "@enum/decorator/api";
import { EErrorStringAction } from "@enum/utility";
import { HttpException, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { ErrorException } from "@utility/error-exception.utility";
import { ErrorString } from "@utility/error-string.utility";
import { LoggerUtility } from "@utility/logger.utility";

/**
 * Creates a decorator that adds functionality to retrieve multiple entities to a service method
 * @param {IApiFunctionProperties} properties - Configuration properties for the get-many function
 * @returns {(target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor} A decorator function that modifies the target method to handle retrieving multiple entities
 */

/**
 *
 * @param properties
 */
export function ApiFunctionGetMany<E extends IApiBaseEntity>(properties: IApiFunctionProperties<E>): (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor {
	const { entity }: IApiFunctionProperties<E> = properties;

	return function (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _target;
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _propertyKey;

		descriptor.value = async function (this: { repository: Repository<E> }, getManyProperties: TApiFunctionGetManyProperties<E>, eventManager?: EntityManager): Promise<Array<E>> {
			const entityInstance = new entity();

			const executionContext: IApiSubscriberFunctionExecutionContext<E, TApiFunctionGetManyProperties<E>, any> = {
				data: { eventManager, getManyProperties, repository: this.repository },
				entity: entityInstance,
				functionType: EApiFunctionType.GET_MANY,
				result: getManyProperties,
			};

			const result = await ApiSubscriberExecutor.executeFunctionSubscribers(this.constructor as new () => any, entityInstance, EApiFunctionType.GET_MANY, EApiSubscriberOnType.BEFORE as any, executionContext);

			if (result) {
				executionContext.result = result;
			}

			const repository: Repository<E> = this.repository;

			if (!repository) {
				await ApiSubscriberExecutor.executeFunctionSubscribers(this.constructor as new () => any, entityInstance, EApiFunctionType.GET_MANY, EApiSubscriberOnType.BEFORE_ERROR as any, executionContext, new Error("Repository is not available in this context"));

				throw ErrorException("Repository is not available in this context");
			}

			return executor<E>({ constructor: this.constructor as new () => any, entity, eventManager, properties: executionContext.result!, repository });
		};

		return descriptor;
	};
}

/**
 * Executes the retrieval of multiple entities with error handling
 * @param {IApiFunctionGetManyExecutorProperties<E>} options - Properties required for retrieving multiple entities
 * @returns {Promise<Array<E>>} An array of retrieved entity instances
 * @throws {NotFoundException} If no entities are found
 * @throws {InternalServerErrorException} If the retrieval operation fails
 */
async function executor<E extends IApiBaseEntity>(options: IApiFunctionGetManyExecutorProperties<E>): Promise<Array<E>> {
	const { constructor, entity, eventManager, properties, repository }: IApiFunctionGetManyExecutorProperties<E> = options;

	try {
		let items: Array<E>;

		if (eventManager) {
			const eventRepository: Repository<E> = eventManager.getRepository<E>(entity);
			items = await eventRepository.find(properties);
		} else {
			items = await repository.find(properties);
		}

		if (items.length === 0) {
			throw new NotFoundException(ErrorString({ entity, type: EErrorStringAction.NOT_FOUND }));
		}

		const executionContext: IApiSubscriberFunctionExecutionContext<E, Array<E>, any> = {
			data: { eventManager, properties, repository },
			entity: new entity(),
			functionType: EApiFunctionType.GET_MANY,
			result: items,
		};

		const afterResult = await ApiSubscriberExecutor.executeFunctionSubscribers(constructor, new entity(), EApiFunctionType.GET_MANY, EApiSubscriberOnType.AFTER as any, executionContext);

		if (afterResult) {
			return afterResult;
		}

		return items;
	} catch (error) {
		const entityInstance = new entity();
		const executionContext: IApiSubscriberFunctionExecutionContext<E, never, any> = {
			data: { properties, eventManager, repository },
			entity: entityInstance,
			functionType: EApiFunctionType.GET_MANY,
		};

		if (error instanceof HttpException) {
			await ApiSubscriberExecutor.executeFunctionSubscribers(constructor, entityInstance, EApiFunctionType.GET_MANY, EApiSubscriberOnType.AFTER_ERROR as any, executionContext, error);
			throw error;
		}

		LoggerUtility.getLogger("ApiFunctionGetMany").verbose(`Error fetching multiple entity ${String(entity.name)}:`, error);
		await ApiSubscriberExecutor.executeFunctionSubscribers(constructor, entityInstance, EApiFunctionType.GET_MANY, EApiSubscriberOnType.AFTER_ERROR as any, executionContext, error as Error);

		throw new InternalServerErrorException(
			ErrorString({
				entity,
				type: EErrorStringAction.FETCHING_ERROR,
			}),
		);
	}
}
