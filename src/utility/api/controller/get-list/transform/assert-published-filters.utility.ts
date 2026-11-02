import type { IApiEntity } from "@interface/entity";
import type { CanActivate, Type } from "@nestjs/common";

import { ApiControllerGetListIsHiddenColumn } from "@utility/api/controller/get-list/is-hidden-column.utility";
import { ApiControllerGetListQueryGetPublishedNames } from "@utility/api/controller/get-list/query/get-published-names.utility";
import { ApiControllerGetListTransformGetFilterMetadata } from "@utility/api/controller/get-list/transform/get-filter-metadata.utility";
import { ClassTransformerGetStorage } from "@utility/class-transformer/get-storage.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { TransformationType } from "class-transformer";

const FILTER_GROUP_KEY_PATTERN: RegExp = /^([^[]*)\[(?:operator|value|values)\]/u;

/**
 * Fails startup when a QUERY DTO publishes a filter group the route cannot apply, so the mistake shows before the first request answers `400`.
 * A filter property exposed under another name fails too: the route reads a filter from its own query key, not from the converted DTO, so it would never apply that property.
 * A filter on a column the list response hides fails too, so no client infers its values from which rows match.
 * Any other published key, such as `campaign`, is the DTO's own and not judged here.
 * @template E - The entity type
 * @param {string} controllerName - Controller name, shown in the error.
 * @param {Type<unknown>} dto - Manual QUERY DTO of the route.
 * @param {IApiEntity<E>} entityMetadata - The entity metadata containing column information
 * @param {Type<CanActivate>} [currentGuard] - Optional guard used to mirror generated query DTO visibility.
 * @param {ReadonlySet<string>} [publishedFields] - Item properties a manual list response DTO publishes; omitted for a generated response.
 * @throws {Error} When the DTO publishes a filter group the route cannot apply, one on a column the list response hides, or exposes a filter property under another name.
 */
export function ApiControllerGetListTransformAssertPublishedFilters<E>(controllerName: string, dto: Type<unknown>, entityMetadata: IApiEntity<E>, currentGuard?: Type<CanActivate>, publishedFields?: ReadonlySet<string>): void {
	const storage: ReturnType<typeof ClassTransformerGetStorage> = ClassTransformerGetStorage(dto.prototype as object, "query");

	for (const propertyName of storage.getExposedProperties(dto, TransformationType.PLAIN_TO_CLASS)) {
		const exposedName: string | undefined = storage.findExposeMetadata(dto, propertyName)?.options?.name;

		if (exposedName && exposedName !== propertyName && FILTER_GROUP_KEY_PATTERN.test(propertyName)) {
			throw ErrorException(`${controllerName}: GET_LIST QUERY DTO ${dto.name} exposes the filter property "${propertyName}" as "${exposedName}". The route reads a filter from its own query key, so it would never apply this one. Remove the name from @Expose.`);
		}
	}

	for (const key of ApiControllerGetListQueryGetPublishedNames(dto)) {
		const field: string | undefined = FILTER_GROUP_KEY_PATTERN.exec(key)?.[1];

		if (field === undefined || ApiControllerGetListTransformGetFilterMetadata(entityMetadata, field, currentGuard, publishedFields)) {
			continue;
		}

		if (ApiControllerGetListIsHiddenColumn(entityMetadata, field, currentGuard, publishedFields)) {
			throw ErrorException(`${controllerName}: GET_LIST QUERY DTO ${dto.name} publishes "${key}", a filter on a field the list response hides, so no client may filter by it. Remove the key.`);
		}

		throw ErrorException(`${controllerName}: GET_LIST QUERY DTO ${dto.name} publishes "${key}", a filter the route cannot apply. Filter a described column or a one-hop to-one relation path, or remove the key.`);
	}
}
