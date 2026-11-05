import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunctionErrorExecutionContext } from "@interface/class/api/subscriber/function/error-execution-context.interface";
import type { IApiSubscriberFunctionExecutionContext } from "@interface/class/api/subscriber/function/execution/context";
import type { IApiSubscriberFunctionExecutionContextData } from "@interface/class/api/subscriber/function/execution/context/data.interface";
import type { IApiFunctionUpdateExecutorProperties, IApiFunctionUpdateProperties } from "@interface/decorator/api/function";
import type { TApiAuthorizationScopeWhere } from "@type/class/api/authorization/scope-where.type";
import type { TApiSubscriberFunctionBeforeUpdateContext } from "@type/class/api/subscriber/function/before/update-context.type";
import type { TApiFunctionGetProperties, TApiFunctionUpdateCriteria, TApiFunctionUpdateProperties } from "@type/decorator/api/function";
import type { TTypeOrmColumnMetadata } from "@type/utility/typeorm";
import type { DeepPartial, EntityManager, EntityMetadata, ObjectLiteral, QueryDeepPartialEntity, RelationMetadata, Repository, UpdateResult } from "typeorm";

import { isDeepStrictEqual, types as utilityTypes } from "node:util";

import { ApiControllerGeneratedFunctionCapability } from "@class/api/controller/generated/function-capability.class";
import { ApiControllerGeneratedReadScopeStorage } from "@class/api/controller/generated/read-scope-storage.class";
import { ApiControllerGeneratedScopeWhereContract } from "@class/api/controller/generated/scope-where-contract.class";
import { ApiControllerGeneratedSecuritySnapshot } from "@class/api/controller/generated/security-snapshot.class";
import { ApiFunctionContextStorage } from "@class/api/function/context-storage.class";
import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { ApiFunctionGet } from "@decorator/api/function/get/decorator";
import { EApiFunctionTransactionMode, EApiFunctionType, EApiSubscriberOnType } from "@enum/decorator/api";
import { EApiFunctionUpdatePersistenceMode } from "@enum/decorator/api/function/update-persistence-mode.enum";
import { EErrorStringAction } from "@enum/utility";
import { EApiExceptionDetailsType } from "@enum/utility/exception-details-type.enum";
import { BadRequestException, HttpException, HttpStatus, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { ApiFunctionExecuteWithTransaction } from "@utility/api/function-transaction.utility";
import { AuthorizationScopeMergeWhere } from "@utility/authorization/scope-merge-where.utility";
import { DatabaseTypeOrmAssertRequiredWhere } from "@utility/database/typeorm/assert/required-where.utility";
import { DatabaseTypeOrmGetForeignKeyViolationDetails } from "@utility/database/typeorm/get/foreign-key-violation-details.utility";
import { DatabaseTypeOrmIsEntityMetadataNotFound } from "@utility/database/typeorm/is/entity/metadata-not-found.utility";
import { DatabaseTypeOrmIsEntityNotFound } from "@utility/database/typeorm/is/entity/not-found.utility";
import { DatabaseTypeOrmIsForeignKeyViolation } from "@utility/database/typeorm/is/foreign-key-violation.utility";
import { DatabaseTypeOrmIsUniqueViolation } from "@utility/database/typeorm/is/unique-violation.utility";
import { ErrorDuplicateKeyException } from "@utility/error/duplicate-key-exception.utility";
import { FormatErrorEvidenceForLog } from "@utility/error/evidence-for-log.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { ErrorString } from "@utility/error/string.utility";
import { LoggerUtility } from "@utility/logger.utility";
import { InstanceChecker, IsNull } from "typeorm";

/**
 * Creates a decorator that adds entity update functionality to a service method
 * @template E The entity type
 * @param {IApiFunctionUpdateProperties<E>} properties - Configuration properties for the update function
 * @returns {(target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor} A decorator function that modifies the target method to handle entity updates
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/api-reference/decorators/api-function/api-function-update | API Reference - ApiFunctionUpdate}
 */
export function ApiFunctionUpdate<E extends IApiBaseEntity>(properties: IApiFunctionUpdateProperties<E>): (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor {
	const { entity }: IApiFunctionUpdateProperties<E> = properties;
	const persistenceMode: EApiFunctionUpdatePersistenceMode = properties.persistenceMode ?? EApiFunctionUpdatePersistenceMode.SAVE;
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
					let patch: IApiFunctionUpdateExecutorProperties<E>["patch"];
					let protectedCriteria: TApiFunctionUpdateCriteria<E> = criteria;
					let protectedWhere: TApiAuthorizationScopeWhere<E> | undefined = mandatoryWhere;
					let identity: TApiFunctionUpdateCriteria<E> | undefined;

					try {
						if (persistenceMode !== EApiFunctionUpdatePersistenceMode.SAVE && persistenceMode !== EApiFunctionUpdatePersistenceMode.PATCH) {
							throw new BadRequestException("Unknown UPDATE persistence mode");
						}

						if (persistenceMode === EApiFunctionUpdatePersistenceMode.PATCH) {
							if (transactionMode !== EApiFunctionTransactionMode.REQUIRED && transactionMode !== EApiFunctionTransactionMode.MANDATORY) {
								throw new BadRequestException("PATCH requires an explicit REQUIRED or MANDATORY transaction");
							}

							assertPatchDataGraph(criteria, true);
							protectedCriteria = ApiControllerGeneratedSecuritySnapshot.detach(criteria);
							identity = readPatchIdentity(repository, protectedCriteria);
							protectedWhere = ApiControllerGeneratedScopeWhereContract.merge(protectedCriteria, ApiControllerGeneratedSecuritySnapshot.detach(mandatoryWhere));
						}
					} catch (caughtError) {
						await ApiSubscriberExecutor.executeFunctionErrorSubscribers(
							this.constructor as new (...arguments_: Array<unknown>) => unknown,
							entityInstance,
							EApiFunctionType.UPDATE,
							EApiSubscriberOnType.BEFORE_ERROR,
							{
								DATA: { criteria, eventManager, repository },
								ENTITY: entityInstance,
								FUNCTION_TYPE: EApiFunctionType.UPDATE,
							},
							caughtError as Error,
						);

						throw caughtError;
					}

					try {
						const captures: Array<NonNullable<IApiFunctionUpdateExecutorProperties<E>["patch"]>> = [];
						existingEntity = await executeProtectedGet(this, getFunction, protectedCriteria, protectedWhere, identity ? createPatchReadCapture(repository, identity, captures) : undefined);
						patch = captures[0];

						if (identity && !patch) throw new BadRequestException("PATCH read properties were not captured");

						if (patch) readPatchValues(repository, patch.selectedColumns, normalizedUpdateProperties);
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

					return await executor<E>({ constructor: this.constructor as new (...arguments_: Array<unknown>) => unknown, criteria, entity, existingEntity, patch, properties: executorProperties, repository });
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

		ApiControllerGeneratedFunctionCapability.mark(descriptor.value, EApiFunctionType.UPDATE, entity, transactionMode);

		return descriptor;
	};
}

/**
 * Rejects executable PATCH data before the existing snapshot owner detaches it.
 * @param {unknown} value - PATCH data or original criteria.
 * @param {boolean} isCriteria - Whether native WHERE operator identities are allowed.
 * @param {WeakSet<object>} visited - Already inspected containers.
 */
function assertPatchDataGraph(value: unknown, isCriteria: boolean = false, visited: WeakSet<object> = new WeakSet<object>()): void {
	if (utilityTypes.isProxy(value)) throw new BadRequestException("PATCH data cannot contain proxies");

	if (typeof value === "function") {
		if (!isCriteria) throw new BadRequestException("PATCH data cannot contain executable values");

		return;
	}

	if (value === null || typeof value !== "object" || visited.has(value)) return;
	visited.add(value);

	if (value instanceof Date || value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return;
	const prototype: null | object = Object.getPrototypeOf(value) as null | object;

	if (!Array.isArray(value) && prototype !== null && prototype !== Object.prototype && !(isCriteria && InstanceChecker.isFindOperator(value))) throw new BadRequestException("PATCH data must contain plain data containers");

	for (const key of Reflect.ownKeys(value)) {
		if (Array.isArray(value) && key === "length") continue;
		const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(value, key);

		if (typeof key !== "string" || !descriptor?.enumerable || !("value" in descriptor)) throw new BadRequestException("PATCH data must contain enumerable data properties only");
		assertPatchDataGraph(descriptor.value, isCriteria, visited);
	}
}

/**
 * Captures the one protected GET selection used by a PATCH executor.
 * @template E Entity type.
 * @param {Repository<E>} repository - Native metadata owner.
 * @param {TApiFunctionUpdateCriteria<E>} identity - Immutable original primary tuple.
 * @param {Array<NonNullable<IApiFunctionUpdateExecutorProperties<E>["patch"]>>} captures - This invocation's private capture slot.
 * @returns {(properties: TApiFunctionGetProperties<E>) => void} Once-only effective read observer.
 */
function createPatchReadCapture<E extends IApiBaseEntity>(repository: Repository<E>, identity: TApiFunctionUpdateCriteria<E>, captures: Array<NonNullable<IApiFunctionUpdateExecutorProperties<E>["patch"]>>): (properties: TApiFunctionGetProperties<E>) => void {
	return (properties: TApiFunctionGetProperties<E>): void => {
		if (captures.length > 0) throw new BadRequestException("PATCH read properties must be captured exactly once");
		const selectedColumns: ReadonlySet<string> = readPatchSelectedColumns(repository, properties);

		if (!isDeepStrictEqual(readPatchIdentity(repository, properties.where), identity)) throw new BadRequestException("PATCH read scope changed its primary identity");
		captures.push({ identity, readProperties: ApiControllerGeneratedSecuritySnapshot.detach(properties), selectedColumns });
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
 * @param {(properties: TApiFunctionGetProperties<E>) => void} [capture] - PATCH-only capture of the effective protected read
 * @returns {Promise<E>} The entity loaded within the generated route scope
 */
async function executeProtectedGet<E extends IApiBaseEntity>(service: { repository: Repository<E> }, getFunction: (this: { repository: Repository<E> }, properties: TApiFunctionGetProperties<E>) => Promise<E>, criteria: TApiFunctionUpdateCriteria<E>, mandatoryWhere?: TApiAuthorizationScopeWhere<E>, capture?: (properties: TApiFunctionGetProperties<E>) => void): Promise<E> {
	const getProperties: TApiFunctionGetProperties<E> = { where: criteria };

	return mandatoryWhere ? await ApiControllerGeneratedReadScopeStorage.runWriteHydration(getProperties, mandatoryWhere, async (): Promise<E> => await Reflect.apply(getFunction, service, [getProperties]), capture) : await Reflect.apply(getFunction, service, [getProperties]);
}

/**
 * Executes the entity update operation with error handling
 * @template E The entity type
 * @param {IApiFunctionUpdateExecutorProperties<E>} options - Properties required for entity update
 * @returns {Promise<E>} The updated entity instance
 * @throws {InternalServerErrorException} If the update operation fails
 */
async function executor<E extends IApiBaseEntity>(options: IApiFunctionUpdateExecutorProperties<E>): Promise<E> {
	const { constructor, criteria, entity, existingEntity, patch, properties, repository }: IApiFunctionUpdateExecutorProperties<E> = options;
	const eventManager: EntityManager | undefined = ApiFunctionContextStorage.getEventManager();

	try {
		let result: E;

		if (patch) {
			const values: TApiFunctionUpdateProperties<E> = readPatchValues(repository, patch.selectedColumns, properties);
			let where: TApiAuthorizationScopeWhere<E> = ApiControllerGeneratedScopeWhereContract.merge(patch.readProperties.where, AuthorizationScopeMergeWhere(undefined, patch.identity));

			if (patch.readProperties.withDeleted !== true && repository.metadata.deleteDateColumn) {
				where = AuthorizationScopeMergeWhere(where, { [repository.metadata.deleteDateColumn.propertyName]: IsNull() } as TApiFunctionUpdateCriteria<E>);
			}
			DatabaseTypeOrmAssertRequiredWhere(where);
			const hasValues: boolean = Object.keys(values).length > 0;

			if (hasValues) {
				const updateResult: UpdateResult = await repository
					.createQueryBuilder()
					.update()
					.set(values as QueryDeepPartialEntity<E>)
					.where(where)
					.execute();

				if (updateResult.affected === 0) throw new NotFoundException(ErrorString({ entity, type: EErrorStringAction.NOT_FOUND }));

				if (updateResult.affected !== 1) throw new InternalServerErrorException("PATCH must affect exactly one row");
			}

			const reloadProperties: TApiFunctionGetProperties<E> = {
				...patch.readProperties,
				// eslint-disable-next-line @elsikora/typescript/naming-convention -- TypeORM owns this fixed FindOneOptions field.
				cache: false,
				// eslint-disable-next-line @elsikora/typescript/naming-convention -- TypeORM owns this fixed FindOneOptions field.
				loadEagerRelations: false,
				where: hasValues ? patch.identity : where,
			};
			DatabaseTypeOrmAssertRequiredWhere(reloadProperties.where);
			result = await repository.findOneOrFail(reloadProperties);
		} else {
			const ownedRelations: ReadonlyArray<RelationMetadata> = readOwnedToOneRelations(repository);
			const updatedProperties: Partial<E> = {};
			const typedEntries: Array<[keyof E, E[keyof E]]> = Object.entries(properties) as Array<[keyof E, E[keyof E]]>;

			for (const [key, value] of typedEntries) {
				// A relation the read did not load, compiled without its class field, is still one the save can write.
				if (key in existingEntity || ownedRelations.some((relation: RelationMetadata): boolean => relation.propertyPath === String(key))) {
					updatedProperties[key] = value;
				}
			}

			const mergedEntity: DeepPartial<E> = { ...existingEntity, ...updatedProperties };
			const leavingRelations: ReadonlyArray<RelationMetadata> = readLoadableRelations(repository).filter((relation: RelationMetadata): boolean => isLoadedRelationLeavingSave(relation, mergedEntity, existingEntity, updatedProperties));

			for (const relation of leavingRelations) {
				removeRelationFromSave(relation, mergedEntity);
			}

			result = await repository.save(mergedEntity);

			for (const relation of leavingRelations) {
				relation.setEntityValue(result, isRelationKeyMoved(relation, existingEntity, updatedProperties) ? readRelationReference(relation, result, existingEntity) : relation.getEntityValue(existingEntity));
			}
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

		// SQLite reports a foreign key failure under the constraint code the unique check also reads, so the foreign key answer has to come first.
		if (DatabaseTypeOrmIsUniqueViolation(caughtError) && !DatabaseTypeOrmIsForeignKeyViolation(caughtError)) {
			error = ErrorDuplicateKeyException(entity, caughtError);
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
 * Tells whether a relation the read loaded has to leave the save. The save writes only the relations the update names: one it does not name stays as the database holds it.
 * The read leaves out a soft deleted related row, so a loaded relation can miss what the row stores: a `null` where the key holds a value, a list without a soft deleted item. The save would write that as a cleared key, a removed link, or a cascaded related row that clears its own key. Without the relation the save writes none of it, so the stored value stays, whatever it holds, and no read of the stored key is needed.
 * A relation in the primary key of the row that loaded a row stays, because the save identifies the row through it, unless the update moves its other join columns.
 * @template E The entity type
 * @param {RelationMetadata} relation - Relation of the entity.
 * @param {E} mergedEntity - The row as the save would receive it.
 * @param {E} existingEntity - The row as the read loaded it.
 * @param {Partial<E>} updatedProperties - The update.
 * @returns {boolean} Whether the loaded relation has to leave the save.
 */
function isLoadedRelationLeavingSave<E extends IApiBaseEntity>(relation: RelationMetadata, mergedEntity: E, existingEntity: E, updatedProperties: Partial<E>): boolean {
	const loadedRelation: unknown = relation.getEntityValue(mergedEntity);

	if (loadedRelation === undefined || relation.getEntityValue(updatedProperties) !== undefined) {
		return false;
	}

	return loadedRelation === null || !isOwnedToOneRelation(relation) || !relation.joinColumns.some((column: TTypeOrmColumnMetadata): boolean => column.isPrimary) || isRelationKeyMoved(relation, existingEntity, updatedProperties);
}

/**
 * Tells whether the join columns of a relation live in the row of the entity: a many-to-one or the owning side of a one-to-one. The join columns of a many-to-many live in its link table.
 * @param {RelationMetadata} relation - Relation of the entity.
 * @returns {boolean} Whether the row owns the relation.
 */
function isOwnedToOneRelation(relation: RelationMetadata): boolean {
	return relation.isManyToOne || relation.isOneToOneOwner;
}

/**
 * Tells whether the update gives the join columns of an owned to-one relation another value than the read loaded. A join column in the primary key does not count, because the save would read it as the key of another row.
 * @template E The entity type
 * @param {RelationMetadata} relation - Owning to-one relation.
 * @param {E} existingEntity - The row as the read loaded it.
 * @param {Partial<E>} updatedProperties - The update.
 * @returns {boolean} Whether the update moves the relation.
 */
function isRelationKeyMoved<E extends IApiBaseEntity>(relation: RelationMetadata, existingEntity: E, updatedProperties: Partial<E>): boolean {
	if (!isOwnedToOneRelation(relation)) {
		return false;
	}

	const movedColumns: Array<TTypeOrmColumnMetadata> = relation.joinColumns.filter((column: TTypeOrmColumnMetadata): boolean => {
		const value: unknown = column.getEntityValue(updatedProperties);

		return value !== undefined && !isDeepStrictEqual(value, column.getEntityValue(existingEntity));
	});

	return movedColumns.length > 0 && movedColumns.every((column: TTypeOrmColumnMetadata): boolean => !column.isPrimary && column.isUpdate);
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

/**
 * Reads the relations a read of the entity can load, on a table inheritance root those of its children too, inside an embedded column as well. A lazy relation stays out, because a read of the update never loads it.
 * @template E The entity type
 * @param {Repository<E>} repository - Native metadata owner.
 * @returns {ReadonlyArray<RelationMetadata>} The relations.
 */
function readLoadableRelations<E extends IApiBaseEntity>(repository: Repository<E>): ReadonlyArray<RelationMetadata> {
	// A repository test double may carry no metadata; it has no relations to read then.
	const relations: ReadonlyArray<RelationMetadata> = (repository.metadata as EntityMetadata | undefined)?.relations ?? [];

	return relations.filter((relation: RelationMetadata): boolean => !relation.isLazy);
}

/**
 * Reads the loadable to-one relations whose join columns live in the row of the entity.
 * @template E The entity type
 * @param {Repository<E>} repository - Native metadata owner.
 * @returns {ReadonlyArray<RelationMetadata>} The relations.
 */
function readOwnedToOneRelations<E extends IApiBaseEntity>(repository: Repository<E>): ReadonlyArray<RelationMetadata> {
	return readLoadableRelations(repository).filter((relation: RelationMetadata): boolean => isOwnedToOneRelation(relation));
}

/**
 * Extracts a literal equality implied by a primary-column predicate.
 * @param {unknown} value - Native literal or WHERE operator.
 * @returns {unknown} Exact equality value, or undefined when no equality is proven.
 */
function readPatchEquality(value: unknown): unknown {
	if (InstanceChecker.isFindOperator(value)) {
		if (value.type === "equal") return readPatchEquality(value.value);

		if (value.type !== "and" || !Array.isArray(value.value)) return undefined;
		const equalities: Array<unknown> = (value.value as Array<unknown>).map((item: unknown): unknown => readPatchEquality(item)).filter((item: unknown): boolean => item !== undefined);

		if (equalities.some((item: unknown): boolean => !isDeepStrictEqual(item, equalities[0]))) throw new BadRequestException("PATCH primary equality is ambiguous");

		return equalities[0];
	}

	if (value === null || value === undefined) return undefined;

	if (typeof value === "number") return Number.isFinite(value) ? value : undefined;

	return ["bigint", "boolean", "string"].includes(typeof value) || value instanceof Date || ArrayBuffer.isView(value) ? value : undefined;
}

/**
 * Pins one complete direct primary tuple shared by every original OR branch.
 * @template E Entity type.
 * @param {Repository<E>} repository - Native transaction-bound repository.
 * @param {TApiAuthorizationScopeWhere<E>} where - Detached native WHERE.
 * @returns {TApiFunctionUpdateCriteria<E>} Exact primary tuple.
 */
function readPatchIdentity<E extends IApiBaseEntity>(repository: Repository<E>, where: TApiAuthorizationScopeWhere<E>): TApiFunctionUpdateCriteria<E> {
	assertPatchDataGraph(where, true);
	const normalized: TApiAuthorizationScopeWhere<E> = AuthorizationScopeMergeWhere(undefined, where);
	const branches: Array<unknown> = Array.isArray(normalized) ? normalized : [normalized];
	const columns: Array<TTypeOrmColumnMetadata> = repository.metadata.primaryColumns;

	if (columns.length === 0 || columns.some((column: TTypeOrmColumnMetadata): boolean => Boolean(column.embeddedMetadata) || column.propertyPath !== column.propertyName || column.isVirtual || column.isVirtualProperty)) throw new BadRequestException("PATCH requires a complete direct primary identity");
	let identity: Record<string, unknown> | undefined;

	for (const branch of branches) {
		if (!branch || typeof branch !== "object") throw new BadRequestException("PATCH requires a complete primary equality in every branch");
		const tupleEntries: Array<[string, unknown]> = [];

		for (const column of columns) {
			const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(branch, column.propertyName);
			const value: unknown = descriptor && "value" in descriptor ? readPatchEquality(descriptor.value) : undefined;

			if (value === undefined) throw new BadRequestException("PATCH requires a complete primary equality in every branch");
			tupleEntries.push([column.propertyName, value]);
		}

		const tuple: Record<string, unknown> = Object.fromEntries(tupleEntries);

		if (identity && !isDeepStrictEqual(identity, tuple)) throw new BadRequestException("PATCH primary identity differs between branches");
		identity = tuple;
	}

	return ApiControllerGeneratedSecuritySnapshot.detach(identity) as TApiFunctionUpdateCriteria<E>;
}

/**
 * Reads the actual GET projection and admits only flat native hydration.
 * @template E Entity type.
 * @param {Repository<E>} repository - Native repository metadata owner.
 * @param {TApiFunctionGetProperties<E>} properties - Captured effective GET options.
 * @returns {ReadonlySet<string>} Direct selected physical column names.
 */
function readPatchSelectedColumns<E extends IApiBaseEntity>(repository: Repository<E>, properties: TApiFunctionGetProperties<E>): ReadonlySet<string> {
	assertPatchDataGraph(properties, true);
	const metadata: EntityMetadata = repository.metadata;

	if (properties.lock || Object.getOwnPropertyDescriptor(properties, "join")?.value || properties.loadRelationIds || (properties.relations && Object.keys(properties.relations).length > 0) || metadata.relations.some((relation: RelationMetadata): boolean => relation.isLazy || (relation.isEager && properties.loadEagerRelations !== false))) throw new BadRequestException("PATCH requires flat hydration without relation loads or initial row locks");
	const columns: Array<TTypeOrmColumnMetadata> = metadata.columns.filter((column: TTypeOrmColumnMetadata): boolean => !column.embeddedMetadata && !column.isVirtual && !column.isVirtualProperty && column.propertyPath === column.propertyName);
	const selected: Set<string> = new Set<string>();
	const selection: unknown = properties.select;

	if (selection === undefined) {
		if (metadata.columns.some((column: TTypeOrmColumnMetadata): boolean => Boolean(column.embeddedMetadata) && column.isSelect)) throw new BadRequestException("PATCH default selection must not hydrate embedded columns");

		for (const column of columns) if (column.isSelect) selected.add(column.propertyName);
	} else if (Array.isArray(selection)) {
		for (const key of selection) {
			if (typeof key !== "string" || !columns.some((column: TTypeOrmColumnMetadata): boolean => column.propertyName === key)) throw new BadRequestException("PATCH select must name direct physical columns");
			selected.add(key);
		}
	} else if (selection && typeof selection === "object") {
		for (const [key, value] of Object.entries(selection)) {
			if (typeof value !== "boolean" || !columns.some((column: TTypeOrmColumnMetadata): boolean => column.propertyName === key)) throw new BadRequestException("PATCH select must be a flat column projection");

			if (value) selected.add(key);
		}
	} else throw new BadRequestException("PATCH select must be a nonempty direct projection");

	if (selected.size === 0 || metadata.primaryColumns.some((column: TTypeOrmColumnMetadata): boolean => !selected.has(column.propertyName))) throw new BadRequestException("PATCH select must include every primary column");

	return selected;
}

/**
 * Builds an isolated supplied-column SET without merging the earlier entity.
 * @template E Entity type.
 * @param {Repository<E>} repository - Native metadata owner.
 * @param {ReadonlySet<string>} selected - Actual selected physical columns.
 * @param {TApiFunctionUpdateProperties<E>} properties - Caller or subscriber patch.
 * @returns {TApiFunctionUpdateProperties<E>} Detached writable values, with undefined omitted.
 */
function readPatchValues<E extends IApiBaseEntity>(repository: Repository<E>, selected: ReadonlySet<string>, properties: TApiFunctionUpdateProperties<E>): TApiFunctionUpdateProperties<E> {
	if (!properties || typeof properties !== "object" || Array.isArray(properties) || utilityTypes.isProxy(properties)) throw new BadRequestException("PATCH must be a data record");
	const values: Array<[string, unknown]> = [];

	for (const key of Reflect.ownKeys(properties)) {
		const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(properties, key);

		if (typeof key !== "string" || !descriptor?.enumerable || !("value" in descriptor)) throw new BadRequestException("PATCH must contain enumerable data properties only");

		if (descriptor.value === undefined) continue;
		const column: TTypeOrmColumnMetadata | undefined = repository.metadata.columns.find((candidate: TTypeOrmColumnMetadata): boolean => candidate.propertyName === key && candidate.propertyPath === key && !candidate.embeddedMetadata && !candidate.isVirtual && !candidate.isVirtualProperty);

		if (!column || !selected.has(key) || !column.isUpdate || column.isGenerated || column.isPrimary || column.isCreateDate || column.isUpdateDate || column.isVersion || column.isDeleteDate) throw new BadRequestException("PATCH can write only selected writable physical columns");
		assertPatchDataGraph(descriptor.value);
		values.push([key, descriptor.value]);
	}

	return ApiControllerGeneratedSecuritySnapshot.detach(Object.fromEntries(values)) as TApiFunctionUpdateProperties<E>;
}

/**
 * Builds what the saved entity gives a to-one relation the update moved away from the row it loaded: a reference with the join column values the row now holds, or null when a column holds none, so subscribers and direct callers never read the row the relation left.
 * @template E The entity type
 * @param {RelationMetadata} relation - The moved relation.
 * @param {E} savedEntity - The saved entity.
 * @param {E} existingEntity - The row as the read loaded it, which names a join column the entity does not declare.
 * @returns {ObjectLiteral | null} The reference.
 */
function readRelationReference<E extends IApiBaseEntity>(relation: RelationMetadata, savedEntity: E, existingEntity: E): null | ObjectLiteral {
	const reference: ObjectLiteral = {};

	for (const column of relation.joinColumns) {
		const savedValue: unknown = column.getEntityValue(savedEntity);
		const value: unknown = savedValue === undefined ? column.getEntityValue(existingEntity) : savedValue;

		if (value === null || value === undefined) {
			return null;
		}

		column.referencedColumn?.setEntityValue(reference, value);
	}

	return reference;
}

/**
 * Takes a loaded relation out of the entity a save receives. An embedded column on the way to it is copied first, because the row the read loaded shares it and subscribers still read that row.
 * @param {RelationMetadata} relation - The relation that leaves the save.
 * @param {ObjectLiteral} mergedEntity - The entity the save receives.
 */
function removeRelationFromSave(relation: RelationMetadata, mergedEntity: ObjectLiteral): void {
	let holder: ObjectLiteral = mergedEntity;

	for (const propertyName of relation.embeddedMetadata?.parentPropertyNames ?? []) {
		const embedded: ObjectLiteral = holder[propertyName] as ObjectLiteral;
		const copy: ObjectLiteral = Object.assign(Object.create(Object.getPrototypeOf(embedded) as null | object) as ObjectLiteral, embedded);
		holder[propertyName] = copy;
		holder = copy;
	}

	Reflect.deleteProperty(holder, relation.propertyName);
}
