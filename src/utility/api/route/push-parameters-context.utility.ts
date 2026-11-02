import type { EApiRouteType } from "@enum/decorator/api/route";
import type { IDtoAutoContextMetadata } from "@type/auto-context-metadata.type";

import { EApiDtoType } from "@enum/decorator/api";
import { API_CONTROLLER_PARAMETERS_AUTO_COPY_METADATA_KEY } from "@utility/api/controller/parameters/dto/metadata-key.constant";
import { DtoAutoContextPush } from "@utility/dto/auto/context/push.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { GetAutoDtoContext } from "@utility/get/auto-dto-context.utility";

/**
 * Gives the PARAMETERS DTO of a custom route the context of that route, its route type and `PARAMETERS`, so an `ApiPropertyCopy` with `shouldAutoResolveContext` on the DTO copies its column as the generated PARAMETERS DTO of that route type does.
 * Only a DTO with such a copy gets the context. A route without a route type gives none, and startup then refuses the copy, which no rule could check a path value by.
 * @param {unknown} dto - `dto[EApiDtoType.PARAMETERS]` of the custom route.
 * @param {EApiRouteType | undefined} routeType - `route.type` of the custom route.
 * @returns {void}
 * @throws {Error} When the DTO already has the context of a route of another route type, whose copy it follows.
 */
export function ApiRoutePushParametersContext(dto: unknown, routeType: EApiRouteType | undefined): void {
	if (typeof dto !== "function" || routeType === undefined) {
		return;
	}

	const prototype: object = (dto as { prototype: object }).prototype;
	const autoCopies: ReadonlyArray<string> = (Reflect.getMetadata(API_CONTROLLER_PARAMETERS_AUTO_COPY_METADATA_KEY, prototype) as ReadonlyArray<string> | undefined) ?? [];

	if (autoCopies.length === 0) {
		return;
	}

	const context: IDtoAutoContextMetadata | undefined = GetAutoDtoContext(prototype);

	if (context?.method === routeType && context.dtoType === EApiDtoType.PARAMETERS) {
		return;
	}

	if (context) {
		throw ErrorException(`The PARAMETERS DTO "${dto.name}" copies an entity column with shouldAutoResolveContext and is served by custom routes of the route types "${context.method}" and "${routeType}", so its copy cannot follow both: give the copy method and dtoType, or declare a PARAMETERS DTO for each route type`);
	}

	DtoAutoContextPush(prototype, routeType, EApiDtoType.PARAMETERS);
}
