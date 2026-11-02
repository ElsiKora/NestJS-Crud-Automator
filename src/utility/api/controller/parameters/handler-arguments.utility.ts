import type { Type } from "@nestjs/common";

import { PARAMTYPES_METADATA, ROUTE_ARGS_METADATA, RouteParamtypes } from "@nestjs/common/internal";
import { ErrorException } from "@utility/error/exception.utility";

/**
 * Rejects a handler argument that could read another path value than a policy saw on a securable route.
 * The guard writes the canonical text of each path value to `request.params`. A pipe on `@Param`, a `@Param("name")` declared as another type than a string, which a host `ValidationPipe({ transform: true })` converts, and a `@Param()` typed as another class than the PARAMETERS DTO would each convert that text by a rule the guard did not run.
 * @param {{ prototype: object }} controller - Controller class that serves the route.
 * @param {object} controller.prototype - Prototype that holds the handler.
 * @param {string} methodName - Handler name.
 * @param {Type<unknown> | undefined} dto - PARAMETERS DTO of the route.
 * @param {string} route - Controller and method, for the error message.
 * @returns {void}
 * @throws {Error} When a `@Param` argument has a pipe, a `@Param("name")` is not declared as a string, or a `@Param()` is typed as another class than the PARAMETERS DTO.
 */
export function ApiControllerParametersAssertHandlerArguments(controller: { prototype: object }, methodName: string, dto: Type<unknown> | undefined, route: string): void {
	// Nest keeps the arguments on the class that declares the handler, and a subclass reads them through its prototype chain.
	const routeArguments: Record<string, { data?: unknown; index: number; pipes?: Array<unknown> }> = (Reflect.getMetadata(ROUTE_ARGS_METADATA, controller, methodName) ?? {}) as Record<string, { data?: unknown; index: number; pipes?: Array<unknown> }>;
	const parameterTypes: Array<unknown> = (Reflect.getMetadata(PARAMTYPES_METADATA, controller.prototype, methodName) ?? []) as Array<unknown>;

	for (const [key, argument] of Object.entries(routeArguments)) {
		if (key.split(":")[0] !== String(RouteParamtypes.PARAM)) {
			continue;
		}

		const name: string | undefined = typeof argument.data === "string" ? argument.data : undefined;
		const type: unknown = parameterTypes[argument.index];
		const typeName: string = typeof type === "function" ? type.name : String(type);
		const subject: string = name === undefined ? "its path parameters" : `the path parameter "${name}"`;
		const dtoName: string = dto ? ` "${dto.name}"` : "";

		if ((argument.pipes ?? []).length > 0) {
			throw ErrorException(`${route} converts ${subject} with a pipe on @Param, so the handler could read another value than the policy saw: remove the pipe, and let the PARAMETERS DTO convert the value, which a @Param() typed as that DTO reads`);
		}

		if (name !== undefined && type !== undefined && type !== String && type !== Object) {
			throw ErrorException(`${route} declares the path parameter "${name}" as ${typeName} on @Param, so a host pipe could convert it to another value than the policy saw: declare it as a string, or read the converted value from a @Param() typed as the PARAMETERS DTO`);
		}

		if (name === undefined && type !== undefined && type !== Object && type !== (dto as unknown)) {
			throw ErrorException(`${route} reads its path parameters with @Param() typed as ${typeName}, not as its PARAMETERS DTO${dtoName}, so a host pipe could convert them to other values than the policy saw: type @Param() as the PARAMETERS DTO`);
		}
	}
}
