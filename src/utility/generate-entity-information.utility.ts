import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { ColumnType } from "typeorm";
import type { ColumnMetadataArgs } from "typeorm/metadata-args/ColumnMetadataArgs";
import type { DiscriminatorValueMetadataArgs } from "typeorm/metadata-args/DiscriminatorValueMetadataArgs";
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
	const generatedEntity: IApiEntity<E> = {
		columns: [],
		name: "",
		primaryKey: undefined,
		tableName: "",
	};

	generatedEntity.tableName = ((): string => {
		// eslint-disable-next-line @elsikora/typescript/no-unsafe-function-type
		const table: TableMetadataArgs | undefined = getMetadataArgsStorage().tables.find(({ target }: TableMetadataArgs): boolean => (target as Function).name === entity.name);

		if (!table) {
			throw ErrorException(`Table for entity ${String(entity.name)} not found in metadata storage`);
		}

		const namingStrategy = (tableName: string | undefined): string => new DefaultNamingStrategy().tableName(entity.name ?? "UnknownResource", tableName);

		if (!table.name && table.type === "entity-child") {
			const discriminatorValue: DiscriminatorValueMetadataArgs | undefined = getMetadataArgsStorage().discriminatorValues.find(({ target }: DiscriminatorValueMetadataArgs): boolean => target == entity);

			if (!discriminatorValue?.value) {
				throw ErrorException(`Discriminator value for entity ${String(entity.name)} not found in metadata storage`);
			} else if (typeof discriminatorValue.value === "string") {
				return namingStrategy(discriminatorValue.value);
			} else {
				// eslint-disable-next-line @elsikora/typescript/no-unsafe-argument,@elsikora/typescript/no-unsafe-member-access
				return namingStrategy(discriminatorValue.value?.name);
			}
		}

		return namingStrategy(table.name);
	})();

	generatedEntity.name = entity.name;

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
				metadata = storage.getMetadata(entityName, propertyName) as Record<string, unknown> | undefined;

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
		...relationList.map(({ propertyName, relationType }: RelationMetadataArgs) => {
			let metadata: Record<string, unknown> | undefined;

			for (const entityName of entityNames) {
				metadata = storage.getMetadata(entityName, propertyName) as Record<string, unknown> | undefined;

				if (metadata) {
					break;
				}
			}

			return {
				isPrimary: false,
				metadata,
				name: propertyName as keyof E,
				type: relationType as ColumnType,
			};
		}),
	];

	for (const column of entityColumns) {
		if (column.isPrimary) {
			generatedEntity.primaryKey = column;
		}
	}

	generatedEntity.columns = entityColumns;

	return generatedEntity;
}
