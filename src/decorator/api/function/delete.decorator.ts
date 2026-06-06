import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunctionErrorExecutionContext } from "@interface/class/api/subscriber/function/error-execution-context.interface";
import type { IApiSubscriberFunctionExecutionContextData } from "@interface/class/api/subscriber/function/execution/context-data.interface";
import type { IApiSubscriberFunctionExecutionContext } from "@interface/class/api/subscriber/function/execution/context.interface";
import type { IApiFunctionDeleteExecutorProperties, IApiFunctionProperties } from "@interface/decorator/api";
import type { TApiFunctionDeleteCriteria, TApiFunctionGetProperties } from "@type/decorator/api/function";
import type { EntityManager, Repository } from "typeorm";

import { ApiFunctionContextStorage } from "@class/api/function/context-storage.class";
import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { EApiFunctionTransactionMode, EApiFunctionType, EApiSubscriberOnType } from "@enum/decorator/api";
import { EErrorStringAction } from "@enum/utility";
import { EApiExceptionDetailsType } from "@enum/utility/exception-details-type.enum";
import { BadRequestException, HttpException, HttpStatus, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { ApiFunctionExecuteWithTransaction } from "@utility/api/function-transaction.utility";
import { DatabaseTypeOrmGetForeignKeyViolationDetails } from "@utility/database/typeorm/get/foreign-key-violation-details.utility";
import { DatabaseTypeOrmIsEntityMetadataNotFound } from "@utility/database/typeorm/is/entity/metadata-not-found.utility";
import { DatabaseTypeOrmIsEntityNotFound } from "@utility/database/typeorm/is/entity/not-found.utility";
import { DatabaseTypeOrmIsForeignKeyViolation } from "@utility/database/typeorm/is/foreign-key-violation.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { ErrorString } from "@utility/error/string.utility";
import { LoggerUtility } from "@utility/logger.utility";

import { ApiFunctionGet } from "./get/decorator";

/**
 * Creates a decorator that adds entity deletion functionality to a service method
 * @template E The entity type
 * @param {IApiFunctionProperties<E>} properties - Configuration properties for the delete function
 * @returns {(target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor} A decorator function that modifies the target method to handle entity deletion
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/api-reference/decorators/api-function/api-function-delete | API Reference - ApiFunctionDelete}
 */
export function ApiFunctionDelete<E extends IApiBaseEntity>(properties: IApiFunctionProperties<E>): (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor {
	const { entity }: IApiFunctionProperties<E> = properties;
	const transactionMode: EApiFunctionTransactionMode = properties.transaction?.mode ?? EApiFunctionTransactionMode.SUPPORTS;
	const getDecorator: (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor = ApiFunctionGet<E>({ entity, transaction: properties.transaction });
	let getFunction: (properties: TApiFunctionGetProperties<E>) => Promise<E>;

	return function (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
		descriptor.value = async function (this: { repository: Repository<E> }, criteria: TApiFunctionDeleteCriteria<E>): Promise<E> {
			return await ApiFunctionExecuteWithTransaction({
				callback: async (eventManager: EntityManager | undefined): Promise<E> => {
					const entityInstance: E = new entity();

					const executionContext: IApiSubscriberFunctionExecutionContext<E, TApiFunctionDeleteCriteria<E>> = {
						DATA: { criteria, eventManager, repository: this.repository },
						ENTITY: entityInstance,
						FUNCTION_TYPE: EApiFunctionType.DELETE,
						result: criteria,
					};

					const result: TApiFunctionDeleteCriteria<E> | undefined = await ApiSubscriberExecutor.executeFunctionSubscribers(this.constructor as new (...arguments_: Array<unknown>) => unknown, entityInstance, EApiFunctionType.DELETE, EApiSubscriberOnType.BEFORE, executionContext);

					if (result) {
						executionContext.result = result;
					}

					const repository: Repository<E> = this.repository;

					if (!repository) {
						const errorExecutionContext: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>> = {
							DATA: { criteria, eventManager, repository: this.repository },
							ENTITY: entityInstance,
							FUNCTION_TYPE: EApiFunctionType.DELETE,
						};

						await ApiSubscriberExecutor.executeFunctionErrorSubscribers(this.constructor as new (...arguments_: Array<unknown>) => unknown, entityInstance, EApiFunctionType.DELETE, EApiSubscriberOnType.BEFORE_ERROR, errorExecutionContext, ErrorException("Repository is not available in this context"));

						throw ErrorException("Repository is not available in this context");
					}

					if (!getFunction) {
						const getDescriptor: TypedPropertyDescriptor<(properties: TApiFunctionGetProperties<E>) => Promise<E>> = {};
						getDecorator(this, "get", getDescriptor);

						if (getDescriptor.value) {
							getFunction = getDescriptor.value.bind(this);
						} else {
							throw ErrorException("Get function is not properly decorated");
						}
					}

					return executor<E>({ constructor: this.constructor as new (...arguments_: Array<unknown>) => unknown, criteria: executionContext.result ?? {}, entity, getFunction, repository });
				},
				entity,
				mode: transactionMode,
				onPreflightError: async (eventManager: EntityManager | undefined, error: Error): Promise<void> => {
					const entityInstance: E = new entity();

					const errorExecutionContext: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>> = {
						DATA: { criteria, eventManager, repository: this.repository },
						ENTITY: entityInstance,
						FUNCTION_TYPE: EApiFunctionType.DELETE,
					};

					await ApiSubscriberExecutor.executeFunctionErrorSubscribers(this.constructor as new (...arguments_: Array<unknown>) => unknown, entityInstance, EApiFunctionType.DELETE, EApiSubscriberOnType.BEFORE_ERROR, errorExecutionContext, error);
				},
				repository: this.repository,
			});
		};

		return descriptor;
	};
}

/**
 * Executes the entity deletion operation with error handling
 * @template E The entity type
 * @param {IApiFunctionDeleteExecutorProperties<E>} options - Properties required for entity deletion
 * @returns {Promise<E>} The deleted entity instance
 * @throws {InternalServerErrorException} If the deletion operation fails
 */
async function executor<E extends IApiBaseEntity>(options: IApiFunctionDeleteExecutorProperties<E>): Promise<E> {
	const { constructor, criteria, entity, getFunction, repository }: IApiFunctionDeleteExecutorProperties<E> = options;
	const eventManager: EntityManager | undefined = ApiFunctionContextStorage.get<E>()?.eventManager;

	try {
		const existingEntity: E = await getFunction({ where: criteria });

		let result: E;

		if (eventManager) {
			const eventRepository: Repository<E> = eventManager.getRepository<E>(entity);
			result = await eventRepository.remove(existingEntity);
		} else {
			result = await repository.remove(existingEntity);
		}

		const executionContext: IApiSubscriberFunctionExecutionContext<E, E> = {
			DATA: { criteria, eventManager, repository },
			ENTITY: existingEntity,
			FUNCTION_TYPE: EApiFunctionType.DELETE,
			result: result,
		};

		const afterResult: E | undefined = await ApiSubscriberExecutor.executeFunctionSubscribers(constructor, existingEntity, EApiFunctionType.DELETE, EApiSubscriberOnType.AFTER, executionContext);

		if (afterResult) {
			return afterResult;
		}

		return result;
	} catch (caughtError) {
		const entityInstance: E = new entity();

		const errorExecutionContext: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>> = {
			DATA: { criteria, eventManager, repository },
			ENTITY: entityInstance,
			FUNCTION_TYPE: EApiFunctionType.DELETE,
		};

		let error: unknown = caughtError;

		if (DatabaseTypeOrmIsEntityNotFound(caughtError)) {
			error = new NotFoundException(ErrorString({ entity, type: EErrorStringAction.NOT_FOUND }), { cause: caughtError });
		}

		if (DatabaseTypeOrmIsEntityMetadataNotFound(caughtError)) {
			error = new InternalServerErrorException(ErrorString({ entity, type: EErrorStringAction.DATABASE_ERROR }), { cause: caughtError });
		}

		if (DatabaseTypeOrmIsForeignKeyViolation(caughtError)) {
			const message: string = ErrorString({ entity, type: EErrorStringAction.DATABASE_CONSTRAINT_VIOLATION });
			const detailsBase: ReturnType<typeof DatabaseTypeOrmGetForeignKeyViolationDetails> = DatabaseTypeOrmGetForeignKeyViolationDetails(caughtError);
			const details: object = detailsBase ? { ...detailsBase, type: EApiExceptionDetailsType.FOREIGN_KEY_VIOLATION } : { type: EApiExceptionDetailsType.FOREIGN_KEY_VIOLATION };
			error = new BadRequestException({ details, error: "Bad Request", message, statusCode: HttpStatus.BAD_REQUEST }, { cause: caughtError });
		}

		if (error instanceof HttpException) {
			await ApiSubscriberExecutor.executeFunctionErrorSubscribers(constructor, entityInstance, EApiFunctionType.DELETE, EApiSubscriberOnType.AFTER_ERROR, errorExecutionContext, error);

			throw error;
		}

		LoggerUtility.getLogger("ApiFunctionDelete").verbose(`Error deleting entity ${entity.name}:`, error);
		await ApiSubscriberExecutor.executeFunctionErrorSubscribers(constructor, entityInstance, EApiFunctionType.DELETE, EApiSubscriberOnType.AFTER_ERROR, errorExecutionContext, error as Error);

		throw new InternalServerErrorException(
			ErrorString({
				entity: entity,
				type: EErrorStringAction.DELETING_ERROR,
			}),
			{ cause: caughtError },
		);
	}
}
