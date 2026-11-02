import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerPropertiesRouteBaseRelationsRequest } from "@interface/decorator/api";
import type { Type } from "@nestjs/common";
import type { TApiEntityReference } from "@type/api-entity-reference.type";
import type { TTypeOrmInheritanceMetadataArguments, TTypeOrmMetadataArgumentsStorage, TTypeOrmRelationMetadataArguments } from "@type/utility/typeorm";
import type { EntityMetadata } from "typeorm";

import { ApiServiceBase } from "@class/api/service-base.class";
import { EApiControllerRelationReferenceShape, EApiFunctionTransactionMode } from "@enum/decorator/api";
import { DatabaseTypeOrmGetChildEntities } from "@utility/database/typeorm/get/child-entities.utility";
import { EnumIsValue } from "@utility/enum/is-value.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { GetClassHierarchy } from "@utility/get/class-hierarchy.utility";
import { getMetadataArgsStorage, Repository } from "typeorm";

const REQUEST_RELATION_LOCK_MODES: ReadonlySet<unknown> = new Set<unknown>(["pessimistic_read", "pessimistic_write"]);
const REQUEST_RELATIONS_BOOTSTRAP_CHECKS: WeakMap<object, Array<{ owner: string; relationConfig: IApiControllerPropertiesRouteBaseRelationsRequest<IApiBaseEntity> }>> = new WeakMap<object, Array<{ owner: string; relationConfig: IApiControllerPropertiesRouteBaseRelationsRequest<IApiBaseEntity> }>>();

export class ApiControllerRequestRelationsValidator {
	/**
	 * Checks what only exists once the application runs: the service of every enabled include,
	 * and nested include keys, whose relation types are lazy until TypeORM has built its metadata.
	 * Nested keys follow TypeORM, because the include is passed to the find of the related service.
	 * @param {unknown} controller - Controller instance with its injected services.
	 * @param {string} owner - Route description that prefixes the message.
	 * @param {IApiControllerPropertiesRouteBaseRelationsRequest<E>} relationConfig - Request relation configuration of the route.
	 * @returns {void}
	 * @template E - The entity type
	 */
	public static assertLoaded<E extends IApiBaseEntity>(controller: unknown, owner: string, relationConfig: IApiControllerPropertiesRouteBaseRelationsRequest<E>): void {
		const load: IApiControllerPropertiesRouteBaseRelationsRequest<E>["load"] = relationConfig.load;
		const services: Record<string, string | undefined> = load?.services ?? {};

		for (const [relationKey, includeValue] of Object.entries((load?.include ?? {}) as Record<string, unknown>)) {
			if (includeValue === false) {
				continue;
			}

			const serviceName: string = services[relationKey] ?? `${relationKey}Service`;
			const service: unknown = (controller as Record<string, unknown>)[serviceName];

			if (!service) {
				throw ErrorException(`${owner} relations.request key "${relationKey}" needs the service ${serviceName} on the controller`);
			}

			if (!(service instanceof ApiServiceBase)) {
				throw ErrorException(`${owner} relations.request key "${relationKey}" needs ${serviceName} to be an instance of ApiServiceBase`);
			}

			const repository: unknown = (service as { repository?: unknown }).repository;

			if (typeof includeValue === "object" && repository instanceof Repository) {
				this.assertNestedKeys(repository.metadata, includeValue as Record<string, unknown>, owner, relationKey);
			}
		}
	}

	/**
	 * Fails startup on a request relation configuration that would fail at request time, however it is requested.
	 * Automator requires a relation written through a route to exist on the route entity or a parent class.
	 * This is its own rule, not a TypeORM limit: a relation of one child entity does not belong to the other rows a controller over the root writes.
	 * A lock on a route with transaction mode NONE is one of those, because the route never runs in a transaction.
	 * Other modes pass: an outer scope can supply the transaction, so its absence stays a request-time error.
	 * @param {TApiEntityReference} entity - Entity of the route.
	 * @param {string} owner - Route description that prefixes the message, such as `Controller UserController route create`.
	 * @param {IApiControllerPropertiesRouteBaseRelationsRequest<E> | undefined} relationConfig - Request relation configuration of the route.
	 * @param {EApiFunctionTransactionMode} [transactionMode] - Transaction mode of a generated route; a custom route has none.
	 * @returns {void}
	 * @template E - The entity type
	 */
	public static assertStatic<E extends IApiBaseEntity>(entity: TApiEntityReference, owner: string, relationConfig: IApiControllerPropertiesRouteBaseRelationsRequest<E> | undefined, transactionMode?: EApiFunctionTransactionMode): void {
		const load: IApiControllerPropertiesRouteBaseRelationsRequest<E>["load"] = relationConfig?.load;

		if (!load) {
			return;
		}

		this.assertReference(owner, relationConfig?.reference);

		if (!this.isObject(load.include)) {
			throw ErrorException(`${owner} relations.request.load.include must be an object`);
		}

		if (load.locks !== undefined && !this.isObject(load.locks)) {
			throw ErrorException(`${owner} relations.request.load.locks must be an object`);
		}

		const include: Record<string, unknown> = load.include;
		const locks: Record<string, unknown> = load.locks ?? {};
		const services: Record<string, string | undefined> = load.services ?? {};
		const relationNames: Set<string> = new Set<string>(this.getRelationNames(entity));

		for (const relationKey of [...Object.keys(include), ...Object.keys(locks)]) {
			this.assertRelationKey(entity, owner, relationKey, relationNames);
		}

		for (const [relationKey, includeValue] of Object.entries(include)) {
			if (includeValue !== true && includeValue !== false && !this.isObject(includeValue)) {
				throw ErrorException(`${owner} relations.request key "${relationKey}" must include true, false or an object of nested relations`);
			}

			if (includeValue !== false && services[relationKey] === "") {
				throw ErrorException(`${owner} relations.request key "${relationKey}" must not override its service with an empty name`);
			}
		}

		for (const [relationKey, relationLock] of Object.entries(locks)) {
			this.assertLock(owner, relationKey, relationLock, include, load.relationLoadStrategy);
		}

		if (transactionMode === EApiFunctionTransactionMode.NONE && Object.keys(locks).length > 0) {
			throw ErrorException(`${owner} relations.request.load.locks cannot be used with transaction mode NONE, because a lock needs an active transaction`);
		}
	}

