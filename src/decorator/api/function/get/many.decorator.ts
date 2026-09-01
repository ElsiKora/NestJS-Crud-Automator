import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunctionErrorExecutionContext } from "@interface/class/api/subscriber/function/error-execution-context.interface";
import type { IApiSubscriberFunctionExecutionContext } from "@interface/class/api/subscriber/function/execution/context";
import type { IApiSubscriberFunctionExecutionContextData } from "@interface/class/api/subscriber/function/execution/context/data.interface";
import type { IApiFunctionGetManyExecutorProperties, IApiFunctionProperties } from "@interface/decorator/api";
import type { TApiAuthorizationScopeWhere } from "@type/class/api/authorization/scope-where.type";
import type { TApiFunctionGetManyProperties } from "@type/decorator/api/function";
import type { EntityManager, Repository } from "typeorm";
import type { FindManyOptions } from "typeorm";

import { ApiControllerGeneratedGetManyContract, ApiControllerGeneratedReadScopeStorage } from "@class/api/controller/generated";
import { ApiControllerGeneratedFunctionCapability } from "@class/api/controller/generated/function-capability.class";
import { ApiControllerGeneratedRelationCacheContract } from "@class/api/controller/generated/relation-cache-contract.class";
import { ApiControllerGetListCursorRuntime } from "@class/api/controller/get-list/cursor/runtime.class";
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
 * Creates a decorator that adds functionality to retrieve multiple entities to a service method
 * @template E The entity type
 * @param {IApiFunctionProperties<E>} properties - Configuration properties for the get-many function
 * @returns {(target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor} A decorator function that modifies the target method to handle retrieving multiple entities
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/api-reference/decorators/api-function/api-function-get-many | API Reference - ApiFunctionGetMany}
 */
