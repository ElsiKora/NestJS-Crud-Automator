import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunctionErrorExecutionContext } from "@interface/class/api/subscriber/function/error-execution-context.interface";
import type { IApiSubscriberFunctionExecutionContext } from "@interface/class/api/subscriber/function/execution/context";
import type { IApiSubscriberFunctionExecutionContextData } from "@interface/class/api/subscriber/function/execution/context/data.interface";
import type { IApiFunctionProperties, IApiFunctionUpdateExecutorProperties } from "@interface/decorator/api/function";
import type { TApiAuthorizationScopeWhere } from "@type/class/api/authorization/scope-where.type";
import type { TApiSubscriberFunctionBeforeUpdateContext } from "@type/class/api/subscriber/function/before/update-context.type";
import type { TApiFunctionGetProperties, TApiFunctionUpdateCriteria, TApiFunctionUpdateProperties } from "@type/decorator/api/function";
import type { DeepPartial, EntityManager, Repository } from "typeorm";

import { types as utilityTypes } from "node:util";

import { ApiControllerGeneratedFunctionCapability } from "@class/api/controller/generated/function-capability.class";
import { ApiControllerGeneratedReadScopeStorage } from "@class/api/controller/generated/read-scope-storage.class";
import { ApiFunctionContextStorage } from "@class/api/function/context-storage.class";
import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { ApiFunctionGet } from "@decorator/api/function/get/decorator";
import { EApiFunctionTransactionMode, EApiFunctionType, EApiSubscriberOnType } from "@enum/decorator/api";
import { EErrorStringAction } from "@enum/utility";
import { EApiExceptionDetailsType } from "@enum/utility/exception-details-type.enum";
import { BadRequestException, ConflictException, HttpException, HttpStatus, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { ApiFunctionExecuteWithTransaction } from "@utility/api/function-transaction.utility";
import { DatabaseTypeOrmGetForeignKeyViolationDetails } from "@utility/database/typeorm/get/foreign-key-violation-details.utility";
import { DatabaseTypeOrmGetUniqueViolationDetails } from "@utility/database/typeorm/get/unique-violation-details.utility";
import { DatabaseTypeOrmIsEntityMetadataNotFound } from "@utility/database/typeorm/is/entity/metadata-not-found.utility";
import { DatabaseTypeOrmIsEntityNotFound } from "@utility/database/typeorm/is/entity/not-found.utility";
import { DatabaseTypeOrmIsForeignKeyViolation } from "@utility/database/typeorm/is/foreign-key-violation.utility";
import { DatabaseTypeOrmIsUniqueViolation } from "@utility/database/typeorm/is/unique-violation.utility";
import { FormatErrorEvidenceForLog } from "@utility/error/evidence-for-log.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { ErrorString } from "@utility/error/string.utility";
import { LoggerUtility } from "@utility/logger.utility";

/**
 * Creates a decorator that adds entity update functionality to a service method
 * @template E The entity type
 * @param {IApiFunctionProperties<E>} properties - Configuration properties for the update function
 * @returns {(target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor} A decorator function that modifies the target method to handle entity updates
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/api-reference/decorators/api-function/api-function-update | API Reference - ApiFunctionUpdate}
 */
export function ApiFunctionUpdate<E extends IApiBaseEntity>(properties: IApiFunctionProperties<E>): (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor {
	const { entity }: IApiFunctionProperties<E> = properties;
	const transactionMode: EApiFunctionTransactionMode = properties.transaction?.mode ?? EApiFunctionTransactionMode.SUPPORTS;
	const getDecorator: (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor = ApiFunctionGet<E>({ entity, transaction: properties.transaction });
	let getFunction: ((this: { repository: Repository<E> }, properties: TApiFunctionGetProperties<E>) => Promise<E>) | undefined;

	return function (_target: unknown, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
		descriptor.value = async function (this: { repository: Repository<E> }, criteria: TApiFunctionUpdateCriteria<E>, updateProperties: TApiFunctionUpdateProperties<E>): Promise<E> {
			const mandatoryWhere: TApiAuthorizationScopeWhere<E> | undefined = ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.UPDATE, criteria);
			const normalizedUpdateProperties: TApiFunctionUpdateProperties<E> = normalizeUpdateProperties(updateProperties);

			return await ApiFunctionExecuteWithTransaction({
				callback: async (eventManager: EntityManager | undefined): Promise<E> => {
					const entityInstance: E = new entity();
					const repository: Repository<E> = eventManager ? eventManager.getRepository<E>(entity) : this.repository;

					if (!repository) {
						const errorExecutionContext: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>> = {
							DATA: { criteria, eventManager, repository },
							ENTITY: entityInstance,
							FUNCTION_TYPE: EApiFunctionType.UPDATE,
						};

						await ApiSubscriberExecutor.executeFunctionErrorSubscribers(this.constructor as new (...arguments_: Array<unknown>) => unknown, entityInstance, EApiFunctionType.UPDATE, EApiSubscriberOnType.BEFORE_ERROR, errorExecutionContext, ErrorException("Repository is not available in this context"));

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

					let existingEntity: E;

					try {
						existingEntity = await executeProtectedGet(this, getFunction, criteria, mandatoryWhere);
					} catch (caughtError) {
						const errorExecutionContext: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>> = {
							DATA: { criteria, eventManager, properties: normalizedUpdateProperties, repository },
							ENTITY: entityInstance,
							FUNCTION_TYPE: EApiFunctionType.UPDATE,
						};

						await ApiSubscriberExecutor.executeFunctionErrorSubscribers(this.constructor as new (...arguments_: Array<unknown>) => unknown, entityInstance, EApiFunctionType.UPDATE, EApiSubscriberOnType.AFTER_ERROR, errorExecutionContext, caughtError as Error);

						throw caughtError;
					}

					const currentEntity: Readonly<E> = Object.freeze({ ...existingEntity });

					const executionContext: TApiSubscriberFunctionBeforeUpdateContext<E> = {
						DATA: { criteria, currentEntity, eventManager, repository },
						ENTITY: entityInstance,
						FUNCTION_TYPE: EApiFunctionType.UPDATE,
						result: normalizedUpdateProperties,
					};

					const result: TApiFunctionUpdateProperties<E> | undefined = await ApiSubscriberExecutor.executeFunctionBeforeSubscribers(this.constructor as new (...arguments_: Array<unknown>) => unknown, entityInstance, EApiFunctionType.UPDATE, executionContext);

					if (result) {
						executionContext.result = result;
					}

					const executorProperties: TApiFunctionUpdateProperties<E> = normalizeUpdateProperties(executionContext.result ?? ({} as unknown as TApiFunctionUpdateProperties<E>));

					return await executor<E>({ constructor: this.constructor as new (...arguments_: Array<unknown>) => unknown, criteria, entity, existingEntity, properties: executorProperties, repository });
				},
				entity,
				functionType: EApiFunctionType.UPDATE,
				methodName: propertyKey,
				mode: transactionMode,
				onPreflightError: async (eventManager: EntityManager | undefined, error: Error): Promise<void> => {
					const entityInstance: E = new entity();
					const repository: Repository<E> = eventManager ? eventManager.getRepository<E>(entity) : this.repository;

					const errorExecutionContext: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>> = {
						DATA: { criteria, eventManager, repository },
						ENTITY: entityInstance,
						FUNCTION_TYPE: EApiFunctionType.UPDATE,
					};

					await ApiSubscriberExecutor.executeFunctionErrorSubscribers(this.constructor as new (...arguments_: Array<unknown>) => unknown, entityInstance, EApiFunctionType.UPDATE, EApiSubscriberOnType.BEFORE_ERROR, errorExecutionContext, error);
				},
				repository: this.repository,
				serviceConstructor: this.constructor as new (...arguments_: Array<unknown>) => unknown,
			});
		};

		ApiControllerGeneratedFunctionCapability.mark(descriptor.value, EApiFunctionType.UPDATE, entity);

		return descriptor;
	};
}

/**
 * Loads the generated update target through the protected decorated GET lifecycle.
 * @template E The entity type
 * @param {object} service - Service that owns the decorated GET implementation
 * @param {Repository<E>} service.repository - Entity repository
 * @param {(properties: TApiFunctionGetProperties<E>) => Promise<E>} getFunction - Decorated GET implementation
 * @param {TApiFunctionUpdateCriteria<E>} criteria - Update criteria passed to the generated service function
 * @param {TApiAuthorizationScopeWhere<E>} [mandatoryWhere] - Generated route scope that the internal GET must preserve
 * @returns {Promise<E>} The entity loaded within the generated route scope
 */
async function executeProtectedGet<E extends IApiBaseEntity>(service: { repository: Repository<E> }, getFunction: (this: { repository: Repository<E> }, properties: TApiFunctionGetProperties<E>) => Promise<E>, criteria: TApiFunctionUpdateCriteria<E>, mandatoryWhere?: TApiAuthorizationScopeWhere<E>): Promise<E> {
	const getProperties: TApiFunctionGetProperties<E> = { where: criteria };

	return mandatoryWhere ? await ApiControllerGeneratedReadScopeStorage.runWriteHydration(getProperties, mandatoryWhere, async (): Promise<E> => await Reflect.apply(getFunction, service, [getProperties])) : await Reflect.apply(getFunction, service, [getProperties]);
}

/**
 * Executes the entity update operation with error handling
 * @template E The entity type
 * @param {IApiFunctionUpdateExecutorProperties<E>} options - Properties required for entity update
 * @returns {Promise<E>} The updated entity instance
 * @throws {InternalServerErrorException} If the update operation fails
 */
async function executor<E extends IApiBaseEntity>(options: IApiFunctionUpdateExecutorProperties<E>): Promise<E> {
	const { constructor, criteria, entity, existingEntity, properties, repository }: IApiFunctionUpdateExecutorProperties<E> = options;
	const eventManager: EntityManager | undefined = ApiFunctionContextStorage.getEventManager();

	try {
		const updatedProperties: Partial<E> = {};
		const typedEntries: Array<[keyof E, E[keyof E]]> = Object.entries(properties) as Array<[keyof E, E[keyof E]]>;

		for (const [key, value] of typedEntries) {
			if (key in existingEntity) {
				updatedProperties[key] = value;
			}
		}

		const mergedEntity: DeepPartial<E> = { ...existingEntity, ...updatedProperties };

		const result: E = await repository.save(mergedEntity);

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
	} catch (caughtError) {
		const entityInstance: E = new entity();

		const errorExecutionContext: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>> = {
			DATA: { criteria, eventManager, properties, repository },
			ENTITY: entityInstance,
			FUNCTION_TYPE: EApiFunctionType.UPDATE,
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
			const message: string = ErrorString({ entity, type: EErrorStringAction.DUPLICATE_KEY });
			const detailsBase: ReturnType<typeof DatabaseTypeOrmGetUniqueViolationDetails> = DatabaseTypeOrmGetUniqueViolationDetails(caughtError);
			const details: object = detailsBase ? { ...detailsBase, type: EApiExceptionDetailsType.UNIQUE_VIOLATION } : { type: EApiExceptionDetailsType.UNIQUE_VIOLATION };
			error = new ConflictException({ details, error: "Conflict", message, statusCode: HttpStatus.CONFLICT }, { cause: caughtError });
		}

		if (error instanceof HttpException) {
			await ApiSubscriberExecutor.executeFunctionErrorSubscribers(constructor, entityInstance, EApiFunctionType.UPDATE, EApiSubscriberOnType.AFTER_ERROR, errorExecutionContext, error);

			throw error;
		}

		LoggerUtility.getLogger("ApiFunctionUpdate").verbose(`Error updating entity ${entity.name}: ${FormatErrorEvidenceForLog(error)}`);
		await ApiSubscriberExecutor.executeFunctionErrorSubscribers(constructor, entityInstance, EApiFunctionType.UPDATE, EApiSubscriberOnType.AFTER_ERROR, errorExecutionContext, error as Error);

		throw new InternalServerErrorException(
			ErrorString({
				entity: entity,
				type: EErrorStringAction.UPDATING_ERROR,
			}),
			{ cause: caughtError },
		);
	}
}

/**
 * Treats enumerable own properties with an undefined value as omitted update fields.
 * Returns the original patch when no normalization is needed so subscriber identity remains stable.
 * @template E The entity type
 * @param {TApiFunctionUpdateProperties<E>} properties - Update patch to normalize
 * @returns {TApiFunctionUpdateProperties<E>} The original patch or a shallow normalized copy
 */
function normalizeUpdateProperties<E>(properties: TApiFunctionUpdateProperties<E>): TApiFunctionUpdateProperties<E> {
	const propertiesCandidate: unknown = properties;

	if (typeof propertiesCandidate !== "object" || propertiesCandidate === null || utilityTypes.isProxy(propertiesCandidate) || Array.isArray(propertiesCandidate)) {
		return properties;
	}

	const descriptors: Record<PropertyKey, PropertyDescriptor> = Object.getOwnPropertyDescriptors(propertiesCandidate);
	const keys: Array<PropertyKey> = Reflect.ownKeys(descriptors);

	const hasEnumerableUndefinedField: boolean = keys.some((key: PropertyKey): boolean => {
		const descriptor: PropertyDescriptor | undefined = descriptors[key];

		return typeof key === "string" && descriptor?.enumerable === true && "value" in descriptor && descriptor.value === undefined;
	});

	if (!hasEnumerableUndefinedField) {
		return properties;
	}

	const normalizedProperties: object = Object.create(Object.getPrototypeOf(propertiesCandidate) as null | object) as object;

	for (const key of keys) {
		const descriptor: PropertyDescriptor | undefined = descriptors[key];

		if (!descriptor || (typeof key === "string" && descriptor.enumerable && "value" in descriptor && descriptor.value === undefined)) {
			continue;
		}

		Object.defineProperty(normalizedProperties, key, descriptor);
	}

	return normalizedProperties as TApiFunctionUpdateProperties<E>;
}
