import { EApiDtoType } from "@enum/decorator/api";
import { PARAMTYPES_METADATA, ROUTE_ARGS_METADATA, RouteParamtypes } from "@nestjs/common/internal";
import { DtoRequestWireBindDto } from "@utility/dto/request-wire/bind/dto.utility";

const ARGUMENT_DTO_TYPES: ReadonlyMap<string, { dtoType: EApiDtoType; name: string }> = new Map<string, { dtoType: EApiDtoType; name: string }>([
	[String(RouteParamtypes.BODY), { dtoType: EApiDtoType.BODY, name: "body" }],
	[String(RouteParamtypes.PARAM), { dtoType: EApiDtoType.PARAMETERS, name: "parameters" }],
	[String(RouteParamtypes.QUERY), { dtoType: EApiDtoType.QUERY, name: "query" }],
]);

/**
 * Binds the DTO class of each `@Body()`, `@Query()` and `@Param()` argument of a route handler, whole or keyed, to that part of the request with `DtoRequestWireBindDto`.
 * @param {object} controller - Controller class that holds the route arguments.
 * @param {string | symbol} methodName - Handler method name.
 * @returns {void}
 * @throws {Error} When a DTO class is read both from a JSON body and from a query or a path.
 */
export function DtoRequestWireBindRoute(controller: object, methodName: string | symbol): void {
	const routeArguments: Record<string, { index?: number }> = (Reflect.getMetadata(ROUTE_ARGS_METADATA, controller, methodName) as Record<string, { index?: number }> | undefined) ?? {};
	const prototype: unknown = (controller as { prototype?: unknown }).prototype;
	const parameterTypes: Array<unknown> = typeof prototype === "object" && prototype !== null ? ((Reflect.getMetadata(PARAMTYPES_METADATA, prototype, methodName) as Array<unknown> | undefined) ?? []) : [];

	for (const [key, { index }] of Object.entries(routeArguments)) {
		const argument: { dtoType: EApiDtoType; name: string } | undefined = ARGUMENT_DTO_TYPES.get(key.split(":")[0] ?? "");

		if (argument && index !== undefined) {
			DtoRequestWireBindDto(parameterTypes[index], argument.dtoType, `the ${argument.name} of route ${String(methodName)} in controller ${String((controller as { name?: string }).name)}`);
		}
	}
}
