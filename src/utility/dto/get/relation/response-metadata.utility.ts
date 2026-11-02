import type { EApiRouteType } from "@enum/decorator/api";
import type { IApiControllerPropertiesRouteBaseRelationsResponse } from "@interface/decorator/api";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { Type } from "@nestjs/common";
import type { TApiEntityReference } from "@type/api-entity-reference.type";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeProperties, TApiPropertyDescribePropertiesBaseProperties } from "@type/decorator/api/property";
import type { TTypeOrmColumnMetadataArguments, TTypeOrmMetadataArgumentsStorage, TTypeOrmRelationMetadataArguments, TTypeOrmTableMetadataArguments } from "@type/utility/typeorm";
import type { ObjectLiteral } from "typeorm";

import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { EApiControllerRelationReferenceShape, EApiDtoType, EApiPropertyDescribeType } from "@enum/decorator/api";
import { DtoGenerateDecorator } from "@utility/dto/generate/decorator.utility";
import { DtoGenerateRelationResponse } from "@utility/dto/generate/relation-response.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { GetClassHierarchy } from "@utility/get/class-hierarchy.utility";
import { getMetadataArgsStorage } from "typeorm";

const DEFAULT_REFERENCE_KEY: string = "id";

/**
 * Describes a relation property of a generated RESPONSE DTO exactly as the route sends it.
 * A top-level key of `relations.response.load.include` is described as the configured reference: an object with
 * the reference key for OBJECT, the key value itself for SCALAR, and an array of either for a to-many relation.
 * Any other relation keeps its describe metadata, because the serializer sends it through that DTO unchanged.
 * Every relation is nullable when TypeORM can return null for it, and required only when the route always loads it:
 * it is included, or eager. This rule replaces any `isRequired` in the describe metadata of the relation.
 * @param {ObjectLiteral} entity - Entity class that owns the relation.
 * @param {IApiEntity<E>} entityMetadata - Metadata of that entity.
 * @param {IApiEntityColumn<E>} column - Relation column of the property.
 * @param {TApiPropertyDescribeProperties} metadata - Describe metadata of the property.
 * @param {EApiRouteType} method - Route type of the generated DTO.
 * @param {string} dtoNameBase - Name of the generated DTO without the `DTO` suffix, which starts the name of a nested reference DTO.
 * @param {string} routeOrigin - Route DTO named in errors, from `DtoSchemaNameGetRouteOrigin`.
 * @param {IApiControllerPropertiesRouteBaseRelationsResponse<E>} [responseRelations] - Response relation config of the route.
 * @returns {TApiPropertyDescribeProperties} Describe metadata that matches the wire value of the property.
 * @throws {Error} When a projected relation has no reference or is lazy, or its reference key is not a described, non-nullable scalar of the related entity
 * @template E - The entity type
 */
