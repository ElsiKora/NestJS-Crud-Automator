import type { EApiRouteType } from "@enum/decorator/api";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { Type } from "@nestjs/common";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";
import type { TTypeOrmColumnMetadataArguments, TTypeOrmMetadataArgumentsStorage, TTypeOrmRelationMetadataArguments } from "@type/utility/typeorm";
import type { ObjectLiteral } from "typeorm";

import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { EApiDtoType, EApiPropertyDescribeType } from "@enum/decorator/api";
import { DtoGenerateDecorator } from "@utility/dto/generate/decorator.utility";
import { DtoSchemaNameGetSegment } from "@utility/dto/schema-name/get-segment.utility";
import { DtoSetGeneratedName } from "@utility/dto/set-generated-name.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { GetClassHierarchy } from "@utility/get/class-hierarchy.utility";
import { getMetadataArgsStorage } from "typeorm";

/**
 * Describes a relation property of a generated BODY DTO exactly as the route accepts it.
 * A relation that owns its join columns is sent as the value of the column it references: a relation over one column as that value, with the type and format the related entity describes for the column, and a relation over several columns as an object that names each join column the client may write, under the name the related entity gives it and with that column's own type and format, because the save reads every join column from the object. Any other relation keeps its describe metadata.
 * A join column the client may not write leaves the object: one the path binds, and on a write to one row every key column, since the route refuses any other value for it. A relation with no join column left leaves the DTO, and one that lost a join column cannot be null, because null would clear that column too.
 * @param {ObjectLiteral} entity - Entity class that owns the relation.
 * @param {IApiEntity<E>} entityMetadata - Metadata of that entity.
 * @param {IApiEntityColumn<E>} column - Relation column of the property.
 * @param {TApiPropertyDescribeProperties} metadata - Describe metadata of the property.
 * @param {EApiRouteType} method - Route type of the generated DTO.
 * @param {string} dtoNameBase - Name of the generated DTO without the `DTO` suffix, which starts the name of the nested relation DTO.
 * @param {string} routeOrigin - Route DTO named in errors, from `DtoSchemaNameGetRouteOrigin`.
 * @param {ReadonlyArray<string>} lockedFields - Entity properties the client may not write in this body: the fields the path binds, and on a write to one row every key column.
 * @returns {TApiPropertyDescribeProperties | undefined} Describe metadata that matches what the route accepts, or `undefined` when the body cannot carry the relation.
 * @throws {Error} When a join column of a relation names no described scalar of the related entity
 * @template E - The entity type
 */
