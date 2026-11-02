import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { CanActivate, Type } from "@nestjs/common";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { EApiDtoType, EApiPropertyDescribeType, EApiRouteType } from "@enum/decorator/api";
import { ApiControllerGetListTransformGetRelationTarget } from "@utility/api/controller/get-list/transform/get-relation-target.utility";
import { DtoIsPropertyShouldBeMarked } from "@utility/dto/is/property/should-be-marked.utility";
import { GenerateRelationEntityInformation } from "@utility/generate-relation-entity-information.utility";

/**
 * Returns the describe metadata of the column a GET_LIST filter field applies to, or nothing when a route without a typed filter cannot apply it.
 * This is the one rule for that, shared by the request filter and the startup check of a manual QUERY DTO.
 * @template E - The entity type
 * @param {IApiEntity<E>} entityMetadata - The entity metadata containing column information
 * @param {string} field - Filter field, a column such as `label` or a one-hop to-one path such as `owner.name`.
 * @param {Type<CanActivate>} [currentGuard] - Optional guard used to mirror generated query DTO visibility.
 * @returns {TApiPropertyDescribeProperties | undefined} The describe metadata, or undefined when the field cannot be applied.
 */
export function ApiControllerGetListTransformGetFilterMetadata<E>(entityMetadata: IApiEntity<E>, field: string, currentGuard?: Type<CanActivate>): TApiPropertyDescribeProperties | undefined {
	const path: Array<string> = field.split(".");

	if (path.length === 1) {
		const column: IApiEntityColumn<E> | undefined = entityMetadata.columns.find((entityColumn: IApiEntityColumn<E>): boolean => entityColumn.name == field);
		const metadata: TApiPropertyDescribeProperties | undefined = column?.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] as TApiPropertyDescribeProperties | undefined;

		return column && metadata && metadata.type !== EApiPropertyDescribeType.RELATION && DtoIsPropertyShouldBeMarked(EApiRouteType.GET_LIST, EApiDtoType.QUERY, field, metadata, column.isPrimary, currentGuard) ? metadata : undefined;
	}

	const [relationName, nestedPropertyName]: Array<string | undefined> = path;

	// eslint-disable-next-line @elsikora/typescript/no-magic-numbers
	if (path.length !== 2 || !relationName || !nestedPropertyName) {
		return undefined;
	}

	const relationTarget: IApiBaseEntity | undefined = ApiControllerGetListTransformGetRelationTarget(entityMetadata, relationName, currentGuard);
	const relationEntityMetadata: IApiEntity<unknown> | undefined = relationTarget ? GenerateRelationEntityInformation(relationTarget) : undefined;
	const nestedColumn: IApiEntityColumn<unknown> | undefined = relationEntityMetadata?.columns.find((column: IApiEntityColumn<unknown>): boolean => column.name == nestedPropertyName);
	const nestedMetadata: TApiPropertyDescribeProperties | undefined = nestedColumn?.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] as TApiPropertyDescribeProperties | undefined;

	return nestedMetadata && nestedMetadata.type !== EApiPropertyDescribeType.RELATION && nestedMetadata.type !== EApiPropertyDescribeType.OBJECT && DtoIsPropertyShouldBeMarked(EApiRouteType.GET_LIST, EApiDtoType.QUERY, nestedPropertyName, nestedMetadata, false, currentGuard) ? nestedMetadata : undefined;
}
