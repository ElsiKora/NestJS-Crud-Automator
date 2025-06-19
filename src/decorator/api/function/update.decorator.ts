import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
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
 * @param {IApiFunctionProperties} properties - Configuration properties for the update function
 * @returns {(target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor} A decorator function that modifies the target method to handle entity updates
 */

/**
 *
 * @param properties
 */
export function ApiFunctionUpdate<E extends IApiBaseEntity>(properties: IApiFunctionProperties<E>): (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor {
	const { entity }: IApiFunctionProperties<E> = properties;
	const getDecorator: (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor = ApiFunctionGet<E>({ entity });
	let getFunction: (properties: TApiFunctionGetProperties<E>, eventManager?: EntityManager) => Promise<E>;

	return function (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
		descriptor.value = async function (this: { repository: Repository<E> }, criteria: TApiFunctionUpdateCriteria<E>, updateProperties: TApiFunctionUpdateProperties<E>, eventManager?: EntityManager): Promise<E> {
			const entityInstance = new entity();

			const executionContext: IApiSubscriberFunctionExecutionContext<E, TApiFunctionUpdateProperties<E>, any> = {
				data: { criteria, eventManager, repository: this.repository },
				entity: entityInstance,
				functionType: EApiFunctionType.UPDATE,
				result: updateProperties,
			};

			const result = await ApiSubscriberExecutor.executeFunctionSubscribers(this.constructor as new () => any, entityInstance, EApiFunctionType.UPDATE, EApiSubscriberOnType.BEFORE as any, executionContext);

			if (result) {
				executionContext.result = result;
			}

			const repository: Repository<E> = this.repository;

			if (!repository) {
				await ApiSubscriberExecutor.executeFunctionSubscribers(this.constructor as new () => any, entityInstance, EApiFunctionType.UPDATE, EApiSubscriberOnType.BEFORE_ERROR as any, executionContext, new Error("Repository is not available in this context"));

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

			return executor<E>({ constructor: this.constructor as new () => any, criteria, entity, eventManager, getFunction, properties: executionContext.result!, repository });
		};

		return descriptor;
	};
}

/**
 * Executes the entity update operation with error handling
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

		const executionContext: IApiSubscriberFunctionExecutionContext<E, E, any> = {
			data: { criteria, eventManager, repository },
			entity: result,
			functionType: EApiFunctionType.UPDATE,
			result: result,
		};

		const afterResult = await ApiSubscriberExecutor.executeFunctionSubscribers(constructor, result, EApiFunctionType.UPDATE, EApiSubscriberOnType.AFTER as any, executionContext);

		if (afterResult) {
			return afterResult;
		}

		return result;
	} catch (error) {
		const entityInstance = new entity();
		const executionContext: IApiSubscriberFunctionExecutionContext<E, never, any> = {
			data: { criteria, eventManager, properties, repository },
			entity: entityInstance,
			functionType: EApiFunctionType.UPDATE,
		};

		if (error instanceof HttpException) {
			await ApiSubscriberExecutor.executeFunctionSubscribers(constructor, entityInstance, EApiFunctionType.UPDATE, EApiSubscriberOnType.AFTER_ERROR as any, executionContext, error);
			throw error;
		}

		LoggerUtility.getLogger("ApiFunctionUpdate").verbose(`Error updating entity ${String(entity.name)}:`, error);
		await ApiSubscriberExecutor.executeFunctionSubscribers(constructor, entityInstance, EApiFunctionType.UPDATE, EApiSubscriberOnType.AFTER_ERROR as any, executionContext, error as Error);

		throw new InternalServerErrorException(
			ErrorString({
				entity: entity,
				type: EErrorStringAction.UPDATING_ERROR,
			}),
		);
	}
}