export function DtoGetRelationResponseMetadata<E>(entity: ObjectLiteral, entityMetadata: IApiEntity<E>, column: IApiEntityColumn<E>, metadata: TApiPropertyDescribeProperties, method: EApiRouteType, dtoNameBase: string, routeOrigin: string, responseRelations?: IApiControllerPropertiesRouteBaseRelationsResponse<E>): TApiPropertyDescribeProperties {
	const propertyName: string = String(column.name);
	const hierarchy: Array<Type<unknown>> = GetClassHierarchy(entity);
	const relation: TTypeOrmRelationMetadataArguments | undefined = getMetadataArgsStorage().relations.find((candidate: TTypeOrmRelationMetadataArguments): boolean => candidate.propertyName === propertyName && hierarchy.includes(candidate.target as Type<unknown>));

	if (!relation) {
		return metadata;
	}

	const include: Record<string, unknown> = responseRelations?.load?.include ?? {};
	const isToMany: boolean = relation.relationType === "one-to-many" || relation.relationType === "many-to-many";
	const isRequired: boolean = Boolean(include[propertyName]) || relation.options.eager === true;
	const isNullable: boolean = !isToMany && isToOneNullable(hierarchy, relation, column.relation?.target);
	const properties: TApiPropertyDescribePropertiesBaseProperties = withResponseRequired(metadata.properties, method, isRequired);

	if (!responseRelations || !Object.keys(include).includes(propertyName)) {
		return { ...metadata, isNullable, properties };
	}

	const relationName: string = `${String(entityMetadata.name)}.${propertyName} in ${routeOrigin}`;
	const reference: IApiControllerPropertiesRouteBaseRelationsResponse<E>["reference"] | undefined = responseRelations.reference;

	if (!reference?.shape) {
		throw ErrorException(`Response relation ${relationName} is in relations.response.load.include, so the route must set relations.response.reference with a shape`);
	}

	if (relation.isLazy && include[propertyName]) {
		throw ErrorException(`Response relation ${relationName} is lazy, and a lazy relation cannot be sent as a reference. Make the relation non-lazy or remove it from relations.response.load.include`);
	}

	const description: string = ("description" in metadata ? (metadata.description?.trim() ?? "") : "") || propertyName;
	const base: Record<string, unknown> = { description, isAutoDtoEnabled: metadata.isAutoDtoEnabled, isNullable, properties };
	const array: Record<string, unknown> = isToMany ? { isArray: true, minItems: 0 } : { isArray: false };
	const key: string = reference.key ?? DEFAULT_REFERENCE_KEY;
	const isScalar: boolean = reference.shape === EApiControllerRelationReferenceShape.SCALAR;
	const keyMetadata: TApiPropertyDescribeProperties = getReferenceKeyMetadata(column, key, relationName);

	if (key === DEFAULT_REFERENCE_KEY && keyMetadata.type === EApiPropertyDescribeType.UUID) {
		return (isScalar ? { ...base, ...array, type: EApiPropertyDescribeType.UUID } : { ...base, type: EApiPropertyDescribeType.RELATION }) as TApiPropertyDescribeProperties;
	}

	if (isScalar) {
		return { ...keyMetadata, ...base, ...array };
	}

	return {
		...base,
		...array,
		dataType: DtoGenerateRelationResponse(entityMetadata, method, EApiDtoType.RESPONSE, propertyName, {
			dtoNameBase,
			reference: { createDecorator: (identifierEntity: IApiEntity<E>): PropertyDecorator => DtoGenerateDecorator(keyMetadata, identifierEntity, { isRequired: true, isResponse: true }, method, EApiDtoType.RESPONSE, key), key },
			relationDescription: description,
		}),
		type: EApiPropertyDescribeType.OBJECT,
	} as TApiPropertyDescribeProperties;
}

/**
 * Returns the describe metadata of a reference key on the related entity, without its route settings and array options.
 * @param {IApiEntityColumn<E>} column - Relation column whose target owns the key.
 * @param {string} key - Configured reference key.
 * @param {string} relationName - Relation named in errors.
 * @returns {TApiPropertyDescribeProperties} Scalar describe metadata of the key.
 * @throws {Error} When the key is not a described, non-nullable scalar of the related entity, or is `id` on a target with a composite primary key
 * @template E - The entity type
 */
function getReferenceKeyMetadata<E>(column: IApiEntityColumn<E>, key: string, relationName: string): TApiPropertyDescribeProperties {
	const target: IApiEntityColumn<E>["relation"] = column.relation;
	const targetEntity: TApiEntityReference | undefined = target?.target;
	const targetName: string = String(targetEntity?.name);
	const targetColumns: Array<IApiEntityColumn<unknown>> = target ? GenerateEntityInformation<unknown>(target.target).columns : [];
	const primaryColumnCount: number = targetColumns.filter((candidate: IApiEntityColumn<unknown>): boolean => candidate.isPrimary).length;

	if (key === DEFAULT_REFERENCE_KEY && primaryColumnCount > 1) {
		throw ErrorException(`Response relation reference key "${key}" of ${relationName} cannot identify a row of ${targetName}, because its primary key has ${String(primaryColumnCount)} columns. Set relations.response.reference.key to a described, unique scalar of ${targetName}`);
	}

	const keyColumn: IApiEntityColumn<unknown> | undefined = targetColumns.find((candidate: IApiEntityColumn<unknown>): boolean => candidate.name === key);
	const keyMetadata: TApiPropertyDescribeProperties | undefined = keyColumn?.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] as TApiPropertyDescribeProperties | undefined;

	if (!keyColumn || !keyMetadata) {
		throw ErrorException(`Response relation reference key "${key}" of ${relationName} must be described with @ApiPropertyDescribe on ${targetName}`);
	}

	if (keyColumn.relation || keyMetadata.type === EApiPropertyDescribeType.OBJECT || keyMetadata.type === EApiPropertyDescribeType.RELATION || ("isArray" in keyMetadata && keyMetadata.isArray === true)) {
		throw ErrorException(`Response relation reference key "${key}" of ${relationName} must be a scalar property of ${targetName}`);
	}

	if (keyMetadata.isNullable === true) {
		throw ErrorException(`Response relation reference key "${key}" of ${relationName} must not be nullable on ${targetName}, because a reference identifies the related row`);
	}

	const { isArray, isAutoDtoEnabled, isNullable, isUniqueItems, maxItems, minItems, properties, ...scalarMetadata }: Record<string, unknown> = keyMetadata;

	return scalarMetadata as TApiPropertyDescribeProperties;
}

