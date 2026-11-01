import type { AsyncLocalStorage } from "node:async_hooks";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerGeneratedReadScopeEntry } from "@interface/class/api/controller/generated/read-scope-entry.interface";
import type { TApiAuthorizationScopeWhere } from "@type/class/api/authorization/scope-where.type";
import type { TApiControllerGeneratedScopeFunctionType } from "@type/class/api/controller/generated/scope-function-type.type";
import type { TApiFunctionGetProperties } from "@type/decorator/api/function";

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

	/**
	 * Reports the row a generated create function stored, before its subscribers can replace or change the result.
	 * @param {object} input - Create function input.
	 * @param {object} entity - Result of the repository save.
	 */
	public static captureCreatedEntity(input: object, entity: object): void {
		const entry: IApiControllerGeneratedReadScopeEntry | undefined = this.STORAGE.getStore();

		if (!entry?.captureCreatedEntity || entry.functionType !== EApiFunctionType.CREATE || entry.input !== input || !entry.isClaimed) {
			return;
		}

		if (entry.isCreatedEntityCaptured) {
			throw ErrorException("Generated create must capture its stored row exactly once");
		}

		entry.isCreatedEntityCaptured = true;
		entry.captureCreatedEntity(entity);
	}

	public static captureWriteHydrationReadProperties<T extends object>(input: object, properties: T): T {
		const entry: IApiControllerGeneratedReadScopeEntry | undefined = this.STORAGE.getStore();

		if (!entry?.captureWriteHydrationReadProperties || !this.isWriteHydration(EApiFunctionType.GET, input)) {
			return properties;
		}

		if (entry.isWriteHydrationReadCaptured) {
			throw ErrorException("Write hydration read properties must be captured exactly once");
		}

		entry.isWriteHydrationReadCaptured = true;
		const detachedProperties: T = ApiControllerGeneratedSecuritySnapshot.detach(properties);
		entry.captureWriteHydrationReadProperties(ApiControllerGeneratedSecuritySnapshot.detach(detachedProperties));

		return detachedProperties;
	}

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

	public static isReadMissed(input: object): boolean {
		const entry: IApiControllerGeneratedReadScopeEntry | undefined = this.STORAGE.getStore();

		return Boolean(entry?.isReadMissed && entry.input === input);
	}

	public static isWriteHydration(functionType: EApiFunctionType, input: object): boolean {
		const entry: IApiControllerGeneratedReadScopeEntry | undefined = this.STORAGE.getStore();

		return Boolean(entry?.isWriteHydration && entry.functionType === functionType && entry.input === input && entry.isClaimed);
	}

	public static markReadMissed(input: object): void {
		const entry: IApiControllerGeneratedReadScopeEntry | undefined = this.STORAGE.getStore();

		if (!entry) {
			return;
		}

		if (entry.input === input) {
			entry.isReadMissed = true;
		}
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

	/**
	 * Runs one generated create call and returns what the capture callback derived from the row it stored.
	 * @template E The entity type
	 * @template T The captured value type
	 * @param {object} input - Create function input.
	 * @param {TApiAuthorizationScopeWhere<E>} where - Authorization scope of the write.
	 * @param {() => Promise<unknown>} callback - Calls the protected create function.
	 * @param {(entity: object) => T} captureCreatedEntity - Derives the captured value from the stored row.
	 * @returns {Promise<T>} The captured value.
	 */
	public static async runCreate<E extends IApiBaseEntity, T>(input: object, where: TApiAuthorizationScopeWhere<E>, callback: () => Promise<unknown>, captureCreatedEntity: (entity: object) => T): Promise<T> {
		let captured: { value: T } | undefined;

		await this.runWithEntry(EApiFunctionType.CREATE, input, where, callback, false, undefined, (entity: object): void => {
			captured = { value: captureCreatedEntity(entity) };
		});

		if (!captured) {
			throw ErrorException("Generated create did not capture its stored row");
		}

		return captured.value;
	}

	public static runWriteHydration<E extends IApiBaseEntity, R>(input: object, where: TApiAuthorizationScopeWhere<E>, callback: () => Promise<R>, captureReadProperties?: (properties: TApiFunctionGetProperties<E>) => void): Promise<R> {
		return this.runWithEntry(
			EApiFunctionType.GET,
			input,
			where,
			callback,
			true,
			captureReadProperties
				? (properties: object): void => {
						captureReadProperties(properties);
					}
				: undefined,
		);
	}

	private static runWithEntry<E extends IApiBaseEntity, R>(functionType: TApiControllerGeneratedScopeFunctionType, input: object, where: TApiAuthorizationScopeWhere<E>, callback: () => Promise<R>, isWriteHydration: boolean, captureWriteHydrationReadProperties?: (properties: object) => void, captureCreatedEntity?: (entity: object) => void): Promise<R> {
		const normalizedWhere: TApiAuthorizationScopeWhere<E> = AuthorizationScopeMergeWhere(undefined, ApiControllerGeneratedSecuritySnapshot.detach(where));

		const entry: IApiControllerGeneratedReadScopeEntry = {
			captureCreatedEntity,
			captureWriteHydrationReadProperties,
			functionType,
			input,
			isClaimed: false,
			isCreatedEntityCaptured: false,
			isReadMissed: false,
			isWriteHydration,
			isWriteHydrationReadCaptured: false,
			where: normalizedWhere,
		};

		return this.STORAGE.run(entry, async (): Promise<R> => {
			const result: R = await callback();

			if (!entry.isClaimed) {
				throw ErrorException("Generated service function did not claim its mandatory scope");
			}

			if (entry.captureWriteHydrationReadProperties && !entry.isWriteHydrationReadCaptured) {
				throw ErrorException("Write hydration did not capture its read properties");
			}

			return result;
		});
	}
}
