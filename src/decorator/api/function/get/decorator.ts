import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunctionErrorExecutionContext } from "@interface/class/api/subscriber/function/error-execution-context.interface";
import type { IApiSubscriberFunctionExecutionContext } from "@interface/class/api/subscriber/function/execution/context";
import type { IApiSubscriberFunctionExecutionContextData } from "@interface/class/api/subscriber/function/execution/context/data.interface";
import type { IApiFunctionGetExecutorProperties, IApiFunctionProperties } from "@interface/decorator/api";
import type { TApiAuthorizationScopeWhere } from "@type/class/api/authorization/scope-where.type";
import type { TApiFunctionGetProperties } from "@type/decorator/api/function";
import type { EntityManager, FindOneOptions, Repository } from "typeorm";

import { ApiControllerGeneratedReadScopeStorage } from "@class/api/controller/generated";
import { ApiControllerGeneratedFunctionCapability } from "@class/api/controller/generated/function-capability.class";
import { ApiControllerGeneratedRelationCacheContract } from "@class/api/controller/generated/relation-cache-contract.class";
import { ApiControllerGeneratedWriteHydrationContract } from "@class/api/controller/generated/write-hydration-contract.class";
import { ApiFunctionContextStorage } from "@class/api/function/context-storage.class";
import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { EApiFunctionTransactionMode, EApiFunctionType, EApiSubscriberOnType } from "@enum/decorator/api";
import { EErrorStringAction } from "@enum/utility";
import { HttpException, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { ApiFunctionExecuteWithTransaction } from "@utility/api/function-transaction.utility";
import { DatabaseTypeOrmIsEntityMetadataNotFound } from "@utility/database/typeorm/is/entity/metadata-not-found.utility";
import { DatabaseTypeOrmIsEntityNotFound } from "@utility/database/typeorm/is/entity/not-found.utility";
import { FormatErrorEvidenceForLog } from "@utility/error/evidence-for-log.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { ErrorString } from "@utility/error/string.utility";
import { LoggerUtility } from "@utility/logger.utility";

/**
 * Creates a decorator that adds single entity retrieval functionality to a service method
 * @template E The entity type
 * @param {IApiFunctionProperties<E>} properties - Configuration properties for the get function
 * @returns {(target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor} A decorator function that modifies the target method to handle single entity retrieval
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/api-reference/decorators/api-function/api-function-get | API Reference - ApiFunctionGet}
 */
export function ApiFunctionGet<E extends IApiBaseEntity>(properties: IApiFunctionProperties<E>): (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor {
	const { entity }: IApiFunctionProperties<E> = properties;
	const transactionMode: EApiFunctionTransactionMode = properties.transaction?.mode ?? EApiFunctionTransactionMode.SUPPORTS;

	return function (_target: unknown, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
		descriptor.value = async function (this: { repository: Repository<E> }, getProperties: TApiFunctionGetProperties<E>): Promise<E> {
			const mandatoryWhere: TApiAuthorizationScopeWhere<E> | undefined = ApiControllerGeneratedReadScopeStorage.claim<E>(EApiFunctionType.GET, getProperties);
			const isWriteHydration: boolean = mandatoryWhere ? ApiControllerGeneratedReadScopeStorage.isWriteHydration(EApiFunctionType.GET, getProperties) : false;

			return await ApiFunctionExecuteWithTransaction({
				callback: async (eventManager: EntityManager | undefined): Promise<E> => {
					const entityInstance: E = new entity();
					const repository: Repository<E> = eventManager ? eventManager.getRepository<E>(entity) : this.repository;
					let finalProperties: TApiFunctionGetProperties<E>;

					try {
						const executionContext: IApiSubscriberFunctionExecutionContext<E, TApiFunctionGetProperties<E>> = {
							DATA: { eventManager, getProperties, repository },
							ENTITY: entityInstance,
							FUNCTION_TYPE: EApiFunctionType.GET,
							result: getProperties,
						};

						const result: FindOneOptions<E> | undefined = await ApiSubscriberExecutor.executeFunctionBeforeSubscribers(this.constructor as new (...arguments_: Array<unknown>) => unknown, entityInstance, EApiFunctionType.GET, executionContext);

						if (result) {
							executionContext.result = result;
						}

						if (!repository) {
							throw ErrorException("Repository is not available in this context");
						}

						const subscriberProperties: TApiFunctionGetProperties<E> = executionContext.result ?? {};
						finalProperties = mandatoryWhere ? ApiControllerGeneratedReadScopeStorage.protect(subscriberProperties, mandatoryWhere) : subscriberProperties;

						if (mandatoryWhere) {
							ApiControllerGeneratedRelationCacheContract.assertSafe(repository, finalProperties);
						}
					} catch (caughtError) {
						if (mandatoryWhere || !repository) {
							const errorExecutionContext: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>> = {
								DATA: { eventManager, getProperties, repository },
								ENTITY: entityInstance,
								FUNCTION_TYPE: EApiFunctionType.GET,
							};

							await ApiSubscriberExecutor.executeFunctionErrorSubscribers(this.constructor as new (...arguments_: Array<unknown>) => unknown, entityInstance, EApiFunctionType.GET, EApiSubscriberOnType.BEFORE_ERROR, errorExecutionContext, caughtError as Error);
						}

						throw caughtError;
					}

					return executor<E>({ constructor: this.constructor as new (...arguments_: Array<unknown>) => unknown, entity, properties: finalProperties, repository }, isWriteHydration);
				},
				entity,
				functionType: EApiFunctionType.GET,
				methodName: propertyKey,
				mode: transactionMode,
				onPreflightError: async (eventManager: EntityManager | undefined, error: Error): Promise<void> => {
					const entityInstance: E = new entity();
					const repository: Repository<E> = eventManager ? eventManager.getRepository<E>(entity) : this.repository;

					const errorExecutionContext: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>> = {
						DATA: { eventManager, getProperties, repository },
						ENTITY: entityInstance,
						FUNCTION_TYPE: EApiFunctionType.GET,
					};

					await ApiSubscriberExecutor.executeFunctionErrorSubscribers(this.constructor as new (...arguments_: Array<unknown>) => unknown, entityInstance, EApiFunctionType.GET, EApiSubscriberOnType.BEFORE_ERROR, errorExecutionContext, error);
				},
				repository: this.repository,
				serviceConstructor: this.constructor as new (...arguments_: Array<unknown>) => unknown,
			});
		};

		ApiControllerGeneratedFunctionCapability.mark(descriptor.value, EApiFunctionType.GET, entity);

		return descriptor;
	};
}

/**
 * Executes the single entity retrieval operation with error handling
 * @template E The entity type
 * @param {IApiFunctionGetExecutorProperties<E>} options - Properties required for entity retrieval
 * @param {boolean} isWriteHydration - Whether the GET hydrates a generated mutation target
 * @returns {Promise<E>} The retrieved entity instance
 * @throws {NotFoundException} If the entity is not found
 * @throws {InternalServerErrorException} If the retrieval operation fails
 */
async function executor<E extends IApiBaseEntity>(options: IApiFunctionGetExecutorProperties<E>, isWriteHydration: boolean): Promise<E> {
	const { constructor, entity, properties, repository }: IApiFunctionGetExecutorProperties<E> = options;
	const eventManager: EntityManager | undefined = ApiFunctionContextStorage.getEventManager();

	try {
		const item: E | null = await repository.findOne(properties);

		if (!item) {
			throw new NotFoundException(ErrorString({ entity, type: EErrorStringAction.NOT_FOUND }));
		}

		const repositoryMetadata: Repository<E>["metadata"] | undefined = (repository as Partial<Pick<Repository<E>, "metadata">>).metadata;
		const relationMetadata: Array<{ isLazy: boolean; propertyName: string }> = repositoryMetadata?.relations ?? [];
		const allowedHydrationAccessors: ReadonlySet<PropertyKey> = new Set<PropertyKey>(isWriteHydration ? relationMetadata.filter((relation: { isLazy: boolean; propertyName: string }): boolean => relation.isLazy).map((relation: { isLazy: boolean; propertyName: string }): string => relation.propertyName) : []);
		const rawHydrationSnapshot: E | undefined = isWriteHydration ? ApiControllerGeneratedWriteHydrationContract.createSnapshot(item, allowedHydrationAccessors) : undefined;
		const subscriberItem: E = isWriteHydration ? ApiControllerGeneratedWriteHydrationContract.createSnapshot(item, allowedHydrationAccessors) : item;
		const subscriberHydrationSnapshot: E | undefined = isWriteHydration ? ApiControllerGeneratedWriteHydrationContract.createSnapshot(subscriberItem, allowedHydrationAccessors) : undefined;

		const executionContext: IApiSubscriberFunctionExecutionContext<E, E> = {
			DATA: { eventManager, properties, repository },
			ENTITY: subscriberItem,
			FUNCTION_TYPE: EApiFunctionType.GET,
			result: subscriberItem,
		};

		const afterResult: E | undefined = await ApiSubscriberExecutor.executeFunctionSubscribers(constructor, subscriberItem, EApiFunctionType.GET, EApiSubscriberOnType.AFTER, executionContext);

		if (isWriteHydration && rawHydrationSnapshot && subscriberHydrationSnapshot) {
			ApiControllerGeneratedWriteHydrationContract.assertUnchanged(item, rawHydrationSnapshot, subscriberItem, subscriberHydrationSnapshot, afterResult, allowedHydrationAccessors);

			return item;
		}

		if (afterResult) {
			return afterResult;
		}

		return item;
	} catch (caughtError) {
		const entityInstance: E = new entity();

		const errorExecutionContext: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>> = {
			DATA: { eventManager, properties, repository },
			ENTITY: entityInstance,
			FUNCTION_TYPE: EApiFunctionType.GET,
		};

		let error: unknown = caughtError;

		if (DatabaseTypeOrmIsEntityNotFound(caughtError)) {
			error = new NotFoundException(ErrorString({ entity, type: EErrorStringAction.NOT_FOUND }), { cause: caughtError });
		}

		if (DatabaseTypeOrmIsEntityMetadataNotFound(caughtError)) {
			error = new InternalServerErrorException(ErrorString({ entity, type: EErrorStringAction.DATABASE_ERROR }), { cause: caughtError });
		}

		if (error instanceof HttpException) {
			await ApiSubscriberExecutor.executeFunctionErrorSubscribers(constructor, entityInstance, EApiFunctionType.GET, EApiSubscriberOnType.AFTER_ERROR, errorExecutionContext, error);

			throw error;
		}

		LoggerUtility.getLogger("ApiFunctionGet").verbose(`Error fetching entity ${entity.name}: ${FormatErrorEvidenceForLog(error)}`);
		await ApiSubscriberExecutor.executeFunctionErrorSubscribers(constructor, entityInstance, EApiFunctionType.GET, EApiSubscriberOnType.AFTER_ERROR, errorExecutionContext, error as Error);

		throw new InternalServerErrorException(
			ErrorString({
				entity,
				type: EErrorStringAction.FETCHING_ERROR,
			}),
			{ cause: caughtError },
		);
	}
}
