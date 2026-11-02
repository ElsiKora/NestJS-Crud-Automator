import type { IApiEntity } from "@interface/entity";
import type { CanActivate, Type } from "@nestjs/common";

import { ApiControllerGetListQueryGetPublishedNames } from "@utility/api/controller/get-list/query/get-published-names.utility";
import { ApiControllerGetListTransformGetFilterMetadata } from "@utility/api/controller/get-list/transform/get-filter-metadata.utility";
import { ErrorException } from "@utility/error/exception.utility";

const FILTER_GROUP_KEY_PATTERN: RegExp = /^([^[]*)\[(?:operator|value|values)\]/u;

/**
 * Fails startup when a QUERY DTO publishes a filter group the route cannot apply, so the mistake shows before the first request answers `400`.
 * Any other published key, such as `campaign`, is the DTO's own and not judged here.
 * @template E - The entity type
 * @param {string} controllerName - Controller name, shown in the error.
 * @param {Type<unknown>} dto - Manual QUERY DTO of the route.
 * @param {IApiEntity<E>} entityMetadata - The entity metadata containing column information
 * @param {Type<CanActivate>} [currentGuard] - Optional guard used to mirror generated query DTO visibility.
 * @throws {Error} When the DTO publishes a filter group the route cannot apply.
 */
export function ApiControllerGetListTransformAssertPublishedFilters<E>(controllerName: string, dto: Type<unknown>, entityMetadata: IApiEntity<E>, currentGuard?: Type<CanActivate>): void {
	for (const key of ApiControllerGetListQueryGetPublishedNames(dto)) {
		const field: string | undefined = FILTER_GROUP_KEY_PATTERN.exec(key)?.[1];

		if (field !== undefined && !ApiControllerGetListTransformGetFilterMetadata(entityMetadata, field, currentGuard)) {
			throw ErrorException(`${controllerName}: GET_LIST QUERY DTO ${dto.name} publishes "${key}", a filter the route cannot apply. Filter a described column or a one-hop to-one relation path, or remove the key.`);
		}
	}
}
