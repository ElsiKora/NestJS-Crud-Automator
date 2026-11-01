import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { ColumnType } from "typeorm";
import type { ColumnMetadataArgs } from "typeorm/metadata-args/ColumnMetadataArgs";
import type { RelationMetadataArgs } from "typeorm/metadata-args/RelationMetadataArgs";
import type { TableMetadataArgs } from "typeorm/metadata-args/TableMetadataArgs";

import { MetadataStorage } from "@class/metadata-storage.class";
import { ErrorException } from "@utility/error/exception.utility";
import { DefaultNamingStrategy, getMetadataArgsStorage } from "typeorm";

/**
 * Generates metadata information about an entity including columns, table name, and primary key
 * @param {IApiBaseEntity} entity - The entity to generate information for
 * @returns {IApiEntity<E>} The generated entity information object
 * @template E - The entity type
 */
export function GenerateEntityInformation<E>(entity: IApiBaseEntity): IApiEntity<E> {
	const tableName: string = ((): string => {
		// eslint-disable-next-line @elsikora/typescript/no-unsafe-function-type
		const table: TableMetadataArgs | undefined = getMetadataArgsStorage().tables.find(({ target }: TableMetadataArgs): boolean => (target as Function).name === entity.name);

		if (!table) {
			throw ErrorException(`Table for entity ${String(entity.name)} not found in metadata storage`);
		}

		if (table.type !== "entity-child") {
			return new DefaultNamingStrategy().tableName(entity.name ?? "UnknownResource", table.name);
		}

		let current: unknown = Object.getPrototypeOf(table.target);

		while (typeof current === "function" && current !== Function.prototype) {
			const candidate: unknown = current;
			const parentTable: TableMetadataArgs | undefined = getMetadataArgsStorage().tables.find(({ target }: TableMetadataArgs): boolean => target === candidate);

			if (parentTable && parentTable.type !== "entity-child") {
				return new DefaultNamingStrategy().tableName(current.name, parentTable.name);
			}

			current = Object.getPrototypeOf(current);
		}

		throw ErrorException(`Table inheritance root for child entity ${String(entity.name)} not found in metadata storage`);
	})();

	const storage: MetadataStorage = MetadataStorage.getInstance();
	const entityHierarchy: Array<new (...arguments_: Array<unknown>) => unknown> = [];
	const entityNames: Array<string> = [];

	if (typeof entity === "function") {
		let current: (new (...arguments_: Array<unknown>) => unknown) | undefined = entity as unknown as new (...arguments_: Array<unknown>) => unknown;

		while (current) {
			entityHierarchy.push(current);
			entityNames.push(current.name);

			const parentPrototype: null | object = Object.getPrototypeOf(current.prototype) as null | object;
			const parentConstructor: unknown = parentPrototype ? Reflect.get(parentPrototype, "constructor") : undefined;
			const parent: (new (...arguments_: Array<unknown>) => unknown) | undefined = typeof parentConstructor === "function" ? (parentConstructor as new (...arguments_: Array<unknown>) => unknown) : undefined;

			if (!parent || parent === Object) {
				break;
			}

			current = parent;
		}
	} else if (entity.name) {
		entityNames.push(entity.name);
	}

	const columnList: Array<ColumnMetadataArgs> = getMetadataArgsStorage().columns.filter(({ target }: ColumnMetadataArgs): boolean => {
		if (typeof target === "string") {
			return entityNames.includes(target);
		}

		if (typeof target !== "function") {
			return false;
		}

		const targetEntity: new (...arguments_: Array<unknown>) => unknown = target as unknown as new (...arguments_: Array<unknown>) => unknown;

		return entityHierarchy.some((currentEntity: new (...arguments_: Array<unknown>) => unknown): boolean => currentEntity === targetEntity || currentEntity.name === targetEntity.name) || entityNames.includes(targetEntity.name);
	});

	const relationList: Array<RelationMetadataArgs> = getMetadataArgsStorage().relations.filter(({ target }: RelationMetadataArgs): boolean => {
		if (typeof target === "string") {
			return entityNames.includes(target);
		}

		if (typeof target !== "function") {
			return false;
		}

		const targetEntity: new (...arguments_: Array<unknown>) => unknown = target as unknown as new (...arguments_: Array<unknown>) => unknown;

		return entityHierarchy.some((currentEntity: new (...arguments_: Array<unknown>) => unknown): boolean => currentEntity === targetEntity || currentEntity.name === targetEntity.name) || entityNames.includes(targetEntity.name);
	});

	const entityColumns: Array<IApiEntityColumn<E>> = [
		...columnList.map(({ options, propertyName }: ColumnMetadataArgs) => {
			let metadata: Record<string, unknown> | undefined;

			for (const entityName of entityNames) {
				metadata = storage.getMetadata(entityName, propertyName);

				if (metadata) {
					break;
				}
			}

			return {
				isPrimary: Boolean(options.primary),
				metadata,
				name: propertyName as keyof E,
				// eslint-disable-next-line @elsikora/typescript/no-non-null-assertion
				type: options.type!,
			};
		}),
		...relationList.map(({ propertyName, relationType, type }: RelationMetadataArgs) => {
			let metadata: Record<string, unknown> | undefined;

			for (const entityName of entityNames) {
				metadata = storage.getMetadata(entityName, propertyName);

				if (metadata) {
					break;
				}
			}

			let relationTarget: IApiBaseEntity | undefined;
			let resolvedRelationTarget: unknown = type;

			if (typeof type === "function") {
				try {
					resolvedRelationTarget = (type as () => unknown)();
				} catch {
					resolvedRelationTarget = type;
				}
			}

			if (typeof resolvedRelationTarget === "string") {
				relationTarget = { name: resolvedRelationTarget };
			} else if (typeof resolvedRelationTarget === "function" && resolvedRelationTarget.name) {
				relationTarget = resolvedRelationTarget;
			} else if (typeof resolvedRelationTarget === "object" && resolvedRelationTarget !== null && "name" in resolvedRelationTarget && typeof (resolvedRelationTarget as { name?: unknown }).name === "string") {
				relationTarget = resolvedRelationTarget as IApiBaseEntity;
			}

			return {
				isPrimary: false,
				metadata,
				name: propertyName as keyof E,
				relation: relationTarget
					? {
							target: relationTarget,
						}
					: undefined,
				type: relationType as ColumnType,
			};
		}),
	];

	const primaryKey: IApiEntityColumn<E> | undefined = entityColumns.find((column: IApiEntityColumn<E>): boolean => column.isPrimary);

	return {
		columns: entityColumns,
		name: entity.name,
		primaryKey,
		tableName,
	};
}