export function ApiFunctionGetMany<E extends IApiBaseEntity>(properties: IApiFunctionProperties<E>): (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor {
	const { entity }: IApiFunctionProperties<E> = properties;
	const transactionMode: EApiFunctionTransactionMode = properties.transaction?.mode ?? EApiFunctionTransactionMode.SUPPORTS;

	return function (_target: unknown, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
		descriptor.value = async function (this: { repository: Repository<E> }, getManyProperties: TApiFunctionGetManyProperties<E>): Promise<Array<E>> {
			const mandatoryWhere: TApiAuthorizationScopeWhere<E> | undefined = ApiControllerGeneratedReadScopeStorage.claim<E>(EApiFunctionType.GET_MANY, getManyProperties);
			const isGeneratedCursorCall: boolean = ApiControllerGeneratedGetManyContract.hasActiveSession();

			return await ApiFunctionExecuteWithTransaction({
				callback: async (eventManager: EntityManager | undefined): Promise<Array<E>> => {
					const entityInstance: E = new entity();
					let repository: Repository<E> = this.repository;
					let finalProperties: TApiFunctionGetManyProperties<E>;
					let isBeforeResolved: boolean = false;
					let mandatoryProperties: TApiFunctionGetManyProperties<E> | undefined;

					try {
						mandatoryProperties = mandatoryWhere ? ApiControllerGeneratedGetManyContract.createSnapshot(getManyProperties) : undefined;
						const beforeSubscriber: (beforeProperties: TApiFunctionGetManyProperties<E>) => Promise<TApiFunctionGetManyProperties<E>> = (executeBeforeSubscribers<E>).bind(undefined, this.constructor as new (...arguments_: Array<unknown>) => unknown, entityInstance, eventManager, repository);
						const subscriberProperties: TApiFunctionGetManyProperties<E> = mandatoryWhere ? await ApiControllerGeneratedGetManyContract.resolveBefore(getManyProperties, beforeSubscriber) : await beforeSubscriber(getManyProperties);
						isBeforeResolved = true;
						repository = isGeneratedCursorCall ? repository : this.repository;

						if (!repository) {
							throw ErrorException("Repository is not available in this context");
						}

						const scopedProperties: TApiFunctionGetManyProperties<E> = mandatoryWhere && !ApiControllerGeneratedGetManyContract.hasActiveSession() ? ApiControllerGeneratedReadScopeStorage.protect(subscriberProperties, mandatoryWhere) : subscriberProperties;
						finalProperties = mandatoryProperties ? ApiControllerGeneratedGetManyContract.protect(scopedProperties, mandatoryProperties) : scopedProperties;

						if (mandatoryWhere) {
							const generatedRepository: Repository<E> = eventManager ? eventManager.getRepository<E>(entity) : repository;

							ApiControllerGeneratedRelationCacheContract.assertSafe(generatedRepository, finalProperties);
						}
					} catch (caughtError) {
						if (!ApiControllerGeneratedGetManyContract.hasActiveSession() && !isBeforeResolved) {
							throw caughtError;
						}

						const errorExecutionContext: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>> = {
							DATA: { eventManager, getManyProperties, repository },
							ENTITY: entityInstance,
							FUNCTION_TYPE: EApiFunctionType.GET_MANY,
						};

						await ApiSubscriberExecutor.executeFunctionErrorSubscribers(this.constructor as new (...arguments_: Array<unknown>) => unknown, entityInstance, EApiFunctionType.GET_MANY, EApiSubscriberOnType.BEFORE_ERROR, errorExecutionContext, caughtError as Error);

						throw caughtError;
					}

					return executor<E>({ constructor: this.constructor as new (...arguments_: Array<unknown>) => unknown, entity, properties: finalProperties, repository }, mandatoryProperties);
				},
				entity,
				functionType: EApiFunctionType.GET_MANY,
				methodName: propertyKey,
				mode: transactionMode,
				onPreflightError: async (eventManager: EntityManager | undefined, error: Error): Promise<void> => {
					const entityInstance: E = new entity();

					const errorExecutionContext: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>> = {
						DATA: { eventManager, getManyProperties, repository: this.repository },
						ENTITY: entityInstance,
						FUNCTION_TYPE: EApiFunctionType.GET_MANY,
					};

					await ApiSubscriberExecutor.executeFunctionErrorSubscribers(this.constructor as new (...arguments_: Array<unknown>) => unknown, entityInstance, EApiFunctionType.GET_MANY, EApiSubscriberOnType.BEFORE_ERROR, errorExecutionContext, error);
				},
				repository: this.repository,
				serviceConstructor: this.constructor as new (...arguments_: Array<unknown>) => unknown,
			});
		};

		ApiControllerGeneratedFunctionCapability.mark(descriptor.value, EApiFunctionType.GET_MANY, entity);

		return descriptor;
	};
}

/**
 * Executes GET_MANY BEFORE subscribers for one property snapshot.
 * @template E The entity type
 * @param {new (...arguments_: Array<unknown>) => unknown} constructor - Service constructor
 * @param {E} entityInstance - Subscriber entity context
 * @param {EntityManager} eventManager - Active transaction manager
 * @param {Repository<E>} repository - Service repository
 * @param {TApiFunctionGetManyProperties<E>} getManyProperties - Properties exposed to the subscriber
 * @returns {Promise<TApiFunctionGetManyProperties<E>>} Subscriber-selected properties
 */
async function executeBeforeSubscribers<E extends IApiBaseEntity>(constructor: new (...arguments_: Array<unknown>) => unknown, entityInstance: E, eventManager: EntityManager | undefined, repository: Repository<E>, getManyProperties: TApiFunctionGetManyProperties<E>): Promise<TApiFunctionGetManyProperties<E>> {
	const executionContext: IApiSubscriberFunctionExecutionContext<E, TApiFunctionGetManyProperties<E>> = {
		DATA: { eventManager, getManyProperties, repository },
		ENTITY: entityInstance,
		FUNCTION_TYPE: EApiFunctionType.GET_MANY,
		result: getManyProperties,
	};
	const result: FindManyOptions<E> | undefined = await ApiSubscriberExecutor.executeFunctionBeforeSubscribers(constructor, entityInstance, EApiFunctionType.GET_MANY, executionContext);

	if (result) {
		executionContext.result = result;
	}

	return executionContext.result ?? {};
}

/**
 * Executes the retrieval of multiple entities with error handling
 * @template E The entity type
 * @param {IApiFunctionGetManyExecutorProperties<E>} options - Properties required for retrieving multiple entities
 * @param {TApiFunctionGetManyProperties<E>} [generatedProperties] - Protected cursor query options for generated routes
 * @returns {Promise<Array<E>>} An array of retrieved entity instances, or an empty array when no entities match
 * @throws {InternalServerErrorException} If the retrieval operation fails
 */
async function executor<E extends IApiBaseEntity>(options: IApiFunctionGetManyExecutorProperties<E>, generatedProperties?: TApiFunctionGetManyProperties<E>): Promise<Array<E>> {
	const { constructor, entity, properties, repository }: IApiFunctionGetManyExecutorProperties<E> = options;
	const eventManager: EntityManager | undefined = ApiFunctionContextStorage.getEventManager();

	try {
		let items: Array<E>;

		if (eventManager) {
			const eventRepository: Repository<E> = eventManager.getRepository<E>(entity);
			items = await eventRepository.find(properties);
		} else {
			items = await repository.find(properties);
		}

		const executionContext: IApiSubscriberFunctionExecutionContext<E, Array<E>> = {
			DATA: { eventManager, properties, repository },
			ENTITY: new entity(),
			FUNCTION_TYPE: EApiFunctionType.GET_MANY,
			result: items,
		};
		const protectedOrderFields: Array<string> | undefined = generatedProperties?.order ? Object.keys(generatedProperties.order) : undefined;
		const protectedResultSignature: string | undefined = protectedOrderFields ? ApiControllerGetListCursorRuntime.createItemsInvariantSignature(items, protectedOrderFields) : undefined;

		const afterResult: Array<E> | undefined = await ApiSubscriberExecutor.executeFunctionSubscribers(constructor, new entity(), EApiFunctionType.GET_MANY, EApiSubscriberOnType.AFTER, executionContext);
		// eslint-disable-next-line @elsikora/typescript/prefer-nullish-coalescing -- Direct calls preserve the existing truthy replacement contract.
		const finalItems: Array<E> = generatedProperties ? (afterResult ?? items) : afterResult || items;

		if (protectedOrderFields && protectedResultSignature) {
			ApiControllerGetListCursorRuntime.assertItemsInvariant(finalItems, protectedOrderFields, protectedResultSignature);

			return ApiControllerGetListCursorRuntime.isolateItems(finalItems, protectedOrderFields);
		}

		return finalItems;
	} catch (caughtError) {
		const entityInstance: E = new entity();

		const errorExecutionContext: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>> = {
			DATA: { eventManager, properties, repository },
			ENTITY: entityInstance,
			FUNCTION_TYPE: EApiFunctionType.GET_MANY,
		};

		let error: unknown = caughtError;

		if (DatabaseTypeOrmIsEntityNotFound(caughtError)) {
			error = new NotFoundException(ErrorString({ entity, type: EErrorStringAction.NOT_FOUND }), { cause: caughtError });
		}

		if (DatabaseTypeOrmIsEntityMetadataNotFound(caughtError)) {
			error = new InternalServerErrorException(ErrorString({ entity, type: EErrorStringAction.DATABASE_ERROR }), { cause: caughtError });
		}

		if (error instanceof HttpException) {
			await ApiSubscriberExecutor.executeFunctionErrorSubscribers(constructor, entityInstance, EApiFunctionType.GET_MANY, EApiSubscriberOnType.AFTER_ERROR, errorExecutionContext, error);

			throw error;
		}

		LoggerUtility.getLogger("ApiFunctionGetMany").verbose(`Error fetching multiple entity ${entity.name}: ${FormatErrorEvidenceForLog(error)}`);
		await ApiSubscriberExecutor.executeFunctionErrorSubscribers(constructor, entityInstance, EApiFunctionType.GET_MANY, EApiSubscriberOnType.AFTER_ERROR, errorExecutionContext, error as Error);

		throw new InternalServerErrorException(
			ErrorString({
				entity,
				type: EErrorStringAction.FETCHING_ERROR,
			}),
			{ cause: caughtError },
		);
	}
}
