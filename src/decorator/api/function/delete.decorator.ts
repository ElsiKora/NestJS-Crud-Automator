import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunctionErrorExecutionContext } from "@interface/class/api/subscriber/function/error-execution-context.interface";
import type { IApiSubscriberFunctionExecutionContext } from "@interface/class/api/subscriber/function/execution/context";
import type { IApiSubscriberFunctionExecutionContextData } from "@interface/class/api/subscriber/function/execution/context/data.interface";
import type { IApiFunctionDeleteExecutorProperties, IApiFunctionProperties } from "@interface/decorator/api";
import type { TApiAuthorizationScopeWhere } from "@type/class/api/authorization/scope-where.type";
import type { TApiSubscriberFunctionBeforeDeleteContext } from "@type/class/api/subscriber/function/before/delete-context.type";
import type { TApiFunctionDeleteCriteria, TApiFunctionGetProperties } from "@type/decorator/api/function";
import type { EntityManager, FindOptionsWhere, Repository } from "typeorm";

import { ApiControllerGeneratedFunctionCapability } from "@class/api/controller/generated/function-capability.class";
import { ApiControllerGeneratedReadScopeStorage } from "@class/api/controller/generated/read-scope-storage.class";
import { ApiFunctionContextStorage } from "@class/api/function/context-storage.class";
import { ApiFunctionPrincipalStorage } from "@class/api/function/principal-storage.class";
import { ApiFunctionWriteCondition } from "@class/api/function/write-condition.class";
import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { ApiFunctionGet } from "@decorator/api/function/get/decorator";
import { EApiFunctionTransactionMode, EApiFunctionType, EApiSubscriberOnType } from "@enum/decorator/api";
import { EErrorStringAction } from "@enum/utility";
import { HttpException, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { ApiFunctionExecuteWithTransaction } from "@utility/api/function-transaction.utility";
import { AuthorizationScopeMergeWhere } from "@utility/authorization/scope-merge-where.utility";
import { DatabaseTypeOrmAssertRequiredWhere } from "@utility/database/typeorm/assert/required-where.utility";
import { DatabaseTypeOrmIsEntityMetadataNotFound } from "@utility/database/typeorm/is/entity/metadata-not-found.utility";
import { DatabaseTypeOrmIsEntityNotFound } from "@utility/database/typeorm/is/entity/not-found.utility";
import { DatabaseTypeOrmIsForeignKeyViolation } from "@utility/database/typeorm/is/foreign-key-violation.utility";
import { DatabaseTypeOrmLockRow } from "@utility/database/typeorm/lock-row.utility";
import { FormatErrorEvidenceForLog } from "@utility/error/evidence-for-log.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { ErrorForeignKeyException } from "@utility/error/foreign-key-exception.utility";
import { ErrorString } from "@utility/error/string.utility";
import { LoggerUtility } from "@utility/logger.utility";

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
	let getFunction: (this: { repository: Repository<E> }, properties: TApiFunctionGetProperties<E>) => Promise<E>;

	return function (_target: unknown, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
		descriptor.value = async function (this: { repository: Repository<E> }, criteria: TApiFunctionDeleteCriteria<E>): Promise<E> {
			const mandatoryWhere: TApiAuthorizationScopeWhere<E> | undefined = ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.DELETE, criteria);

			return await ApiFunctionExecuteWithTransaction({
				callback: async (eventManager: EntityManager | undefined): Promise<E> => {
					const entityInstance: E = new entity();
					const repository: Repository<E> = eventManager ? eventManager.getRepository<E>(entity) : this.repository;

					const writeCondition: ApiFunctionWriteCondition<E> = new ApiFunctionWriteCondition<E>(`${this.constructor.name}.${propertyKey}`, eventManager !== undefined);

					const executionContext: TApiSubscriberFunctionBeforeDeleteContext<E> = {
						DATA: { addCondition: writeCondition.add.bind(writeCondition), criteria, eventManager, principal: ApiFunctionPrincipalStorage.get(), repository },
						ENTITY: entityInstance,
						FUNCTION_TYPE: EApiFunctionType.DELETE,
						result: criteria,
					};

					let result: TApiFunctionDeleteCriteria<E> | undefined;

					try {
						result = await ApiSubscriberExecutor.executeFunctionBeforeSubscribers(this.constructor as new (...arguments_: Array<unknown>) => unknown, entityInstance, EApiFunctionType.DELETE, executionContext);
					} finally {
						writeCondition.close();
					}

					if (result) {
						executionContext.result = result;
					}

					if (!repository) {
						const errorExecutionContext: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>> = {
							DATA: { criteria, eventManager, principal: ApiFunctionPrincipalStorage.get(), repository },
							ENTITY: entityInstance,
							FUNCTION_TYPE: EApiFunctionType.DELETE,
						};

						await ApiSubscriberExecutor.executeFunctionErrorSubscribers(this.constructor as new (...arguments_: Array<unknown>) => unknown, entityInstance, EApiFunctionType.DELETE, EApiSubscriberOnType.BEFORE_ERROR, errorExecutionContext, ErrorException("Repository is not available in this context"));

						throw ErrorException("Repository is not available in this context");
					}

					if (!getFunction) {
						const getDescriptor: TypedPropertyDescriptor<(this: { repository: Repository<E> }, properties: TApiFunctionGetProperties<E>) => Promise<E>> = {};
						getDecorator(this, "get", getDescriptor);

						if (getDescriptor.value) {
							getFunction = getDescriptor.value;
						} else {
							throw ErrorException("Get function is not properly decorated");
						}
					}

					const subscriberCriteria: TApiFunctionDeleteCriteria<E> = executionContext.result ?? {};
					// The conditions BEFORE subscribers added narrow the read, and the remove checks them again on the locked row.
					const scopedCriteria: TApiAuthorizationScopeWhere<E> = mandatoryWhere ? (ApiControllerGeneratedReadScopeStorage.protect({ where: subscriberCriteria }, mandatoryWhere).where ?? mandatoryWhere) : subscriberCriteria;
					const protectedCriteria: TApiFunctionDeleteCriteria<E> = writeCondition.hasConditions ? ((writeCondition.apply(scopedCriteria) ?? subscriberCriteria) as TApiFunctionDeleteCriteria<E>) : scopedCriteria;

					return executor<E>({ constructor: this.constructor as new (...arguments_: Array<unknown>) => unknown, criteria: protectedCriteria, entity, getFunction, repository, writeCondition }, mandatoryWhere ? protectedCriteria : undefined, this);
				},
				entity,
				functionType: EApiFunctionType.DELETE,
				methodName: propertyKey,
				mode: transactionMode,
				onPreflightError: async (eventManager: EntityManager | undefined, error: Error): Promise<void> => {
					const entityInstance: E = new entity();

					const errorExecutionContext: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>> = {
						DATA: { criteria, eventManager, principal: ApiFunctionPrincipalStorage.get(), repository: this.repository },
						ENTITY: entityInstance,
						FUNCTION_TYPE: EApiFunctionType.DELETE,
					};

					await ApiSubscriberExecutor.executeFunctionErrorSubscribers(this.constructor as new (...arguments_: Array<unknown>) => unknown, entityInstance, EApiFunctionType.DELETE, EApiSubscriberOnType.BEFORE_ERROR, errorExecutionContext, error);
				},
				repository: this.repository,
				serviceConstructor: this.constructor as new (...arguments_: Array<unknown>) => unknown,
			});
		};

		ApiControllerGeneratedFunctionCapability.mark(descriptor.value, EApiFunctionType.DELETE, entity, transactionMode);

		return descriptor;
	};
}

