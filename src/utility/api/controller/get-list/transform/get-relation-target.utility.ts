import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { CanActivate, Type } from "@nestjs/common";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { EApiDtoType, EApiPropertyDescribeType, EApiRouteType } from "@enum/decorator/api";
import { ApiControllerGetListIsToOneRelation } from "@utility/api/controller/get-list/is-to-one-relation.utility";
import { DtoIsPropertyShouldBeMarked } from "@utility/dto/is/property/should-be-marked.utility";

/**
 * Returns the target of the relation a GET_LIST filter can reach under a property name, or nothing when it cannot reach one.
 * This is the one rule for that reach, to-one relations only, shared by the request filter, the query plan, and the startup checks.
 * @template E - The entity type
 * @param {IApiEntity<E>} entityMetadata - The entity metadata containing column information
 * @param {string} relationName - Name of the relation property.
 * @param {Type<CanActivate>} [currentGuard] - Optional guard used to mirror generated query DTO visibility.
 * @returns {IApiBaseEntity | undefined} The relation target, or undefined when the filter cannot reach a relation under this name.
 */
export function ApiControllerGetListTransformGetRelationTarget<E>(entityMetadata: IApiEntity<E>, relationName: string, currentGuard?: Type<CanActivate>): IApiBaseEntity | undefined {
	const column: IApiEntityColumn<E> | undefined = entityMetadata.columns.find((entityColumn: IApiEntityColumn<E>): boolean => entityColumn.name == relationName);
	const metadata: unknown = column?.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY];

	if (!column?.relation?.target || !ApiControllerGetListIsToOneRelation(column) || !isRelationMetadata(metadata) || !DtoIsPropertyShouldBeMarked(EApiRouteType.GET_LIST, EApiDtoType.QUERY, relationName, metadata, column.isPrimary, currentGuard)) {
		return undefined;
	}

	return column.relation.target;
}

/**
 * Narrows the stored describe metadata of a column to relation describe properties.
 * @param {unknown} metadata - Stored describe metadata of the column.
 * @returns {boolean} Whether the metadata describes a relation.
 */
function isRelationMetadata(metadata: unknown): metadata is TApiPropertyDescribeProperties {
	return typeof metadata === "object" && metadata !== null && "type" in metadata && metadata.type === EApiPropertyDescribeType.RELATION;
}
