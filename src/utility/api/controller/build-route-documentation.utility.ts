import type { EApiRouteType } from "@enum/decorator/api";
import type { IApiRouteDocumentationProperties } from "@interface/decorator/api/route/documentation-properties.interface";

import { pluralizer } from "@elsikora/pluralizer";
import { EApiRouteType as EApiRouteTypeValue } from "@enum/decorator/api";

/**
 * Builds default Swagger documentation for generated CRUD routes.
 * @param {object} options - Route documentation inputs.
 * @param {IApiRouteDocumentationProperties} [options.documentation] - User-provided overrides.
 * @param {string} options.resourceName - Human-friendly resource name represented by the route.
 * @param {EApiRouteType} options.routeType - Generated CRUD route type.
 * @returns {IApiRouteDocumentationProperties} Documentation metadata for ApiMethod.
 */
export function ApiControllerBuildRouteDocumentation(options: { documentation?: IApiRouteDocumentationProperties; resourceName: string; routeType: EApiRouteType }): IApiRouteDocumentationProperties {
	const pluralResourceName: string = pluralizer.toPlural(options.resourceName);
	const singularResourceName: string = pluralizer.toSingular(options.resourceName);
	let summary: string;
	let description: string;

	switch (options.routeType) {
		case EApiRouteTypeValue.CREATE: {
			summary = `Create \`${singularResourceName}\``;
			description = `Creates a new \`${singularResourceName}\` resource.`;

			break;
		}

		case EApiRouteTypeValue.DELETE: {
			summary = `Delete \`${singularResourceName}\``;
			description = `Deletes an existing \`${singularResourceName}\` resource.`;

			break;
		}

		case EApiRouteTypeValue.GET: {
			summary = `Get \`${singularResourceName}\``;
			description = `Returns a single \`${singularResourceName}\` resource by its identifier.`;

			break;
		}

		case EApiRouteTypeValue.GET_LIST: {
			summary = `List \`${pluralResourceName}\``;
			description = `Returns a paginated list of \`${pluralResourceName}\` resources.`;

			break;
		}

		case EApiRouteTypeValue.PARTIAL_UPDATE: {
			summary = `Partially update \`${singularResourceName}\``;
			description = `Partially updates an existing \`${singularResourceName}\` resource.`;

			break;
		}

		case EApiRouteTypeValue.UPDATE: {
			summary = `Update \`${singularResourceName}\``;
			description = `Replaces an existing \`${singularResourceName}\` resource.`;

			break;
		}
	}

	return {
		description: options.documentation?.description ?? description,
		operationId: options.documentation?.operationId,
		summary: options.documentation?.summary ?? summary,
	};
}