/**
 * Executes the entity deletion operation with error handling
 * @template E The entity type
 * @param {IApiFunctionDeleteExecutorProperties<E>} options - Properties required for entity deletion
 * @param {TApiAuthorizationScopeWhere<E>} [mandatoryWhere] - Generated route scope that the internal GET must preserve
 * @param {object} [service] - Current service instance that owns the internal GET
 * @param {Repository<E>} [service.repository] - Current service repository
 * @returns {Promise<E>} The deleted entity instance
 * @throws {InternalServerErrorException} If the deletion operation fails
 */
async function executor<E extends IApiBaseEntity>(options: IApiFunctionDeleteExecutorProperties<E>, mandatoryWhere?: TApiAuthorizationScopeWhere<E>, service?: { repository: Repository<E> }): Promise<E> {
	const { constructor, criteria, entity, getFunction, repository, writeCondition }: IApiFunctionDeleteExecutorProperties<E> = options;
	const eventManager: EntityManager | undefined = ApiFunctionContextStorage.getEventManager();

	try {
		const getProperties: TApiFunctionGetProperties<E> = { where: criteria };

		const currentService: { repository: Repository<E> } = service ?? { repository };

		const existingEntity: E = mandatoryWhere ? await ApiControllerGeneratedReadScopeStorage.runWriteHydration(getProperties, mandatoryWhere, async (): Promise<E> => await Reflect.apply(getFunction, currentService, [getProperties])) : await Reflect.apply(getFunction, currentService, [getProperties]);

		let result: E;

		// A remove writes by the key, so the conditions BEFORE subscribers added are checked on the locked row right before it; without one no read is added.
		if (writeCondition.hasConditions) await lockDeleteWriteCondition(eventManager ? eventManager.getRepository<E>(entity) : repository, criteria, existingEntity);

		if (eventManager) {
			const eventRepository: Repository<E> = eventManager.getRepository<E>(entity);
			result = await eventRepository.remove(existingEntity);
		} else {
			result = await repository.remove(existingEntity);
		}

		const executionContext: IApiSubscriberFunctionExecutionContext<E, E> = {
			DATA: { criteria, eventManager, principal: ApiFunctionPrincipalStorage.get(), repository },
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
			DATA: { criteria, eventManager, principal: ApiFunctionPrincipalStorage.get(), repository },
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
			error = ErrorForeignKeyException(entity, EApiFunctionType.DELETE, caughtError);
		}

		if (error instanceof HttpException) {
			await ApiSubscriberExecutor.executeFunctionErrorSubscribers(constructor, entityInstance, EApiFunctionType.DELETE, EApiSubscriberOnType.AFTER_ERROR, errorExecutionContext, error);

			throw error;
		}

		LoggerUtility.getLogger("ApiFunctionDelete").verbose(`Error deleting entity ${entity.name}: ${FormatErrorEvidenceForLog(error)}`);
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

/**
 * Checks the conditions BEFORE subscribers added to a delete on the row it is about to remove: a locking read by the row's key and the criteria the read used, which carry the scope and the conditions, in the transaction of the write.
 * @template E Entity type.
 * @param {Repository<E>} repository - Transaction-bound repository of the write.
 * @param {TApiFunctionDeleteCriteria<E>} criteria - Criteria of the read, the scope and the conditions included.
 * @param {E} existingEntity - Row the read loaded.
 * @throws {NotFoundException} When the row no longer meets the criteria.
 */
async function lockDeleteWriteCondition<E extends IApiBaseEntity>(repository: Repository<E>, criteria: TApiFunctionDeleteCriteria<E>, existingEntity: E): Promise<void> {
	const keyWhere: FindOptionsWhere<E> | undefined = repository.metadata.getEntityIdMap(existingEntity) as FindOptionsWhere<E> | undefined;

	if (!keyWhere) throw new InternalServerErrorException("DELETE read a row without a complete primary key");
	const where: TApiAuthorizationScopeWhere<E> = AuthorizationScopeMergeWhere(criteria, keyWhere);
	DatabaseTypeOrmAssertRequiredWhere(where);

	// The read already decided whether a soft-deleted row is visible; the check adds only the conditions, so it reads by key with deleted rows included.
	if (!(await DatabaseTypeOrmLockRow(repository, where, true))) throw new NotFoundException(ErrorString({ entity: repository.metadata.target as new () => E, type: EErrorStringAction.NOT_FOUND }));
}
