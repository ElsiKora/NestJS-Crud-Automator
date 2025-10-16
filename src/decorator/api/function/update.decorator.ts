import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunctionErrorExecutionContext } from "@interface/class/api/subscriber/function-error-execution-context.interface";
import type { IApiSubscriberFunctionExecutionContext } from "@interface/class/api/subscriber/function-execution-context.interface";
import type { IApiFunctionProperties, IApiFunctionUpdateExecutorProperties } from "@interface/decorator/api/function";
import type { TApiFunctionGetProperties, TApiFunctionUpdateCriteria, TApiFunctionUpdateProperties } from "@type/decorator/api/function";
import type { DeepPartial, EntityManager, Repository } from "typeorm";

import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { EApiFunctionType, EApiSubscriberOnType } from "@enum/decorator/api";
import { EErrorStringAction } from "@enum/utility";
import { HttpException, InternalServerErrorException } from "@nestjs/common";
import { ErrorException } from "@utility/error-exception.utility";
import { ErrorString } from "@utility/error-string.utility";
import { LoggerUtility } from "@utility/logger.utility";

import { ApiFunctionGet } from "./get.decorator";

/**
 * Creates a decorator that adds entity update functionality to a service method
 * @template E The entity type
 * @param {IApiFunctionProperties<E>} properties - Configuration properties for the update function
 * @returns {(target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor} A decorator function that modifies the target method to handle entity updates
 */
export function ApiFunctionUpdate<E extends IApiBaseEntity>(properties: IApiFunctionProperties<E>): (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor {
	const { entity }: IApiFunctionProperties<E> = properties;
	const getDecorator: (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor = ApiFunctionGet<E>({ entity });
	let getFunction: (properties: TApiFunctionGetProperties<E>, eventManager?: EntityManager) => Promise<E>;

	return function (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
		descriptor.value = async function (this: { repository: Repository<E> }, criteria: TApiFunctionUpdateCriteria<E>, updateProperties: TApiFunctionUpdateProperties<E>, eventManager?: EntityManager): Promise<E> {
			const entityInstance: E = new entity();

			const executionContext: IApiSubscriberFunctionExecutionContext<E, TApiFunctionUpdateProperties<E>> = {
				DATA: { criteria, eventManager, repository: this.repository },
				ENTITY: entityInstance,
				FUNCTION_TYPE: EApiFunctionType.UPDATE,
				result: updateProperties,
			};

			const result: TApiFunctionUpdateProperties<E> | undefined = await ApiSubscriberExecutor.executeFunctionSubscribers(this.constructor as new () => unknown, entityInstance, EApiFunctionType.UPDATE, EApiSubscriberOnType.BEFORE, executionContext);

			if (result) {
				executionContext.result = result;
			}

			const repository: Repository<E> = this.repository;

			if (!repository) {
				const errorContext: IApiSubscriberFunctionErrorExecutionContext<E, Record<string, unknown>> = {
					DATA: { criteria, eventManager, repository: this.repository },
					ENTITY: entityInstance,
					FUNCTION_TYPE: EApiFunctionType.UPDATE,
				};

				await ApiSubscriberExecutor.executeFunctionErrorSubscribers(this.constructor as new () => unknown, entityInstance, EApiFunctionType.UPDATE, EApiSubscriberOnType.BEFORE_ERROR, errorContext, new Error("Repository is not available in this context"));

				throw ErrorException("Repository is not available in this context");
			}

			if (!getFunction) {
				const getDescriptor: TypedPropertyDescriptor<(properties: TApiFunctionGetProperties<E>, eventManager?: EntityManager) => Promise<E>> = {
					value: function () {
						return Promise.reject(ErrorException("Not implemented"));
					},
				};
				getDecorator(this, "get", getDescriptor);

				if (getDescriptor.value) {
					getFunction = getDescriptor.value.bind(this);
				} else {
					throw ErrorException("Get function is not properly decorated");
				}
			}

			return executor<E>({ constructor: this.constructor as new () => unknown, criteria, entity, eventManager, getFunction, properties: executionContext.result ?? ({} as unknown as TApiFunctionUpdateProperties<E>), repository });
		};

		return descriptor;
	};
}

/**
 * Executes the entity update operation with error handling
 * @template E The entity type
 * @param {IApiFunctionUpdateExecutorProperties<E>} options - Properties required for entity update
 * @returns {Promise<E>} The updated entity instance
 * @throws {InternalServerErrorException} If the update operation fails
 */
async function executor<E extends IApiBaseEntity>(options: IApiFunctionUpdateExecutorProperties<E>): Promise<E> {
	const { constructor, criteria, entity, eventManager, getFunction, properties, repository }: IApiFunctionUpdateExecutorProperties<E> = options;

	try {
		const existingEntity: E = await getFunction({ where: criteria }, eventManager);
		const updatedProperties: Partial<E> = {};
		const typedEntries: Array<[keyof E, E[keyof E]]> = Object.entries(properties) as Array<[keyof E, E[keyof E]]>;

		for (const [key, value] of typedEntries) {
			if (key in existingEntity) {
				updatedProperties[key] = value;
			}
		}

		const mergedEntity: DeepPartial<E> = { ...existingEntity, ...updatedProperties };

		let result: E;

		if (eventManager) {
			const eventRepository: Repository<E> = eventManager.getRepository<E>(entity);
			result = await eventRepository.save(mergedEntity);
		} else {
			result = await repository.save(mergedEntity);
		}

		const executionContext: IApiSubscriberFunctionExecutionContext<E, E> = {
			DATA: { criteria, eventManager, repository },
			ENTITY: result,
			FUNCTION_TYPE: EApiFunctionType.UPDATE,
			result: result,
		};

		const afterResult: E | undefined = await ApiSubscriberExecutor.executeFunctionSubscribers(constructor, result, EApiFunctionType.UPDATE, EApiSubscriberOnType.AFTER, executionContext);

		if (afterResult) {
			return afterResult;
		}

		return result;
	} catch (error) {
		const entityInstance: E = new entity();

		const errorContext: IApiSubscriberFunctionErrorExecutionContext<E, Record<string, unknown>> = {
			DATA: { criteria, eventManager, properties, repository },
			ENTITY: entityInstance,
			FUNCTION_TYPE: EApiFunctionType.UPDATE,
		};

		if (error instanceof HttpException) {
			await ApiSubscriberExecutor.executeFunctionErrorSubscribers(constructor, entityInstance, EApiFunctionType.UPDATE, EApiSubscriberOnType.AFTER_ERROR, errorContext, error);

			throw error;
		}

		LoggerUtility.getLogger("ApiFunctionUpdate").verbose(`Error updating entity ${entity.name}:`, error);
		await ApiSubscriberExecutor.executeFunctionErrorSubscribers(constructor, entityInstance, EApiFunctionType.UPDATE, EApiSubscriberOnType.AFTER_ERROR, errorContext, error as Error);

		throw new InternalServerErrorException(
			ErrorString({
				entity: entity,
				type: EErrorStringAction.UPDATING_ERROR,
			}),
		);
	}
}