export function DtoGetRelationRequestMetadata<E>(entity: ObjectLiteral, entityMetadata: IApiEntity<E>, column: IApiEntityColumn<E>, metadata: TApiPropertyDescribeProperties, method: EApiRouteType, dtoNameBase: string, routeOrigin: string, lockedFields: ReadonlyArray<string>): TApiPropertyDescribeProperties | undefined {
	const propertyName: string = String(column.name);
	const hierarchy: Array<Type<unknown>> = GetClassHierarchy(entity);
	const storage: TTypeOrmMetadataArgumentsStorage = getMetadataArgsStorage();
	const relation: TTypeOrmRelationMetadataArguments | undefined = storage.relations.find((candidate: TTypeOrmRelationMetadataArguments): boolean => candidate.propertyName === propertyName && hierarchy.includes(candidate.target as Type<unknown>));
	const declaredJoinColumns: Array<TTypeOrmMetadataArgumentsStorage["joinColumns"][number]> = storage.joinColumns.filter((joinColumn: TTypeOrmMetadataArgumentsStorage["joinColumns"][number]): boolean => joinColumn.propertyName === propertyName && hierarchy.includes(joinColumn.target as Type<unknown>));

	// Only a relation that owns its join columns carries a key in the body; a many-to-one without @JoinColumn joins one default column.
	if (!relation || !(relation.relationType === "many-to-one" || (relation.relationType === "one-to-one" && declaredJoinColumns.length > 0))) {
		return metadata;
	}

	const relationName: string = `${String(entityMetadata.name)}.${propertyName} in ${routeOrigin}`;
	const targetColumns: Array<IApiEntityColumn<unknown>> = column.relation ? GenerateEntityInformation<unknown>(column.relation.target).columns : [];
	const targetPrimaryColumns: Array<IApiEntityColumn<unknown>> = targetColumns.filter((candidate: IApiEntityColumn<unknown>): boolean => candidate.isPrimary);
	const defaultKey: string | undefined = targetPrimaryColumns.length === 1 ? String(targetPrimaryColumns[0]?.name) : undefined;
	const joinColumns: Array<{ name?: string; referencedColumnName?: string }> = declaredJoinColumns.length > 0 ? declaredJoinColumns : [{}];
	const targetName: string = String((column.relation?.target as { name?: string } | undefined)?.name);
	const writableKeys: Array<{ key: string; keyMetadata: TApiPropertyDescribeProperties }> = [];

	for (const joinColumn of joinColumns) {
		const key: string | undefined = joinColumn.referencedColumnName ?? (joinColumns.length === 1 ? defaultKey : undefined);
		const keySuffix: string = key ? key.charAt(0).toUpperCase() + key.slice(1) : "";
		const columnName: string = joinColumn.name ?? propertyName + keySuffix;
		const ownField: string = storage.columns.find((candidate: TTypeOrmColumnMetadataArguments): boolean => hierarchy.includes(candidate.target as Type<unknown>) && (candidate.propertyName === columnName || candidate.options.name === columnName))?.propertyName ?? columnName;

		if (lockedFields.includes(ownField)) {
			continue;
		}

		const keyColumn: IApiEntityColumn<unknown> | undefined = targetColumns.find((candidate: IApiEntityColumn<unknown>): boolean => candidate.name === key);
		const keyMetadata: TApiPropertyDescribeProperties | undefined = keyColumn?.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] as TApiPropertyDescribeProperties | undefined;

		if (!key || !keyColumn || !keyMetadata || keyColumn.relation || keyMetadata.type === EApiPropertyDescribeType.OBJECT || keyMetadata.type === EApiPropertyDescribeType.RELATION || ("isArray" in keyMetadata && keyMetadata.isArray === true)) {
			throw ErrorException(`Request relation ${relationName} joins column "${columnName}", so its referenced column "${String(key)}" must be a scalar described with @ApiPropertyDescribe on ${targetName}. Set referencedColumnName on the join column and describe that property`);
		}

		const { isArray, isAutoDtoEnabled, isNullable, isUniqueItems, maxItems, minItems, properties, ...scalarMetadata }: Record<string, unknown> = keyMetadata;

		writableKeys.push({ key, keyMetadata: scalarMetadata as TApiPropertyDescribeProperties });
	}

	if (writableKeys.length === 0) {
		return undefined;
	}

	const description: string = ("description" in metadata ? (metadata.description?.trim() ?? "") : "") || propertyName;

	const [singleKey]: Array<{ key: string; keyMetadata: TApiPropertyDescribeProperties }> = writableKeys;

	if (joinColumns.length === 1 && singleKey) {
		return { ...singleKey.keyMetadata, description, isAutoDtoEnabled: metadata.isAutoDtoEnabled, isNullable: metadata.isNullable, properties: metadata.properties } as TApiPropertyDescribeProperties;
	}

	const hostDtoName: string = `${dtoNameBase}DTO`;
	const keyEntity: IApiEntity<E> = { ...entityMetadata, name: `${String(entityMetadata.name)} ${description}` };

	class GeneratedRelationRequestDTO {}

	for (const { key, keyMetadata } of writableKeys) {
		DtoGenerateDecorator(keyMetadata, keyEntity, { isRequired: true }, method, EApiDtoType.BODY, key)(GeneratedRelationRequestDTO.prototype, key);
	}

	DtoSetGeneratedName(GeneratedRelationRequestDTO, `${dtoNameBase}${DtoSchemaNameGetSegment(propertyName, hostDtoName)}DTO`, `relation property ${propertyName} in ${hostDtoName}`);

	return {
		dataType: GeneratedRelationRequestDTO,
		description,
		isArray: false,
		isAutoDtoEnabled: metadata.isAutoDtoEnabled,
		isNullable: writableKeys.length === joinColumns.length ? metadata.isNullable : false,
		properties: metadata.properties,
		shouldValidateNested: true,
		type: EApiPropertyDescribeType.OBJECT,
	};
}
