import type { EApiRouteType } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiRouteDocumentationProperties } from "@interface/decorator/api/route/documentation-properties.interface";

import { pluralizer } from "@elsikora/pluralizer";
import { EApiRouteType as EApiRouteTypeValue } from "@enum/decorator/api";

/**
 * Builds default Swagger documentation for generated CRUD routes.
 * @param {object} options - Route documentation inputs.
 * @param {IApiRouteDocumentationProperties} [options.documentation] - User-provided overrides.
 * @param {IApiBaseEntity} options.entity - Entity represented by the route.
 * @param {EApiRouteType} options.routeType - Generated CRUD route type.
 * @returns {IApiRouteDocumentationProperties} Documentation metadata for ApiMethod.
 */
export function ApiRouteBuildDocumentation(options: { documentation?: IApiRouteDocumentationProperties; entity: IApiBaseEntity; routeType: EApiRouteType }): IApiRouteDocumentationProperties {
	const resourceName: string = pluralizer.toPlural(options.entity.name ?? "UnknownResource");
	let summary: string;
	let description: string;

	switch (options.routeType) {
		case EApiRouteTypeValue.CREATE: {
			summary = `Creating \`${resourceName}\``;
			description = `This method is used for creating \`${resourceName}\``;

			break;
		}

		case EApiRouteTypeValue.DELETE: {
			summary = `Deleting \`${resourceName}\``;
			description = `This method is used for deleting \`${resourceName}\``;

			break;
		}

		case EApiRouteTypeValue.GET: {
			summary = `Fetching \`${resourceName}\``;
			description = `This method is used for fetching \`${resourceName}\``;

			break;
		}

		case EApiRouteTypeValue.GET_LIST: {
			summary = `Fetching list of \`${resourceName}\``;
			description = `This method is used for fetching list of \`${resourceName}\``;

			break;
		}

		case EApiRouteTypeValue.PARTIAL_UPDATE: {
			summary = `Partially updating \`${resourceName}\``;
			description = `This method is used for partially updating \`${resourceName}\``;

			break;
		}

		case EApiRouteTypeValue.UPDATE: {
			summary = `Updating \`${resourceName}\``;
			description = `This method is used for updating \`${resourceName}\``;

			break;
		}
	}

	return {
		description: options.documentation?.description ?? description,
		operationId: options.documentation?.operationId,
		summary: options.documentation?.summary ?? summary,
	};
}
