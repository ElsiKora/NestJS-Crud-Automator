import type { AsyncLocalStorage } from "node:async_hooks";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerGeneratedGetManySession } from "@interface/class/api/controller/generated/get-many-session.interface";
import type { TApiFunctionGetManyProperties } from "@type/decorator/api/function";

import { AsyncLocalStorage as NodeAsyncLocalStorage } from "node:async_hooks";

import { ApiControllerGeneratedScopeWhereContract } from "@class/api/controller/generated/scope-where-contract.class";
import { ApiControllerGeneratedSecuritySnapshot } from "@class/api/controller/generated/security-snapshot.class";
import { AuthorizationScopeMergeWhere } from "@utility/authorization/scope-merge-where.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { ObjectFindPropertyDescriptor } from "@utility/object-find-property-descriptor.utility";
import { EqualOperator, FindOperator, InstanceChecker } from "typeorm";

/**
 * Preserves pagination-critical GET_MANY options owned by a generated cursor route.
 * Direct service calls retain the ordinary subscriber contract.
 */
export class ApiControllerGeneratedGetManyContract {
	private static readonly STORAGE: AsyncLocalStorage<IApiControllerGeneratedGetManySession> = new NodeAsyncLocalStorage<IApiControllerGeneratedGetManySession>();

	public static createSnapshot<E extends IApiBaseEntity>(properties: TApiFunctionGetManyProperties<E>): TApiFunctionGetManyProperties<E> {
		const snapshot: TApiFunctionGetManyProperties<E> = {
			order: properties.order,
			take: properties.take,
		};

		for (const key of ["join", "lock", "withDeleted"] as const) {
			this.copyDataProperty(properties, snapshot, key);
		}

		return ApiControllerGeneratedSecuritySnapshot.detach(snapshot);
	}

	public static hasActiveSession(): boolean {
		return this.STORAGE.getStore() !== undefined;
	}

	public static protect<E extends IApiBaseEntity>(properties: TApiFunctionGetManyProperties<E>, snapshot: TApiFunctionGetManyProperties<E>): TApiFunctionGetManyProperties<E> {
		const session: IApiControllerGeneratedGetManySession | undefined = this.STORAGE.getStore();
		const protectedProperties: TApiFunctionGetManyProperties<E> = Object.create(Object.getPrototypeOf(properties) as null | object) as TApiFunctionGetManyProperties<E>;

		for (const key of Reflect.ownKeys(properties)) {
			if (key === "cache" || key === "join" || key === "lock" || key === "order" || key === "select" || key === "skip" || key === "take" || key === "withDeleted") {
				continue;
			}

			const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(properties, key);

			if (descriptor) {
				Object.defineProperty(protectedProperties, key, descriptor);
			}
		}

		for (const key of ["select", "skip"] as const) {
			Object.defineProperty(protectedProperties, key, {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				configurable: true,
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				enumerable: true,
				value: undefined,
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				writable: true,
			});
		}

		this.defineValue(protectedProperties, "cache", false);

		for (const key of ["order", "take"] as const) {
			const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(snapshot, key);

			if (descriptor) {
				Object.defineProperty(protectedProperties, key, descriptor);
			}
		}

		if (session) {
			for (const key of ["join", "lock"] as const) {
				this.defineValue(protectedProperties, key);
			}

			this.copyDataProperty(properties, protectedProperties, "withDeleted");
			this.defineValue(protectedProperties, "where", this.resolveScopedWindowWhere<E>(session));
		} else {
			for (const key of ["join", "lock", "withDeleted"] as const) {
				const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(snapshot, key);

				if (descriptor) {
					Object.defineProperty(protectedProperties, key, descriptor);
				}
			}
		}

		return protectedProperties;
	}

	public static async resolveBefore<E extends IApiBaseEntity>(properties: TApiFunctionGetManyProperties<E>, callback: (properties: TApiFunctionGetManyProperties<E>) => Promise<TApiFunctionGetManyProperties<E> | undefined>): Promise<TApiFunctionGetManyProperties<E>> {
		const session: IApiControllerGeneratedGetManySession | undefined = this.STORAGE.getStore();

		if (!session) {
			return (await callback(properties)) ?? properties;
		}

		if (session.state.isPrepared) {
			return this.applyCandidateProperties<E>(properties, session.state.candidateProperties);
		}

		session.state.isPrepared = true;
		const beforeProperties: TApiFunctionGetManyProperties<E> = ApiControllerGeneratedSecuritySnapshot.detach(session.baseProperties);
		const subscriberProperties: TApiFunctionGetManyProperties<E> = ApiControllerGeneratedSecuritySnapshot.detach((await callback(beforeProperties)) ?? beforeProperties);

		this.assertSupportedCandidateProperties(subscriberProperties);
		session.state.candidateProperties = this.createCandidateProperties(subscriberProperties) as TApiFunctionGetManyProperties<IApiBaseEntity>;
		this.assertStableCandidateWhere(session.state.candidateProperties.where);
		session.state.isCandidateWhereScoped = ApiControllerGeneratedScopeWhereContract.contains(session.state.candidateProperties.where, session.baseProperties.where);

		return this.applyCandidateProperties<E>(subscriberProperties, session.state.candidateProperties);
	}

