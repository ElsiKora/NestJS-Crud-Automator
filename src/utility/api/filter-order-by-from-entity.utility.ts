import type { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import type { IApiEntity } from "@interface/entity";
import type { CanActivate, Type } from "@nestjs/common";
import type { TApiFilterOrderBy, TFilterFieldSelector } from "@type/decorator/api/filter";
import type { TApiPropertyDescribeDtoQueryGetListProperties, TApiPropertyDescribeProperties } from "@type/decorator/api/property";
import type { TTypeOrmColumnMetadataArguments, TTypeOrmMetadataArgumentsStorage } from "@type/utility/typeorm";
import type { ObjectLiteral } from "typeorm";

import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { FILTER_API_INTERFACE_CONSTANT } from "@constant/interface/api";
import { DtoIsPropertyExposedInListResponse } from "@utility/dto/is/property/exposed-in-list-response.utility";
import { DtoIsPropertyShouldBeMarked } from "@utility/dto/is/property/should-be-marked.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { GetClassHierarchy } from "@utility/get/class-hierarchy.utility";
import { getMetadataArgsStorage } from "typeorm";

import "reflect-metadata";

/**
 * Extracts the client-orderable fields of an entity, including columns its parent classes declare, the single source of the orderBy enum and its validation.
 * A column is orderable only when the generated list response exposes its value (its GET_LIST RESPONSE side is enabled, a response field, not `isExpose: false`, and visible for the route guard), it is enabled as a query field, and it is not opted out with `useAsOrderByFilter: false`, all for the route guard;
 * a route with a manual response DTO also limits it to the item properties that DTO publishes. Ordering by any other column would reveal its values through row order.
 * Property names become snake_case enum keys.
 * @param {ObjectLiteral} entity - The entity class
 * @param {IApiEntity<E>} entityMetadata - The entity metadata containing column information
 * @param {EApiRouteType} method - The type of route (CREATE, DELETE, GET, etc.)
 * @param {EApiDtoType} dtoType - The type of DTO (REQUEST, RESPONSE, etc.)
 * @param {TFilterFieldSelector<typeof entity>} [fieldSelector] - Optional selector to include/exclude specific fields
 * @param {Type<CanActivate>} [currentGuard] - Route guard that decides guard-scoped response and query visibility
 * @param {ReadonlySet<string>} [publishedFields] - Item properties a manual list response DTO publishes; omitted for a generated response
 * @returns {TApiFilterOrderBy<typeof entity>} An object mapping snake_case column names to camelCase property names
 * @throws {Error} When a field in the fieldSelector doesn't exist in the entity
 * @template E - The entity type
 */
export function FilterOrderByFromEntity<E>(entity: ObjectLiteral, entityMetadata: IApiEntity<E>, method: EApiRouteType, dtoType: EApiDtoType, fieldSelector?: TFilterFieldSelector<typeof entity>, currentGuard?: Type<CanActivate>, publishedFields?: ReadonlySet<string>): TApiFilterOrderBy<typeof entity> {
	const metadata: TTypeOrmMetadataArgumentsStorage = getMetadataArgsStorage();
	// Columns a parent class or a table inheritance root declares belong to the entity too.
	const columns: Array<TTypeOrmColumnMetadataArguments> = metadata.filterColumns(GetClassHierarchy(entity));

	if (fieldSelector) {
		const entityFields: Set<string> = new Set<string>(columns.map((col: TTypeOrmColumnMetadataArguments) => col.propertyName));

		for (const field in fieldSelector) {
			if (!entityFields.has(field)) {
				throw ErrorException(`Field "${field}" does not exist in the entity.`);
			}
		}
	}

	const accumulator: TApiFilterOrderBy<typeof entity> = {};

	for (const column of columns) {
		const columnType: string | Type = (column.options?.type as string | Type) || (Reflect.getMetadata("design:type", entity.prototype as object, column.propertyName) as string | Type);

		const isAllowedType: boolean = (typeof columnType === "function" && (columnType === String || columnType === Number || columnType === Date)) || (FILTER_API_INTERFACE_CONSTANT.ALLOWED_ENTITY_TO_FILTER_COLUMNS.includes(columnType as string) && fieldSelector?.[column.propertyName as keyof typeof entity] !== false);

		if (isAllowedType) {
			for (const metadataColumn of entityMetadata.columns) {
				const metadata: TApiPropertyDescribeProperties | undefined = metadataColumn.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] as TApiPropertyDescribeProperties | undefined;
				const methodProperties: Partial<Record<EApiDtoType, TApiPropertyDescribeDtoQueryGetListProperties>> | undefined = metadata?.properties?.[method] as Partial<Record<EApiDtoType, TApiPropertyDescribeDtoQueryGetListProperties>> | undefined;

				const isOrderable: boolean = metadata !== undefined && methodProperties?.[dtoType]?.useAsOrderByFilter !== false && (publishedFields === undefined || publishedFields.has(column.propertyName)) && DtoIsPropertyExposedInListResponse(column.propertyName, metadata, metadataColumn.isPrimary, currentGuard) && DtoIsPropertyShouldBeMarked(method, dtoType, column.propertyName, metadata, false, currentGuard);

				if (metadataColumn.name == column.propertyName && metadata && isOrderable) {
					const snakeUpperCase: string = column.propertyName
						// eslint-disable-next-line @elsikora/unicorn/prefer-spread
						.split("")
						.map((char: string, index: number): string => {
							if (index > 0 && char === char.toUpperCase() && char !== char.toLowerCase()) {
								return "_" + char;
							}

							return char;
						})
						.join("")
						.toUpperCase();

					accumulator[snakeUpperCase as keyof TApiFilterOrderBy<typeof entity>] = column.propertyName;
				}
			}
		}
	}

	return accumulator;
}