/**
 * Returns whether a relation target has a soft-delete column, on its own class or a parent class.
 * @param {TApiEntityReference} [target] - Relation target, which holds only the name for a relation declared by entity name.
 * @returns {boolean} Whether a target row can be soft-deleted.
 */
function isSoftDeletable(target?: TApiEntityReference): boolean {
	const storage: TTypeOrmMetadataArgumentsStorage = getMetadataArgsStorage();
	const declaredHierarchy: Array<Type<unknown>> = GetClassHierarchy(target);
	const targetHierarchy: Array<Type<unknown>> = declaredHierarchy.length > 0 ? declaredHierarchy : GetClassHierarchy(storage.tables.find((table: TTypeOrmTableMetadataArguments): boolean => (table.target as Type<unknown>).name === target?.name)?.target);

	return storage.columns.some((candidate: TTypeOrmColumnMetadataArguments): boolean => candidate.mode === "deleteDate" && targetHierarchy.includes(candidate.target as Type<unknown>));
}

/**
 * Returns whether TypeORM can return null for a to-one relation.
 * The inverse side of a one-to-one relation has no column and is null when no row points at it. A soft-deleted target is left out of the join, so a target with a soft-delete column gives null even on a non-null relation.
 * The owner side is otherwise nullable unless the relation is `nullable: false` or every join column is backed by a non-null or primary column.
 * @param {Array<Type<unknown>>} hierarchy - Entity class and its parent classes.
 * @param {TTypeOrmRelationMetadataArguments} relation - Relation metadata.
 * @param {TApiEntityReference} [target] - Relation target.
 * @returns {boolean} Whether the relation can be null on the wire.
 */
function isToOneNullable(hierarchy: Array<Type<unknown>>, relation: TTypeOrmRelationMetadataArguments, target?: TApiEntityReference): boolean {
	const storage: TTypeOrmMetadataArgumentsStorage = getMetadataArgsStorage();
	const joinColumns: Array<TTypeOrmMetadataArgumentsStorage["joinColumns"][number]> = storage.joinColumns.filter((joinColumn: TTypeOrmMetadataArgumentsStorage["joinColumns"][number]): boolean => joinColumn.propertyName === relation.propertyName && hierarchy.includes(joinColumn.target as Type<unknown>));

	if ((relation.relationType === "one-to-one" && joinColumns.length === 0) || isSoftDeletable(target)) {
		return true;
	}

	if (relation.options.nullable === false) {
		return false;
	}

	if (joinColumns.length === 0) {
		return true;
	}

	return joinColumns.some(({ name }: TTypeOrmMetadataArgumentsStorage["joinColumns"][number]): boolean => {
		const isBackedByRequiredColumn: boolean = name !== undefined && storage.columns.some((candidate: TTypeOrmColumnMetadataArguments): boolean => hierarchy.includes(candidate.target as Type<unknown>) && (candidate.propertyName === name || candidate.options.name === name) && (candidate.options.primary === true || candidate.options.nullable !== true));

		return !isBackedByRequiredColumn;
	});
}

/**
 * Sets whether a relation property is required in the RESPONSE DTO of one route type, keeping its other route settings.
 * @param {TApiPropertyDescribePropertiesBaseProperties | undefined} properties - Route settings of the property.
 * @param {EApiRouteType} method - Route type of the generated DTO.
 * @param {boolean} isRequired - Whether the route always sends the property.
 * @returns {TApiPropertyDescribePropertiesBaseProperties} Route settings with the response requirement.
 */
function withResponseRequired(properties: TApiPropertyDescribePropertiesBaseProperties | undefined, method: EApiRouteType, isRequired: boolean): TApiPropertyDescribePropertiesBaseProperties {
	const routeProperties: Partial<Record<EApiDtoType, TApiPropertyDescribeDtoProperties>> = properties?.[method as EApiRouteType.GET] ?? {};

	return { ...properties, [method]: { ...routeProperties, [EApiDtoType.RESPONSE]: { ...routeProperties[EApiDtoType.RESPONSE], isRequired } } };
}
