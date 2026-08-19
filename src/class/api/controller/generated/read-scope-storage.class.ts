import type { AsyncLocalStorage } from "node:async_hooks";

import type { EApiFunctionType } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerGeneratedReadScopeEntry } from "@interface/class/api/controller/generated-read-scope-entry.interface";
import type { TApiAuthorizationScopeWhere } from "@type/class/api/authorization/scope-where.type";

import { AsyncLocalStorage as NodeAsyncLocalStorage } from "node:async_hooks";

import { ApiControllerGeneratedSecuritySnapshot } from "@class/api/controller/generated/security-snapshot.class";
import { AuthorizationScopeMergeWhere } from "@utility/authorization/scope-merge-where.utility";
import { ErrorException } from "@utility/error/exception.utility";

/**
 * Carries the final generated-route read predicate to exactly one decorated service call.
 * This is intentionally internal: direct service calls retain their ordinary subscriber contract.
 */
export class ApiControllerGeneratedReadScopeStorage {
	private static readonly STORAGE: AsyncLocalStorage<IApiControllerGeneratedReadScopeEntry> = new NodeAsyncLocalStorage<IApiControllerGeneratedReadScopeEntry>();

	public static claim<E extends IApiBaseEntity>(functionType: EApiFunctionType.GET | EApiFunctionType.GET_LIST, input: object): TApiAuthorizationScopeWhere<E> | undefined {
		const entry: IApiControllerGeneratedReadScopeEntry | undefined = this.STORAGE.getStore();

		if (!entry || entry.isClaimed || entry.functionType !== functionType || entry.input !== input) {
			return undefined;
		}

		entry.isClaimed = true;

		return entry.where;
	}

	public static protect<E extends IApiBaseEntity, T extends { where?: TApiAuthorizationScopeWhere<E> }>(properties: T, mandatoryWhere: TApiAuthorizationScopeWhere<E>): T {
		const whereDescriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(properties, "where");

		if (whereDescriptor && (!whereDescriptor.enumerable || !("value" in whereDescriptor))) {
			throw ErrorException("Generated read function subscriber WHERE must be an enumerable data property");
		}

		const protectedProperties: T = Object.create(Object.getPrototypeOf(properties) as null | object) as T;

		for (const key of Reflect.ownKeys(properties)) {
			if (key === "where") {
				continue;
			}

			const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(properties, key);

			if (descriptor) {
				Object.defineProperty(protectedProperties, key, descriptor);
			}
		}

		Object.defineProperty(protectedProperties, "where", {
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			configurable: true,
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			enumerable: true,
			value: AuthorizationScopeMergeWhere(whereDescriptor && "value" in whereDescriptor ? (whereDescriptor.value as TApiAuthorizationScopeWhere<E>) : undefined, mandatoryWhere),
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			writable: true,
		});

		return protectedProperties;
	}

	public static run<E extends IApiBaseEntity, R>(functionType: EApiFunctionType.GET | EApiFunctionType.GET_LIST, input: object, where: TApiAuthorizationScopeWhere<E>, callback: () => Promise<R>): Promise<R> {
		const normalizedWhere: TApiAuthorizationScopeWhere<E> = AuthorizationScopeMergeWhere(undefined, ApiControllerGeneratedSecuritySnapshot.detach(where));

		return this.STORAGE.run(
			{
				functionType,
				input,
				isClaimed: false,
				where: normalizedWhere as TApiAuthorizationScopeWhere<IApiBaseEntity>,
			},
			callback,
		);
	}
}
