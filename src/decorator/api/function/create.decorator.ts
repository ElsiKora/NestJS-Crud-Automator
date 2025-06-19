import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunctionExecutionContext } from "@interface/class/api/subscriber/function-execution-context.interface";
import type { IApiFunctionCreateExecutorProperties, IApiFunctionProperties } from "@interface/decorator/api";
import type { TApiFunctionCreateProperties } from "@type/decorator/api/function";
import type { EntityManager, Repository } from "typeorm";

import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { EApiFunctionType } from "@enum/decorator/api/function/type.enum";
import { EApiSubscriberOnType } from "@enum/decorator/api/on-type.enum";
import { EErrorStringAction } from "@enum/utility";
import { HttpException, InternalServerErrorException } from "@nestjs/common";
import { ErrorException } from "@utility/error-exception.utility";
import { ErrorString } from "@utility/error-string.utility";
import { LoggerUtility } from "@utility/logger.utility";

/**
 * Creates a decorator that adds entity creation functionality to a service method
 * @param {IApiFunctionProperties<E>} properties - Configuration properties for the create function
 * @returns {(target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor} A decorator function that modifies the target method to handle entity creation
 */
export function ApiFunctionCreate<E extends IApiBaseEntity>(properties: IApiFunctionProperties<E>): (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor {
	const { entity }: IApiFunctionProperties<E> = properties;

	return function (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
		descriptor.value = async function (this: { repository: Repository<E> }, createProperties: TApiFunctionCreateProperties<E>, eventManager?: EntityManager): Promise<IApiBaseEntity> {
			const entityInstance = new entity();

			const executionContext: IApiSubscriberFunctionExecutionContext<E, TApiFunctionCreateProperties<E>, Record<string, any>> = {
				data: { eventManager, repository: this.repository },
				entity: entityInstance,
				functionType: EApiFunctionType.CREATE,
				result: createProperties,
			};

			const result = await ApiSubscriberExecutor.executeFunctionSubscribers(this.constructor as new (...arguments_: Array<any>) => any, entityInstance, EApiFunctionType.CREATE, EApiSubscriberOnType.BEFORE, executionContext);

			if (result) {
				executionContext.result = result;
			}

			const repository: Repository<E> = this.repository;

			if (!repository) {
				await ApiSubscriberExecutor.executeFunctionSubscribers(this.constructor as new (...arguments_: Array<any>) => any, entityInstance, EApiFunctionType.CREATE, EApiSubscriberOnType.BEFORE_ERROR, executionContext, new Error("Repository is not available in this context"));

				throw ErrorException("Repository is not available in this context");
			}

			return executor<E>({ constructor: this.constructor as new (...arguments_: Array<any>) => any, entity, eventManager, properties: executionContext.result!, repository });
		};

		return descriptor;
	};
}

/**
 * Executes the entity creation operation with error handling
 * @param {IApiFunctionCreateExecutorProperties<E>} options - Properties required for entity creation
 * @returns {Promise<E>} The created entity instance
 * @throws {InternalServerErrorException} If the creation operation fails
 */
async function executor<E extends IApiBaseEntity>(options: IApiFunctionCreateExecutorProperties<E>): Promise<E> {
	const { constructor, entity, eventManager, properties, repository }: IApiFunctionCreateExecutorProperties<E> = options;

	try {
		let result: E;

		if (eventManager) {
			const eventRepository: Repository<E> = eventManager.getRepository<E>(entity);
			result = await eventRepository.save(properties);
		} else {
			result = await repository.save(properties);
		}

		const entityInstance = new entity();

		const executionContext: IApiSubscriberFunctionExecutionContext<E, E, Record<string, any>> = {
			data: { eventManager, repository },
			entity: entityInstance,
			functionType: EApiFunctionType.CREATE,
			result: result,
		};

		const afterResult = await ApiSubscriberExecutor.executeFunctionSubscribers<E, E, Record<string, any>>(constructor, entityInstance, EApiFunctionType.CREATE, EApiSubscriberOnType.AFTER, executionContext);

		if (afterResult) {
			return afterResult;
		}

		return result;
	} catch (error) {
		const entityInstance = new entity();

		const executionContext: IApiSubscriberFunctionExecutionContext<E, never, Record<string, any>> = {
			data: { eventManager, properties, repository },
			entity: entityInstance,
			functionType: EApiFunctionType.CREATE,
		};

		if (error instanceof HttpException) {
			await ApiSubscriberExecutor.executeFunctionSubscribers(constructor, entityInstance, EApiFunctionType.CREATE, EApiSubscriberOnType.AFTER_ERROR, executionContext, error);
			throw error;
		}

		LoggerUtility.getLogger("ApiFunctionCreate").verbose(`Error creating entity ${String(entity.name)}:`, error);
		await ApiSubscriberExecutor.executeFunctionSubscribers(constructor, entityInstance, EApiFunctionType.CREATE, EApiSubscriberOnType.AFTER_ERROR, executionContext, error as Error);

		throw new InternalServerErrorException(
			ErrorString({
				entity: entity,
				type: EErrorStringAction.CREATING_ERROR,
			}),
		);
	}
}
