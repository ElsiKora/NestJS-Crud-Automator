import type { EApiDtoType, EApiRouteType } from "@enum/index";

import { GetAutoDtoContext } from "@utility/get/auto-dto-context.utility";

/**
 * Resolves decorator context using explicit config or auto-propagated DTO metadata.
 * @param {object} target - Decorated DTO prototype.
 * @param {EApiRouteType | undefined} method - Explicit method override.
 * @param {EApiDtoType | undefined} dtoType - Explicit DTO type override.
 * @param {boolean} shouldAutoResolve - Whether to pull context from auto DTO pipeline.
 * @returns {{ dtoType: EApiDtoType; method: EApiRouteType } | undefined} Resolved context if available.
 */
export function ResolveDecoratorContext(target: object, method: EApiRouteType | undefined, dtoType: EApiDtoType | undefined, shouldAutoResolve: boolean): { dtoType: EApiDtoType; method: EApiRouteType } | undefined {
	let resolvedMethod: EApiRouteType | undefined = method;
	let resolvedDtoType: EApiDtoType | undefined = dtoType;

	if (shouldAutoResolve && (!resolvedMethod || !resolvedDtoType)) {
		const context: { dtoType: EApiDtoType; method: EApiRouteType } | undefined = GetAutoDtoContext(target);

		if (!context) {
			return undefined;
		}

		resolvedMethod ??= context.method;
		resolvedDtoType ??= context.dtoType;
	}

	if (!resolvedMethod || !resolvedDtoType) {
		return undefined;
	}

	return { dtoType: resolvedDtoType, method: resolvedMethod };
}
