import { DefaultNamingStrategy, getMetadataArgsStorage } from "typeorm";

import { MetadataStorage } from "../class";

import { ErrorException } from "./error-exception.utility";

import type { IApiBaseEntity, IApiEntity, IApiEntityColumn } from "../interface";
import type { ColumnType } from "typeorm";

import type { ColumnMetadataArgs } from "typeorm/metadata-args/ColumnMetadataArgs";
import type { DiscriminatorValueMetadataArgs } from "typeorm/metadata-args/DiscriminatorValueMetadataArgs";

import type { TableMetadataArgs } from "typeorm/metadata-args/TableMetadataArgs";

export function GenerateEntityInformation(entity: IApiBaseEntity): IApiEntity {
	const generatedEntity: IApiEntity = {
		columns: [],
		name: "",
		primaryKey: undefined,
		tableName: "",
	};

	generatedEntity.tableName = ((): string => {
		const table: TableMetadataArgs | undefined = getMetadataArgsStorage().tables.find(({ target }: TableMetadataArgs): boolean => (target as Function).name === entity.name);

		if (!table) {
			throw ErrorException(`Table for entity ${entity.name} not found in metadata storage`);
		}

		const namingStrategy = (tableName: string | undefined): string => new DefaultNamingStrategy().tableName(entity.name, tableName);

		if (!table.name && table.type === "entity-child") {
			const discriminatorValue: DiscriminatorValueMetadataArgs | undefined = getMetadataArgsStorage().discriminatorValues.find(({ target }: DiscriminatorValueMetadataArgs): boolean => target === entity);

			if (!discriminatorValue?.value) {
				throw ErrorException(`Discriminator value for entity ${entity.name} not found in metadata storage`);
			} else if (typeof discriminatorValue.value === "string") {
				return namingStrategy(discriminatorValue.value);
			} else {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-member-access
				return namingStrategy(discriminatorValue.value?.name);
			}
		}

		return namingStrategy(table.name);
	})();

	generatedEntity.name = entity.name;

	const storage: MetadataStorage = MetadataStorage.getInstance();
	const columnList: Array<ColumnMetadataArgs> = getMetadataArgsStorage().columns.filter(({ target }: ColumnMetadataArgs): boolean => (target as Function).name === entity.name);

	const entityColumns: Array<IApiEntityColumn> = columnList.map(({ options, propertyName }: ColumnMetadataArgs) => ({
		isPrimary: Boolean(options.primary),
		metadata: (storage.getMetadata(entity.name, propertyName) as Record<string, any>) || undefined,
		name: propertyName,
		type: options.type as ColumnType,
	}));

	entityColumns.map((column: IApiEntityColumn) => {
		if (column.isPrimary) {
			generatedEntity.primaryKey = column;
		}
	});

	generatedEntity.columns = entityColumns;

	return generatedEntity;
}
