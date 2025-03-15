import type { ColumnType } from "typeorm";
import type { ColumnMetadataArgs } from "typeorm/metadata-args/ColumnMetadataArgs";
import type { DiscriminatorValueMetadataArgs } from "typeorm/metadata-args/DiscriminatorValueMetadataArgs";
import type { RelationMetadataArgs } from "typeorm/metadata-args/RelationMetadataArgs";
import type { TableMetadataArgs } from "typeorm/metadata-args/TableMetadataArgs";

import type { IApiBaseEntity, IApiEntity, IApiEntityColumn } from "../interface";

import { DefaultNamingStrategy, getMetadataArgsStorage } from "typeorm";

import { MetadataStorage } from "../class";

import { ErrorException } from "./error-exception.utility";

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

	// eslint-disable-next-line @elsikora/typescript/no-unsafe-function-type
	const columnList: Array<ColumnMetadataArgs> = getMetadataArgsStorage().columns.filter(({ target }: ColumnMetadataArgs): boolean => (target as Function).name === entity.name);

	// eslint-disable-next-line @elsikora/typescript/no-unsafe-function-type
	const relationList: Array<RelationMetadataArgs> = getMetadataArgsStorage().relations.filter(({ target }: RelationMetadataArgs): boolean => (target as Function).name === entity.name);

	const entityColumns: Array<IApiEntityColumn<E>> = [
		...columnList.map(({ options, propertyName }: ColumnMetadataArgs) => ({
			isPrimary: Boolean(options.primary),
			metadata: (storage.getMetadata(entity.name ?? "UnknownResource", propertyName) as Record<string, any>) || undefined,
			name: propertyName as keyof E,
			// eslint-disable-next-line @elsikora/typescript/no-non-null-assertion
			type: options.type!,
		})),
		...relationList.map(({ propertyName, relationType }: RelationMetadataArgs) => ({
			isPrimary: false,
			metadata: (storage.getMetadata(entity.name ?? "UnknownResource", propertyName) as Record<string, any>) || undefined,
			name: propertyName as keyof E,
			type: relationType as ColumnType,
		})),
	];

	for (const column of entityColumns) {
		if (column.isPrimary) {
			generatedEntity.primaryKey = column;
		}
	}

	generatedEntity.columns = entityColumns;

	return generatedEntity;
}