	/**
	 * Validates the static request relation configuration of a route, and schedules the checks that need the running application.
	 * The application bootstrap hook is added once per class. A REQUEST-scoped controller gets no such hook from Nest, so those checks stay at request time for it.
	 * @param {object} prototype - Prototype of the controller class.
	 * @param {TApiEntityReference} entity - Entity of the route.
	 * @param {string} owner - Route description that prefixes the message.
	 * @param {IApiControllerPropertiesRouteBaseRelationsRequest<E> | undefined} relationConfig - Request relation configuration of the route.
	 * @param {EApiFunctionTransactionMode} [transactionMode] - Transaction mode of a generated route; a custom route has none.
	 * @returns {void}
	 * @template E - The entity type
	 */
	public static register<E extends IApiBaseEntity>(prototype: object, entity: TApiEntityReference, owner: string, relationConfig: IApiControllerPropertiesRouteBaseRelationsRequest<E> | undefined, transactionMode?: EApiFunctionTransactionMode): void {
		this.assertStatic<E>(entity, owner, relationConfig, transactionMode);

		if (!relationConfig?.load) {
			return;
		}

		const check: { owner: string; relationConfig: IApiControllerPropertiesRouteBaseRelationsRequest<IApiBaseEntity> } = { owner, relationConfig: relationConfig };
		const checks: Array<typeof check> | undefined = REQUEST_RELATIONS_BOOTSTRAP_CHECKS.get(prototype);

		if (checks) {
			checks.push(check);

			return;
		}

		const registeredChecks: Array<typeof check> = [check];
		const controllerHook: (() => unknown) | undefined = (prototype as { onApplicationBootstrap?: () => unknown }).onApplicationBootstrap;

		REQUEST_RELATIONS_BOOTSTRAP_CHECKS.set(prototype, registeredChecks);

		(prototype as { onApplicationBootstrap?: () => unknown }).onApplicationBootstrap = async function (this: unknown): Promise<void> {
			for (const registeredCheck of registeredChecks) {
				ApiControllerRequestRelationsValidator.assertLoaded(this, registeredCheck.owner, registeredCheck.relationConfig);
			}

			await controllerHook?.call(this);
		};
	}

	/**
	 * Rejects a lock that request time would reject: without an enabled include, with an unknown mode, or on nested relations without query loading.
	 * @param {string} owner - Route description that prefixes the message.
	 * @param {string} relationKey - Locked relation.
	 * @param {unknown} relationLock - Lock configuration.
	 * @param {Record<string, unknown>} include - Include map of the route.
	 * @param {unknown} relationLoadStrategy - Configured relation load strategy.
	 * @returns {void}
	 */
	private static assertLock(owner: string, relationKey: string, relationLock: unknown, include: Record<string, unknown>, relationLoadStrategy: unknown): void {
		if (!Object.prototype.hasOwnProperty.call(include, relationKey) || include[relationKey] === false) {
			throw ErrorException(`${owner} relations.request lock "${relationKey}" requires a matching enabled include`);
		}

		if (!this.isObject(relationLock)) {
			throw ErrorException(`${owner} relations.request lock "${relationKey}" must be an object`);
		}

		if (!REQUEST_RELATION_LOCK_MODES.has(relationLock.mode)) {
			throw ErrorException(`${owner} relations.request lock "${relationKey}" mode must be pessimistic_read or pessimistic_write`);
		}

		if (include[relationKey] !== true && relationLoadStrategy !== "query") {
			throw ErrorException(`${owner} relations.request lock "${relationKey}" with nested relations requires relationLoadStrategy query`);
		}
	}

