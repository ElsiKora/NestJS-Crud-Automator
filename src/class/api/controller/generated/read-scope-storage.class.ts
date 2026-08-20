import type { AsyncLocalStorage } from "node:async_hooks";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerGeneratedReadScopeEntry } from "@interface/class/api/controller/generated/read-scope-entry.interface";
import type { TApiAuthorizationScopeWhere } from "@type/class/api/authorization/scope-where.type";
import type { TApiControllerGeneratedScopeFunctionType } from "@type/class/api/controller/generated/scope-function-type.type";

import { AsyncLocalStorage as NodeAsyncLocalStorage } from "node:async_hooks";

import { ApiControllerGeneratedScopeWhereContract } from "@class/api/controller/generated/scope-where-contract.class";
import { ApiControllerGeneratedSecuritySnapshot } from "@class/api/controller/generated/security-snapshot.class";
import { EApiFunctionType } from "@enum/decorator/api";
import { AuthorizationScopeMergeWhere } from "@utility/authorization/scope-merge-where.utility";
import { ErrorException } from "@utility/error/exception.utility";

/**
 * Carries the final generated-route read predicate to exactly one decorated service call.
 * This is intentionally internal: direct service calls retain their ordinary subscriber contract.
 */
export class ApiControllerGeneratedReadScopeStorage {
	private static readonly STORAGE: AsyncLocalStorage<IApiControllerGeneratedReadScopeEntry> = new NodeAsyncLocalStorage<IApiControllerGeneratedReadScopeEntry>();

	public static claim<E extends IApiBaseEntity>(functionType: TApiControllerGeneratedScopeFunctionType, input: object): TApiAuthorizationScopeWhere<E> | undefined {
		const entry: IApiControllerGeneratedReadScopeEntry | undefined = this.STORAGE.getStore();

		if (entry?.functionType !== functionType || entry.input !== input) {
			return undefined;
		}

		if (entry.isClaimed) {
			throw ErrorException("Generated mandatory scope must be claimed exactly once");
		}

		entry.isClaimed = true;

		return entry.where;
	}

	public static isWriteHydration(functionType: EApiFunctionType, input: object): boolean {
		const entry: IApiControllerGeneratedReadScopeEntry | undefined = this.STORAGE.getStore();

		return Boolean(entry?.isWriteHydration && entry.functionType === functionType && entry.input === input && entry.isClaimed);
	}

	public static protect<E extends IApiBaseEntity, T extends { where?: TApiAuthorizationScopeWhere<E> }>(properties: T, mandatoryWhere: TApiAuthorizationScopeWhere<E>): T {
		const whereDescriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(properties, "where");

		if (whereDescriptor && (!whereDescriptor.enumerable || !("value" in whereDescriptor))) {
			throw ErrorException("Generated read function subscriber WHERE must be an enumerable data property");
		}

		const protectedProperties: T = Object.create(Object.getPrototypeOf(properties) as null | object) as T;

		for (const key of Reflect.ownKeys(properties)) {
			if (key === "cache" || key === "where") {
				continue;
			}

			const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(properties, key);

			if (descriptor) {
				Object.defineProperty(protectedProperties, key, descriptor);
			}
		}

		Object.defineProperty(protectedProperties, "cache", {
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			configurable: true,
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			enumerable: true,
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			value: false,
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			writable: true,
		});

		Object.defineProperty(protectedProperties, "where", {
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			configurable: true,
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			enumerable: true,
			value: ApiControllerGeneratedScopeWhereContract.merge(whereDescriptor && "value" in whereDescriptor ? (whereDescriptor.value as TApiAuthorizationScopeWhere<E>) : undefined, mandatoryWhere),
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			writable: true,
		});

		return protectedProperties;
	}

	public static run<E extends IApiBaseEntity, R>(functionType: TApiControllerGeneratedScopeFunctionType, input: object, where: TApiAuthorizationScopeWhere<E>, callback: () => Promise<R>): Promise<R> {
		return this.runWithEntry(functionType, input, where, callback, false);
	}

	public static runWriteHydration<E extends IApiBaseEntity, R>(input: object, where: TApiAuthorizationScopeWhere<E>, callback: () => Promise<R>): Promise<R> {
		return this.runWithEntry(EApiFunctionType.GET, input, where, callback, true);
	}

	private static runWithEntry<E extends IApiBaseEntity, R>(functionType: TApiControllerGeneratedScopeFunctionType, input: object, where: TApiAuthorizationScopeWhere<E>, callback: () => Promise<R>, isWriteHydration: boolean): Promise<R> {
		const normalizedWhere: TApiAuthorizationScopeWhere<E> = AuthorizationScopeMergeWhere(undefined, ApiControllerGeneratedSecuritySnapshot.detach(where));

		const entry: IApiControllerGeneratedReadScopeEntry = {
			functionType,
			input,
			isClaimed: false,
			isWriteHydration,
			where: normalizedWhere,
		};

		return this.STORAGE.run(entry, async (): Promise<R> => {
			const result: R = await callback();

			if (!entry.isClaimed) {
				throw ErrorException("Generated service function did not claim its mandatory scope");
			}

			return result;
		});
	}
}
