import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunctionErrorExecutionContext } from "@interface/class/api/subscriber/function-error-execution-context.interface";
import type { IApiSubscriberFunctionExecutionContext } from "@interface/class/api/subscriber/function-execution-context.interface";
import type { IApiFunctionGetManyExecutorProperties, IApiFunctionProperties } from "@interface/decorator/api";
import type { TApiFunctionGetManyProperties } from "@type/decorator/api/function";
import type { EntityManager, Repository } from "typeorm";
import type { FindManyOptions } from "typeorm/index";

import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { EApiFunctionType, EApiSubscriberOnType } from "@enum/decorator/api";
import { EErrorStringAction } from "@enum/utility";
import { HttpException, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { ErrorException } from "@utility/error-exception.utility";
import { ErrorString } from "@utility/error-string.utility";
import { LoggerUtility } from "@utility/logger.utility";

/**
 * Creates a decorator that adds functionality to retrieve multiple entities to a service method
 * @template E The entity type
 * @param {IApiFunctionProperties<E>} properties - Configuration properties for the get-many function
 * @returns {(target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor} A decorator function that modifies the target method to handle retrieving multiple entities
 */
export function ApiFunctionGetMany<E extends IApiBaseEntity>(properties: IApiFunctionProperties<E>): (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor {
	const { entity }: IApiFunctionProperties<E> = properties;

	return function (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _target;
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _propertyKey;

		descriptor.value = async function (this: { repository: Repository<E> }, getManyProperties: TApiFunctionGetManyProperties<E>, eventManager?: EntityManager): Promise<Array<E>> {
			const entityInstance: E = new entity();

			const executionContext: IApiSubscriberFunctionExecutionContext<E, TApiFunctionGetManyProperties<E>> = {
				DATA: { eventManager, getManyProperties, repository: this.repository },
				ENTITY: entityInstance,
				FUNCTION_TYPE: EApiFunctionType.GET_MANY,
				result: getManyProperties,
			};

			const result: FindManyOptions<E> | undefined = await ApiSubscriberExecutor.executeFunctionSubscribers(this.constructor as new () => unknown, entityInstance, EApiFunctionType.GET_MANY, EApiSubscriberOnType.BEFORE, executionContext);

			if (result) {
				executionContext.result = result;
			}

			const repository: Repository<E> = this.repository;

			if (!repository) {
				const errorContext: IApiSubscriberFunctionErrorExecutionContext<E, Record<string, unknown>> = {
					DATA: { eventManager, getManyProperties, repository: this.repository },
					ENTITY: entityInstance,
					FUNCTION_TYPE: EApiFunctionType.GET_MANY,
				};

				await ApiSubscriberExecutor.executeFunctionErrorSubscribers(this.constructor as new () => unknown, entityInstance, EApiFunctionType.GET_MANY, EApiSubscriberOnType.BEFORE_ERROR, errorContext, new Error("Repository is not available in this context"));

				throw ErrorException("Repository is not available in this context");
			}

			return executor<E>({ constructor: this.constructor as new () => unknown, entity, eventManager, properties: executionContext.result ?? ({} as unknown as TApiFunctionGetManyProperties<E>), repository });
		};

		return descriptor;
	};
}

/**
 * Executes the retrieval of multiple entities with error handling
 * @template E The entity type
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

		const executionContext: IApiSubscriberFunctionExecutionContext<E, Array<E>> = {
			DATA: { eventManager, properties, repository },
			ENTITY: new entity(),
			FUNCTION_TYPE: EApiFunctionType.GET_MANY,
			result: items,
		};

		const afterResult: Array<E> | undefined = await ApiSubscriberExecutor.executeFunctionSubscribers(constructor, new entity(), EApiFunctionType.GET_MANY, EApiSubscriberOnType.AFTER, executionContext);

		if (afterResult) {
			return afterResult;
		}

		return items;
	} catch (error) {
		const entityInstance: E = new entity();

		const errorContext: IApiSubscriberFunctionErrorExecutionContext<E, Record<string, unknown>> = {
			DATA: { eventManager, properties, repository },
			ENTITY: entityInstance,
			FUNCTION_TYPE: EApiFunctionType.GET_MANY,
		};

		if (error instanceof HttpException) {
			await ApiSubscriberExecutor.executeFunctionErrorSubscribers(constructor, entityInstance, EApiFunctionType.GET_MANY, EApiSubscriberOnType.AFTER_ERROR, errorContext, error);

			throw error;
		}

		LoggerUtility.getLogger("ApiFunctionGetMany").verbose(`Error fetching multiple entity ${entity.name}:`, error);
		await ApiSubscriberExecutor.executeFunctionErrorSubscribers(constructor, entityInstance, EApiFunctionType.GET_MANY, EApiSubscriberOnType.AFTER_ERROR, errorContext, error as Error);

		throw new InternalServerErrorException(
			ErrorString({
				entity,
				type: EErrorStringAction.FETCHING_ERROR,
			}),
		);
	}
}