	public static run<E extends IApiBaseEntity, R>(baseProperties: TApiFunctionGetManyProperties<E>, callback: () => Promise<R>): Promise<R> {
		this.assertStableCandidateWhere(baseProperties.where);

		return this.STORAGE.run(
			{
				baseProperties: ApiControllerGeneratedSecuritySnapshot.detach(baseProperties) as TApiFunctionGetManyProperties<IApiBaseEntity>,
				state: { isPrepared: false },
			},
			callback,
		);
	}

	public static runWindow<E extends IApiBaseEntity, R>(windowWhere: TApiFunctionGetManyProperties<E>["where"], callback: () => Promise<R>): Promise<R> {
		const session: IApiControllerGeneratedGetManySession | undefined = this.STORAGE.getStore();

		if (!session) {
			return callback();
		}

		return this.STORAGE.run(
			{
				...session,
				windowWhere: ApiControllerGeneratedSecuritySnapshot.detach(windowWhere),
			},
			callback,
		);
	}

	private static applyCandidateProperties<E extends IApiBaseEntity>(properties: TApiFunctionGetManyProperties<E>, candidateProperties?: TApiFunctionGetManyProperties<E>): TApiFunctionGetManyProperties<E> {
		const result: TApiFunctionGetManyProperties<E> = ApiControllerGeneratedSecuritySnapshot.detach(properties);

		if (candidateProperties) {
			for (const key of ["where", "withDeleted"] as const) {
				const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(candidateProperties, key);

				if (descriptor) {
					Object.defineProperty(result, key, ApiControllerGeneratedSecuritySnapshot.detach(descriptor));
				}
			}
		}

		return result;
	}

	private static assertCanonicalFindOperator(value: object, isEqualOperator: boolean): void {
		const expectedKeys: ReadonlyArray<string> = ["@instanceof", "_getSql", "_multipleParameters", "_objectLiteralParameters", "_type", "_useParameter", "_value"];
		const actualKeys: Array<PropertyKey> = Reflect.ownKeys(value);

		if (actualKeys.length !== expectedKeys.length || actualKeys.some((key: PropertyKey): boolean => typeof key !== "string" || !expectedKeys.includes(key))) {
			throw ErrorException("CURSOR GET_LIST candidate WHERE contains a non-canonical TypeORM operator");
		}

		for (const key of expectedKeys) {
			const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(value, key);

			if (!descriptor || !("value" in descriptor) || !descriptor.configurable || !descriptor.enumerable || !descriptor.writable) {
				throw ErrorException("CURSOR GET_LIST candidate WHERE contains a non-canonical TypeORM operator");
			}
		}

		const expectedMarker: symbol = Symbol.for(isEqualOperator ? "EqualOperator" : "FindOperator");
		const marker: unknown = Object.getOwnPropertyDescriptor(value, "@instanceof")?.value;
		const type: unknown = Object.getOwnPropertyDescriptor(value, "_type")?.value;
		const getSql: unknown = Object.getOwnPropertyDescriptor(value, "_getSql")?.value;
		const objectLiteralParameters: unknown = Object.getOwnPropertyDescriptor(value, "_objectLiteralParameters")?.value;

		if (marker !== expectedMarker || typeof type !== "string") {
			throw ErrorException("CURSOR GET_LIST candidate WHERE contains a non-canonical TypeORM operator");
		}

		if (type === "raw") {
			throw ErrorException("CURSOR GET_LIST candidate WHERE cannot contain raw SQL operators");
		}

		if (getSql !== undefined || objectLiteralParameters !== undefined) {
			throw ErrorException("CURSOR GET_LIST candidate WHERE contains a non-canonical TypeORM operator");
		}
	}

