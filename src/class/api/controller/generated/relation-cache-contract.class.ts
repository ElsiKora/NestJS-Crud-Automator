import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { FindManyOptions, FindOneOptions, Repository } from "typeorm";

import { ErrorException } from "@utility/error/exception.utility";
import { ObjectFindPropertyDescriptor } from "@utility/object-find-property-descriptor.utility";

/**
 * Rejects the TypeORM relation-loader cache combination that cannot inherit a
 * generated mandatory read's `cache: false` root-query guarantee.
 */
export class ApiControllerGeneratedRelationCacheContract {
	public static assertSafe<E extends IApiBaseEntity>(repository: Repository<E>, properties: FindManyOptions<E> | FindOneOptions<E>): void {
		if (!this.hasRequestedRelations(properties)) {
			return;
		}

		const dataSourceOptions: object = repository.manager.connection.options;
		const requestedRelationLoadStrategy: unknown = this.readDataProperty(properties, "relationLoadStrategy");
		const defaultRelationLoadStrategy: unknown = this.readDataProperty(dataSourceOptions, "relationLoadStrategy");

		for (const strategy of [requestedRelationLoadStrategy, defaultRelationLoadStrategy]) {
			if (strategy && strategy !== "join" && strategy !== "query") {
				throw ErrorException("Generated mandatory read relationLoadStrategy must be join or query");
			}
		}

		// TypeORM inherits the data-source strategy for every falsy per-query value.
		// eslint-disable-next-line @elsikora/typescript/prefer-nullish-coalescing
		const relationLoadStrategy: unknown = requestedRelationLoadStrategy || defaultRelationLoadStrategy;

		if (relationLoadStrategy !== "query") {
			return;
		}

		const cache: unknown = this.readDataProperty(dataSourceOptions, "cache");

		if (cache && typeof cache === "object" && Boolean(this.readDataProperty(cache, "alwaysEnabled"))) {
			throw ErrorException('Generated mandatory reads cannot load relations with relationLoadStrategy "query" while TypeORM query cache is always enabled');
		}
	}

	private static hasRequestedRelations(properties: object): boolean {
		const descriptor: PropertyDescriptor | undefined = ObjectFindPropertyDescriptor(properties, "relations");

		if (!descriptor) {
			return false;
		}

		if (!("value" in descriptor)) {
			return true;
		}

		const relationsValue: unknown = descriptor.value;

		if (Array.isArray(relationsValue)) {
			return relationsValue.length > 0;
		}

		if (!relationsValue || typeof relationsValue !== "object") {
			return false;
		}

		for (const key of Reflect.ownKeys(relationsValue)) {
			const relationDescriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(relationsValue, key);

			if (!relationDescriptor || !("value" in relationDescriptor) || relationDescriptor.value === true || typeof relationDescriptor.value === "string" || (relationDescriptor.value !== null && typeof relationDescriptor.value === "object")) {
				return true;
			}
		}

		return false;
	}

	private static readDataProperty(source: object, key: PropertyKey): unknown {
		const descriptor: PropertyDescriptor | undefined = ObjectFindPropertyDescriptor(source, key);

		if (!descriptor) {
			return undefined;
		}

		if (!("value" in descriptor)) {
			throw ErrorException(`Generated mandatory read option ${String(key)} must be a data property`);
		}

		return descriptor.value;
	}
}
