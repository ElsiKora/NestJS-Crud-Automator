import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { CanActivate, Type } from "@nestjs/common";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { DtoIsPropertyExposedInListResponse } from "@utility/dto/is/property/exposed/in-list-response.utility";
import { GenerateRelationEntityInformation } from "@utility/generate-relation-entity-information.utility";

/**
 * Determines whether a GET_LIST filter path names a described column whose value the list response hides, so no client may filter by it.
 * A column is hidden when TypeORM does not select it (`select: false`), when the generated list response does not expose its value for the route guard (see DtoIsPropertyExposedInListResponse), or when a manual list response DTO does not publish it.
 * A one-hop path `relation.field` is hidden when its relation is hidden, or when the field is hidden on the relation target; the manual response DTO limits only the relation name.
 * Filtering by a hidden column would reveal its values through which rows match.
 * @template E - The entity type
 * @param {IApiEntity<E>} entityMetadata - The entity metadata containing column information
 * @param {string} path - Filter path: a property name or `relation.field`.
 * @param {Type<CanActivate>} [currentGuard] - Route guard that decides guard-scoped response visibility.
 * @param {ReadonlySet<string>} [publishedFields] - Item properties a manual list response DTO publishes; omitted for a generated response.
 * @returns {boolean} True when the path names a described column the list response hides; false for a visible column and for a path that names no described column.
 */
export function ApiControllerGetListIsHiddenColumn<E>(entityMetadata: IApiEntity<E>, path: string, currentGuard?: Type<CanActivate>, publishedFields?: ReadonlySet<string>): boolean {
	const [rootName, nestedName]: Array<string | undefined> = path.split(".");
	const column: IApiEntityColumn<E> | undefined = entityMetadata.columns.find((entityColumn: IApiEntityColumn<E>): boolean => String(entityColumn.name) === rootName);

	if (!rootName || !column) {
		return false;
	}

	if (isColumnHidden(column, currentGuard, publishedFields)) {
		return true;
	}

	if (nestedName === undefined || !column.relation?.target) {
		return false;
	}

	const relationMetadata: IApiEntity<unknown> | undefined = GenerateRelationEntityInformation(column.relation.target);
	const nestedColumn: IApiEntityColumn<unknown> | undefined = relationMetadata?.columns.find((entityColumn: IApiEntityColumn<unknown>): boolean => String(entityColumn.name) === nestedName);

	return nestedColumn !== undefined && isColumnHidden(nestedColumn, currentGuard);
}

/**
 * Determines whether the list response hides the value of one described column.
 * @template E - The entity type
 * @param {IApiEntityColumn<E>} column - Entity column.
 * @param {Type<CanActivate>} [currentGuard] - Route guard that decides guard-scoped response visibility.
 * @param {ReadonlySet<string>} [publishedFields] - Item properties a manual list response DTO publishes.
 * @returns {boolean} True when the column is described and its value is hidden.
 */
function isColumnHidden<E>(column: IApiEntityColumn<E>, currentGuard?: Type<CanActivate>, publishedFields?: ReadonlySet<string>): boolean {
	const metadata: TApiPropertyDescribeProperties | undefined = column.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] as TApiPropertyDescribeProperties | undefined;
	const name: string = String(column.name);

	if (!metadata) {
		return false;
	}

	return column.isSelected === false || !DtoIsPropertyExposedInListResponse(name, metadata, column.isPrimary, currentGuard) || (publishedFields !== undefined && !publishedFields.has(name));
}