	private static assertStableCandidateWhere(value: unknown, visited: WeakSet<object> = new WeakSet<object>()): void {
		if (typeof value === "function") {
			throw ErrorException("CURSOR GET_LIST candidate WHERE cannot contain function-backed values");
		}

		if (!value || typeof value !== "object" || visited.has(value) || value instanceof ArrayBuffer || value instanceof Date || value instanceof RegExp) {
			return;
		}

		if (ArrayBuffer.isView(value)) {
			if (typeof SharedArrayBuffer !== "undefined" && value.buffer instanceof SharedArrayBuffer) {
				throw ErrorException("CURSOR GET_LIST candidate WHERE cannot contain shared-memory values");
			}

			return;
		}

		visited.add(value);
		const prototype: null | object = Object.getPrototypeOf(value) as null | object;
		const isFindOperator: boolean = InstanceChecker.isFindOperator(value);

		if (isFindOperator) {
			if (prototype !== EqualOperator.prototype && prototype !== FindOperator.prototype) {
				throw ErrorException("CURSOR GET_LIST candidate WHERE contains an unsupported executable value");
			}

			this.assertCanonicalFindOperator(value, prototype === EqualOperator.prototype);
		} else if (!Array.isArray(value) && prototype !== null && prototype !== Object.prototype) {
			throw ErrorException("CURSOR GET_LIST candidate WHERE contains an unsupported executable value");
		}

		for (const key of Reflect.ownKeys(value)) {
			if (Array.isArray(value) && key === "length") {
				continue;
			}

			const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(value, key);

			if (!descriptor || !("value" in descriptor)) {
				throw ErrorException("CURSOR GET_LIST candidate WHERE must contain data properties only");
			}

			this.assertStableCandidateWhere(descriptor.value, visited);
		}
	}

	private static assertSupportedCandidateProperties<E extends IApiBaseEntity>(properties: TApiFunctionGetManyProperties<E>): void {
		for (const key of ["join", "lock"] as const) {
			const descriptor: PropertyDescriptor | undefined = ObjectFindPropertyDescriptor(properties, key);

			if (descriptor && (!this.isDataProperty(descriptor) || descriptor.value !== undefined)) {
				throw ErrorException(`CURSOR GET_LIST function subscriber cannot set ${key}`);
			}
		}

		const withDeletedDescriptor: PropertyDescriptor | undefined = ObjectFindPropertyDescriptor(properties, "withDeleted");

		if (withDeletedDescriptor && (!this.isDataProperty(withDeletedDescriptor) || (withDeletedDescriptor.value !== undefined && typeof withDeletedDescriptor.value !== "boolean"))) {
			throw ErrorException("CURSOR GET_LIST function subscriber withDeleted must be a boolean data property");
		}
	}

	private static copyDataProperty(source: object, target: object, key: PropertyKey): void {
		const descriptor: PropertyDescriptor | undefined = ObjectFindPropertyDescriptor(source, key);

		if (!descriptor) {
			this.defineValue(target, key);

			return;
		}

		if (!this.isDataProperty(descriptor)) {
			throw ErrorException(`Generated GET_MANY option ${String(key)} must be a data property`);
		}

		Object.defineProperty(target, key, ApiControllerGeneratedSecuritySnapshot.detach(descriptor));
	}

	private static createCandidateProperties<E extends IApiBaseEntity>(properties: TApiFunctionGetManyProperties<E>): TApiFunctionGetManyProperties<E> {
		const candidateProperties: TApiFunctionGetManyProperties<E> = {};

		for (const key of ["where", "withDeleted"] as const) {
			this.copyDataProperty(properties, candidateProperties, key);
		}

		return ApiControllerGeneratedSecuritySnapshot.detach(candidateProperties);
	}

	private static defineValue(target: object, key: PropertyKey, value?: unknown): void {
		Object.defineProperty(target, key, {
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			configurable: true,
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			enumerable: true,
			value,
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			writable: true,
		});
	}

	private static isDataProperty(descriptor: PropertyDescriptor): descriptor is { value: unknown } & PropertyDescriptor {
		return "value" in descriptor;
	}

	private static readWhere(properties: TApiFunctionGetManyProperties<IApiBaseEntity>): TApiFunctionGetManyProperties<IApiBaseEntity>["where"] {
		const descriptor: PropertyDescriptor | undefined = ObjectFindPropertyDescriptor(properties, "where");

		if (!descriptor) {
			return undefined;
		}

		if (!this.isDataProperty(descriptor)) {
			throw ErrorException("Generated GET_MANY option where must be a data property");
		}

		const value: unknown = descriptor.value;

		return value as TApiFunctionGetManyProperties<IApiBaseEntity>["where"];
	}

	private static resolveScopedWindowWhere<E extends IApiBaseEntity>(session: IApiControllerGeneratedGetManySession): TApiFunctionGetManyProperties<E>["where"] {
		const baseWhere: TApiFunctionGetManyProperties<IApiBaseEntity>["where"] = this.readWhere(session.baseProperties);
		const candidateWhere: TApiFunctionGetManyProperties<IApiBaseEntity>["where"] = session.state.candidateProperties ? this.readWhere(session.state.candidateProperties) : undefined;
		const candidateScope: TApiFunctionGetManyProperties<IApiBaseEntity>["where"] = session.state.isCandidateWhereScoped ? candidateWhere : AuthorizationScopeMergeWhere(candidateWhere, baseWhere);

		return AuthorizationScopeMergeWhere(ApiControllerGeneratedSecuritySnapshot.detach(candidateScope), ApiControllerGeneratedSecuritySnapshot.detach(session.windowWhere));
	}
}
