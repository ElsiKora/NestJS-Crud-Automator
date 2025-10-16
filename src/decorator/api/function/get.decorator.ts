import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunctionErrorExecutionContext } from "@interface/class/api/subscriber/function-error-execution-context.interface";
import type { IApiSubscriberFunctionExecutionContext } from "@interface/class/api/subscriber/function-execution-context.interface";
import type { IApiFunctionGetExecutorProperties, IApiFunctionProperties } from "@interface/decorator/api";
import type { TApiFunctionGetProperties } from "@type/decorator/api/function";
import type { EntityManager, FindOneOptions, Repository } from "typeorm";

import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { EApiFunctionType, EApiSubscriberOnType } from "@enum/decorator/api";
import { EErrorStringAction } from "@enum/utility";
import { HttpException, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { ErrorException } from "@utility/error-exception.utility";
import { ErrorString } from "@utility/error-string.utility";
import { LoggerUtility } from "@utility/logger.utility";

/**
 * Creates a decorator that adds single entity retrieval functionality to a service method
 * @template E The entity type
 * @param {IApiFunctionProperties<E>} properties - Configuration properties for the get function
 * @returns {(target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor} A decorator function that modifies the target method to handle single entity retrieval
 */
export function ApiFunctionGet<E extends IApiBaseEntity>(properties: IApiFunctionProperties<E>): (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor {
	const { entity }: IApiFunctionProperties<E> = properties;

	return function (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _target;
		// eslint-disable-next-line @elsikora/sonar/void-use
		void _propertyKey;

		descriptor.value = async function (this: { repository: Repository<E> }, getProperties: TApiFunctionGetProperties<E>, eventManager?: EntityManager): Promise<E> {
			const entityInstance: E = new entity();

			const executionContext: IApiSubscriberFunctionExecutionContext<E, TApiFunctionGetProperties<E>> = {
				DATA: { eventManager, getProperties, repository: this.repository },
				ENTITY: entityInstance,
				FUNCTION_TYPE: EApiFunctionType.GET,
				result: getProperties,
			};

			const result: FindOneOptions<E> | undefined = await ApiSubscriberExecutor.executeFunctionSubscribers(this.constructor as new (...arguments_: Array<unknown>) => unknown, entityInstance, EApiFunctionType.GET, EApiSubscriberOnType.BEFORE, executionContext);

			if (result) {
				executionContext.result = result;
			}

			const repository: Repository<E> = this.repository;

			if (!repository) {
				const errorExecutionContext: IApiSubscriberFunctionErrorExecutionContext<E, Record<string, unknown>> = {
					DATA: { eventManager, getProperties, repository: this.repository },
					ENTITY: entityInstance,
					FUNCTION_TYPE: EApiFunctionType.GET,
				};

				await ApiSubscriberExecutor.executeFunctionErrorSubscribers(this.constructor as new (...arguments_: Array<unknown>) => unknown, entityInstance, EApiFunctionType.GET, EApiSubscriberOnType.BEFORE_ERROR, errorExecutionContext, new Error("Repository is not available in this context"));

				throw ErrorException("Repository is not available in this context");
			}

			return executor<E>({ constructor: this.constructor as new (...arguments_: Array<unknown>) => unknown, entity, eventManager, properties: executionContext.result ?? ({} as unknown as TApiFunctionGetProperties<E>), repository });
		};

		return descriptor;
	};
}

/**
 * Executes the single entity retrieval operation with error handling
 * @template E The entity type
 * @param {IApiFunctionGetExecutorProperties<E>} options - Properties required for entity retrieval
 * @returns {Promise<E>} The retrieved entity instance
 * @throws {NotFoundException} If the entity is not found
 * @throws {InternalServerErrorException} If the retrieval operation fails
 */
async function executor<E extends IApiBaseEntity>(options: IApiFunctionGetExecutorProperties<E>): Promise<E> {
	const { constructor, entity, eventManager, properties, repository }: IApiFunctionGetExecutorProperties<E> = options;

	try {
		let item: E | null;

		if (eventManager) {
			const eventRepository: Repository<E> = eventManager.getRepository<E>(entity);
			item = await eventRepository.findOne(properties);
		} else {
			item = await repository.findOne(properties);
		}

		if (!item) {
			throw new NotFoundException(ErrorString({ entity, type: EErrorStringAction.NOT_FOUND }));
		}

		const executionContext: IApiSubscriberFunctionExecutionContext<E, E> = {
			DATA: { eventManager, properties, repository },
			ENTITY: item,
			FUNCTION_TYPE: EApiFunctionType.GET,
			result: item,
		};

		const afterResult: E | undefined = await ApiSubscriberExecutor.executeFunctionSubscribers(constructor, item, EApiFunctionType.GET, EApiSubscriberOnType.AFTER, executionContext);

		if (afterResult) {
			return afterResult;
		}

		return item;
	} catch (error) {
		const entityInstance: E = new entity();

		const errorExecutionContext: IApiSubscriberFunctionErrorExecutionContext<E, Record<string, unknown>> = {
			DATA: { eventManager, properties, repository },
			ENTITY: entityInstance,
			FUNCTION_TYPE: EApiFunctionType.GET,
		};

		if (error instanceof HttpException) {
			await ApiSubscriberExecutor.executeFunctionErrorSubscribers(constructor, entityInstance, EApiFunctionType.GET, EApiSubscriberOnType.AFTER_ERROR, errorExecutionContext, error);

			throw error;
		}

		LoggerUtility.getLogger("ApiFunctionGet").verbose(`Error fetching entity ${entity.name}:`, error);
		await ApiSubscriberExecutor.executeFunctionErrorSubscribers(constructor, entityInstance, EApiFunctionType.GET, EApiSubscriberOnType.AFTER_ERROR, errorExecutionContext, error as Error);

		throw new InternalServerErrorException(
			ErrorString({
				entity,
				type: EErrorStringAction.FETCHING_ERROR,
			}),
		);
	}
}