	/**
	 * Walks a nested include the way TypeORM does for find options: every key, enabled or not, is a relation or an embedded property.
	 * @param {EntityMetadata} metadata - Metadata of the entity the keys belong to.
	 * @param {Record<string, unknown>} include - Nested include map.
	 * @param {string} owner - Route description that prefixes the message.
	 * @param {string} path - Include path walked so far.
	 * @param {string} [embeddedPrefix] - Property path of the embedded property being walked.
	 * @returns {void}
	 */
	private static assertNestedKeys(metadata: EntityMetadata, include: Record<string, unknown>, owner: string, path: string, embeddedPrefix?: string): void {
		for (const [key, value] of Object.entries(include)) {
			const propertyPath: string = embeddedPrefix ? `${embeddedPrefix}.${key}` : key;
			const relation: ReturnType<EntityMetadata["findRelationWithPropertyPath"]> = metadata.findRelationWithPropertyPath(propertyPath);
			const isEmbedded: boolean = Boolean(metadata.findEmbeddedWithPropertyPath(propertyPath));

			if (!relation && !isEmbedded) {
				throw ErrorException(`${owner} relations.request key "${path}.${key}" is not a relation on ${metadata.name}`);
			}

			if (!this.isObject(value)) {
				continue;
			}

			if (isEmbedded) {
				this.assertNestedKeys(metadata, value, owner, `${path}.${key}`, propertyPath);
			} else if (relation) {
				this.assertNestedKeys(relation.inverseEntityMetadata, value, owner, `${path}.${key}`);
			}
		}
	}

	/**
	 * Rejects the reference configurations that request time would reject.
	 * @param {string} owner - Route description that prefixes the message.
	 * @param {IApiControllerPropertiesRouteBaseRelationsRequest<IApiBaseEntity>["reference"] | undefined} reference - Reference configuration.
	 * @returns {void}
	 */
	private static assertReference(owner: string, reference: IApiControllerPropertiesRouteBaseRelationsRequest<IApiBaseEntity>["reference"] | undefined): void {
		if (!reference) {
			throw ErrorException(`${owner} relations.request.reference is required when relations.request.load is configured`);
		}

		if (!EnumIsValue(EApiControllerRelationReferenceShape, reference.shape)) {
			throw ErrorException(`${owner} relations.request.reference.shape must be OBJECT or SCALAR`);
		}

		if (reference.key?.length === 0) {
			throw ErrorException(`${owner} relations.request.reference.key must not be empty`);
		}
	}

	/**
	 * Rejects an include or lock key that is not a relation of the entity or a parent class.
	 * @param {TApiEntityReference} entity - Entity of the route.
	 * @param {string} owner - Route description that prefixes the message.
	 * @param {string} relationKey - Configured key.
	 * @param {ReadonlySet<string>} relationNames - Relations of the entity and its parent classes.
	 * @returns {void}
	 */
	private static assertRelationKey(entity: TApiEntityReference, owner: string, relationKey: string, relationNames: ReadonlySet<string>): void {
		if (relationNames.has(relationKey)) {
			return;
		}

		const entityName: string = String(entity.name);
		const childName: string | undefined = this.findDeclaringChildEntity(entity, relationKey);

		if (childName) {
			throw ErrorException(`${owner} relations.request key "${relationKey}" is declared only on child entity ${childName} of table inheritance root ${entityName}. Declare the relation on ${entityName} or use a controller for ${childName}.`);
		}

		throw ErrorException(`${owner} relations.request key "${relationKey}" is not a relation on ${entityName} or its parent classes`);
	}

	/**
	 * Finds the `@ChildEntity` that carries a relation, when the entity is a table inheritance root.
	 * A plain subclass of an entity is not a child entity, and neither is an unrelated class with a relation of the same name.
	 * @param {TApiEntityReference} entity - Entity of the route.
	 * @param {string} relationKey - Relation property name.
	 * @returns {string | undefined} Name of the child entity, or undefined when no loaded child entity carries the relation.
	 */
	private static findDeclaringChildEntity(entity: TApiEntityReference, relationKey: string): string | undefined {
		const storage: TTypeOrmMetadataArgumentsStorage = getMetadataArgsStorage();

		if (!storage.inheritances.some(({ target }: TTypeOrmInheritanceMetadataArguments): boolean => target === (entity as unknown))) {
			return undefined;
		}

		return DatabaseTypeOrmGetChildEntities(entity).find((child: Type<unknown>): boolean => this.getRelationNames(child).includes(relationKey))?.name;
	}

	/**
	 * Lists the relations declared on a class or one of its parent classes.
	 * @param {unknown} target - Class to inspect.
	 * @returns {Array<string>} Relation property names.
	 */
	private static getRelationNames(target: unknown): Array<string> {
		return getMetadataArgsStorage()
			.filterRelations(GetClassHierarchy(target))
			.map(({ propertyName }: TTypeOrmRelationMetadataArguments): string => propertyName);
	}

	/**
	 * Tells whether a configuration value is a plain map.
	 * @param {unknown} value - Configuration value.
	 * @returns {boolean} Whether the value is a non-null, non-array object.
	 */
	private static isObject(value: unknown): value is Record<string, unknown> {
		return value !== null && typeof value === "object" && !Array.isArray(value);
	}
}
