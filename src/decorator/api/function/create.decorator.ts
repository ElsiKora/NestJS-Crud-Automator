import type { ApiFunctionTransactionRegistry } from "@class/api/function/transaction/registry.class";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunctionErrorExecutionContext } from "@interface/class/api/subscriber/function/error-execution-context.interface";
import type { IApiSubscriberFunctionExecutionContext } from "@interface/class/api/subscriber/function/execution/context";
import type { IApiSubscriberFunctionExecutionContextData } from "@interface/class/api/subscriber/function/execution/context/data.interface";
import type { IApiFunctionCreateExecutorProperties, IApiFunctionProperties } from "@interface/decorator/api";
import type { TApiFunctionCreateProperties } from "@type/decorator/api/function";
import type { EntityManager, ObjectLiteral, Repository } from "typeorm";

import { ApiControllerGeneratedFunctionCapability } from "@class/api/controller/generated/function-capability.class";
import { ApiControllerGeneratedInsertedKeyStorage } from "@class/api/controller/generated/inserted-key-storage.class";
import { ApiControllerGeneratedReadScopeStorage } from "@class/api/controller/generated/read-scope-storage.class";
import { ApiFunctionContextStorage } from "@class/api/function/context-storage.class";
import { ApiFunctionCreateInsertGuard } from "@class/api/function/create-insert-guard.class";
import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { EApiFunctionTransactionMode, EApiFunctionTransactionOwnerKind } from "@enum/decorator/api";
import { EApiFunctionType } from "@enum/decorator/api/function";
import { EApiSubscriberOnType } from "@enum/decorator/api/on-type.enum";
import { EErrorStringAction } from "@enum/utility";
import { EApiExceptionDetailsType } from "@enum/utility/exception-details-type.enum";
import { BadRequestException, ConflictException, HttpException, HttpStatus, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { ApiFunctionGetTransactionRepository } from "@utility/api/function-transaction-repository.utility";
import { ApiFunctionExecuteWithTransaction } from "@utility/api/function-transaction.utility";
import { DatabaseTypeOrmGetForeignKeyViolationDetails } from "@utility/database/typeorm/get/foreign-key-violation-details.utility";
import { DatabaseTypeOrmIsConcurrencyConflict } from "@utility/database/typeorm/is/concurrency-conflict.utility";
import { DatabaseTypeOrmIsEntityMetadataNotFound } from "@utility/database/typeorm/is/entity/metadata-not-found.utility";
import { DatabaseTypeOrmIsEntityNotFound } from "@utility/database/typeorm/is/entity/not-found.utility";
import { DatabaseTypeOrmIsForeignKeyViolation } from "@utility/database/typeorm/is/foreign-key-violation.utility";
import { DatabaseTypeOrmIsUniqueViolation } from "@utility/database/typeorm/is/unique-violation.utility";
import { ErrorDuplicateKeyException } from "@utility/error/duplicate-key-exception.utility";
import { FormatErrorEvidenceForLog } from "@utility/error/evidence-for-log.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { ErrorString } from "@utility/error/string.utility";
import { LoggerUtility } from "@utility/logger.utility";

/**
 * Creates a decorator that adds entity creation functionality to a service method
 * @template E The entity type
 * @param {IApiFunctionProperties<E>} properties - Configuration properties for the create function
 * @returns {(target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor} A decorator function that modifies the target method to handle entity creation
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/api-reference/decorators/api-function/api-function-create | API Reference - ApiFunctionCreate}
 */
export function ApiFunctionCreate<E extends IApiBaseEntity>(properties: IApiFunctionProperties<E>): (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor {
	const { entity }: IApiFunctionProperties<E> = properties;
	const transactionMode: EApiFunctionTransactionMode = properties.transaction?.mode ?? EApiFunctionTransactionMode.SUPPORTS;

	return function (_target: unknown, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
		descriptor.value = async function (this: { repository: Repository<E> }, createProperties: TApiFunctionCreateProperties<E>): Promise<IApiBaseEntity> {
			const reportInsertedKey: ((key: ObjectLiteral | undefined) => void) | undefined = ApiControllerGeneratedInsertedKeyStorage.claim(createProperties, entity.name);
			ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.CREATE, createProperties);

			return await ApiFunctionExecuteWithTransaction({
				callback: async (eventManager: EntityManager | undefined): Promise<IApiBaseEntity> => {
					const entityInstance: E = new entity();
					const repository: Repository<E> = eventManager ? ApiFunctionGetTransactionRepository<E>(eventManager, this.repository, entity) : this.repository;

					const executionContext: IApiSubscriberFunctionExecutionContext<E, TApiFunctionCreateProperties<E>, IApiSubscriberFunctionExecutionContextData<E>> = {
						DATA: { eventManager, repository },
						ENTITY: entityInstance,
						FUNCTION_TYPE: EApiFunctionType.CREATE,
						result: createProperties,
					};

					const result: TApiFunctionCreateProperties<E> | undefined = await ApiSubscriberExecutor.executeFunctionBeforeSubscribers(this.constructor as new (...arguments_: Array<unknown>) => unknown, entityInstance, EApiFunctionType.CREATE, executionContext);

					if (result) {
						executionContext.result = result;
					}

					if (!repository) {
						const errorExecutionContext: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>> = {
							DATA: { eventManager, repository },
							ENTITY: entityInstance,
							FUNCTION_TYPE: EApiFunctionType.CREATE,
						};

						await ApiSubscriberExecutor.executeFunctionErrorSubscribers(this.constructor as new (...arguments_: Array<unknown>) => unknown, entityInstance, EApiFunctionType.CREATE, EApiSubscriberOnType.BEFORE_ERROR, errorExecutionContext, ErrorException("Repository is not available in this context"));

						throw ErrorException("Repository is not available in this context");
					}

					return executor<E>({ constructor: this.constructor as new (...arguments_: Array<unknown>) => unknown, entity, properties: executionContext.result ?? ({} as unknown as TApiFunctionCreateProperties<E>), reportInsertedKey, repository, serviceRepository: this.repository });
				},
				entity,
				functionType: EApiFunctionType.CREATE,
				methodName: propertyKey,
				mode: transactionMode,
				onPreflightError: async (eventManager: EntityManager | undefined, error: Error): Promise<void> => {
					const entityInstance: E = new entity();
					const repository: Repository<E> = eventManager ? ApiFunctionGetTransactionRepository<E>(eventManager, this.repository, entity) : this.repository;

					const errorExecutionContext: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>> = {
						DATA: { eventManager, repository },
						ENTITY: entityInstance,
						FUNCTION_TYPE: EApiFunctionType.CREATE,
					};

					await ApiSubscriberExecutor.executeFunctionErrorSubscribers(this.constructor as new (...arguments_: Array<unknown>) => unknown, entityInstance, EApiFunctionType.CREATE, EApiSubscriberOnType.BEFORE_ERROR, errorExecutionContext, error);
				},
				repository: this.repository,
				serviceConstructor: this.constructor as new (...arguments_: Array<unknown>) => unknown,
			});
		};

		ApiControllerGeneratedFunctionCapability.mark(descriptor.value, EApiFunctionType.CREATE, entity, transactionMode);

		return descriptor;
	};
}

/**
 * Runs the after-error subscribers of a failed create at the moment they can still read.
 * @template E The entity type
 * @param {IApiFunctionCreateExecutorProperties<E>} options - Properties of the failed create
 * @param {E} entityInstance - Entity instance the subscribers match on
 * @param {IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>>} context - Context of the failed create
 * @param {Error} failure - Error the create answers with
 * @returns {Promise<void>} Resolves when the subscribers ran, or were kept for the end of the transaction
 */
async function executeAfterErrorSubscribers<E extends IApiBaseEntity>(options: IApiFunctionCreateExecutorProperties<E>, entityInstance: E, context: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>>, failure: Error): Promise<void> {
	const { constructor, properties, serviceRepository }: IApiFunctionCreateExecutorProperties<E> = options;
	const registry: ApiFunctionTransactionRegistry | undefined = ApiFunctionContextStorage.getTransactionRegistry();

	if (registry && registry.getTransaction().owner.kind !== EApiFunctionTransactionOwnerKind.SCOPE) {
		// A failed statement aborts a PostgreSQL transaction, so the hook runs after the rollback and reads through the service repository.
		registry.deferUntilSettled(async (): Promise<void> => {
			await ApiSubscriberExecutor.executeFunctionErrorSubscribers(constructor, entityInstance, EApiFunctionType.CREATE, EApiSubscriberOnType.AFTER_ERROR, { ...context, DATA: { eventManager: undefined, properties, repository: serviceRepository } }, failure);
		});

		return;
	}

	await ApiSubscriberExecutor.executeFunctionErrorSubscribers(constructor, entityInstance, EApiFunctionType.CREATE, EApiSubscriberOnType.AFTER_ERROR, context, failure);
}

/**
 * Executes the entity creation operation with error handling
 * @template E The entity type
 * @param {IApiFunctionCreateExecutorProperties<E>} options - Properties required for entity creation
 * @returns {Promise<E>} The created entity instance
 * @throws {InternalServerErrorException} If the creation operation fails
 */
async function executor<E extends IApiBaseEntity>(options: IApiFunctionCreateExecutorProperties<E>): Promise<E> {
	const { constructor, entity, properties, reportInsertedKey, repository }: IApiFunctionCreateExecutorProperties<E> = options;
	const eventManager: EntityManager | undefined = ApiFunctionContextStorage.getEventManager();

	try {
		// A create only inserts: a save that would change a row that already exists answers 409 before it writes.
		const result: E = await ApiFunctionCreateInsertGuard.save(repository, properties, entity);
		// A generated route reads its response by the key TypeORM saved, taken before a function subscriber can replace or change the result.
		reportInsertedKey?.(repository.metadata.getEntityIdMap(result));
		const entityInstance: E = new entity();

		const executionContext: IApiSubscriberFunctionExecutionContext<E, E, IApiSubscriberFunctionExecutionContextData<E>> = {
			DATA: { eventManager, repository },
			ENTITY: entityInstance,
			FUNCTION_TYPE: EApiFunctionType.CREATE,
			result: result,
		};

		const afterResult: E | undefined = await ApiSubscriberExecutor.executeFunctionSubscribers<E, E, IApiSubscriberFunctionExecutionContextData<E>>(constructor, entityInstance, EApiFunctionType.CREATE, EApiSubscriberOnType.AFTER, executionContext);

		if (afterResult) {
			return afterResult;
		}

		return result;
	} catch (caughtError) {
		const entityInstance: E = new entity();

		const errorExecutionContext: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>> = {
			DATA: { eventManager, properties, repository },
			ENTITY: entityInstance,
			FUNCTION_TYPE: EApiFunctionType.CREATE,
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

		if (DatabaseTypeOrmIsUniqueViolation(caughtError)) {
			error = ErrorDuplicateKeyException(entity, caughtError);
		}

		if (DatabaseTypeOrmIsConcurrencyConflict(caughtError)) {
			error = new ConflictException(ErrorString({ entity, type: EErrorStringAction.CONFLICT }), { cause: caughtError });
		}

		if (error instanceof HttpException) {
			await executeAfterErrorSubscribers(options, entityInstance, errorExecutionContext, error);

			throw error;
		}

		LoggerUtility.getLogger("ApiFunctionCreate").verbose(`Error creating entity ${entity.name}: ${FormatErrorEvidenceForLog(error)}`);
		await executeAfterErrorSubscribers(options, entityInstance, errorExecutionContext, error as Error);

		throw new InternalServerErrorException(
			ErrorString({
				entity: entity,
				type: EErrorStringAction.CREATING_ERROR,
			}),
			{ cause: caughtError },
		);
	}
}
