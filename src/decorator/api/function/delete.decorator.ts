import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunctionExecutionContext } from "@interface/class/api/subscriber/function-execution-context.interface";
import type { IApiFunctionDeleteExecutorProperties, IApiFunctionProperties } from "@interface/decorator/api";
import type { TApiFunctionDeleteCriteria, TApiFunctionGetProperties } from "@type/decorator/api/function";
import type { EntityManager, Repository } from "typeorm";

import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { EApiFunctionType, EApiSubscriberOnType } from "@enum/decorator/api";
import { EErrorStringAction } from "@enum/utility";
import { HttpException, InternalServerErrorException } from "@nestjs/common";
import { ErrorException } from "@utility/error-exception.utility";
import { ErrorString } from "@utility/error-string.utility";
import { LoggerUtility } from "@utility/logger.utility";

import { ApiFunctionGet } from "./get.decorator";

/**
 * Creates a decorator that adds entity deletion functionality to a service method
 * @param {IApiFunctionProperties} properties - Configuration properties for the delete function
 * @returns {(target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor} A decorator function that modifies the target method to handle entity deletion
 */

/**
 *
 * @param properties
 */
export function ApiFunctionDelete<E extends IApiBaseEntity>(properties: IApiFunctionProperties<E>): (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor {
	const { entity }: IApiFunctionProperties<E> = properties;
	const getDecorator: (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor = ApiFunctionGet<E>({ entity });
	let getFunction: (properties: TApiFunctionGetProperties<E>, eventManager?: EntityManager) => Promise<E>;

	return function (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
		descriptor.value = async function (this: { repository: Repository<E> }, criteria: TApiFunctionDeleteCriteria<E>, eventManager?: EntityManager): Promise<E> {
			const entityInstance = new entity();

			const executionContext: IApiSubscriberFunctionExecutionContext<E, TApiFunctionDeleteCriteria<E>, any> = {
				data: { criteria, eventManager, repository: this.repository },
				entity: entityInstance,
				functionType: EApiFunctionType.DELETE,
				result: criteria,
			};

			const result = await ApiSubscriberExecutor.executeFunctionSubscribers(this.constructor as new () => any, entityInstance, EApiFunctionType.DELETE, EApiSubscriberOnType.BEFORE as any, executionContext);

			if (result) {
				executionContext.result = result;
			}

			const repository: Repository<E> = this.repository;

			if (!repository) {
				await ApiSubscriberExecutor.executeFunctionSubscribers(this.constructor as new () => any, entityInstance, EApiFunctionType.DELETE, EApiSubscriberOnType.BEFORE_ERROR as any, executionContext, new Error("Repository is not available in this context"));

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

			return executor<E>({ constructor: this.constructor as new () => any, criteria: executionContext.result!, entity, eventManager, getFunction, repository });
		};

		return descriptor;
	};
}

/**
 * Executes the entity deletion operation with error handling
 * @param {IApiFunctionDeleteExecutorProperties<E>} options - Properties required for entity deletion
 * @returns {Promise<E>} The deleted entity instance
 * @throws {InternalServerErrorException} If the deletion operation fails
 */
async function executor<E extends IApiBaseEntity>(options: IApiFunctionDeleteExecutorProperties<E>): Promise<E> {
	const { constructor, criteria, entity, eventManager, getFunction, repository }: IApiFunctionDeleteExecutorProperties<E> = options;

	try {
		const existingEntity: E = await getFunction({ where: criteria });

		let result: E;

		if (eventManager) {
			const eventRepository: Repository<E> = eventManager.getRepository<E>(entity);
			result = await eventRepository.remove(existingEntity);
		} else {
			result = await repository.remove(existingEntity);
		}

		const executionContext: IApiSubscriberFunctionExecutionContext<E, E, any> = {
			data: { criteria, eventManager, repository },
			entity: existingEntity,
			functionType: EApiFunctionType.DELETE,
			result: result,
		};

		const afterResult = await ApiSubscriberExecutor.executeFunctionSubscribers(constructor, existingEntity, EApiFunctionType.DELETE, EApiSubscriberOnType.AFTER as any, executionContext);

		if (afterResult) {
			return afterResult;
		}

		return result;
	} catch (error) {
		const entityInstance = new entity();

		const executionContext: IApiSubscriberFunctionExecutionContext<E, never, any> = {
			data: { criteria, eventManager, repository },
			entity: entityInstance,
			functionType: EApiFunctionType.DELETE,
		};

		if (error instanceof HttpException) {
			await ApiSubscriberExecutor.executeFunctionSubscribers(constructor, entityInstance, EApiFunctionType.DELETE, EApiSubscriberOnType.AFTER_ERROR as any, executionContext, error);

			throw error;
		}

		LoggerUtility.getLogger("ApiFunctionDelete").verbose(`Error deleting entity ${String(entity.name)}:`, error);
		await ApiSubscriberExecutor.executeFunctionSubscribers(constructor, entityInstance, EApiFunctionType.DELETE, EApiSubscriberOnType.AFTER_ERROR as any, executionContext, error as Error);

		throw new InternalServerErrorException(
			ErrorString({
				entity: entity,
				type: EErrorStringAction.DELETING_ERROR,
			}),
		);
	}
}
