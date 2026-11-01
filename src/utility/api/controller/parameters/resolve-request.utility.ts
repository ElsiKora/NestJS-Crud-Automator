import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerParametersRule } from "@interface/class/api/controller";

import { ApiControllerParametersValidate } from "./validate.utility";

const requestParametersCache: WeakMap<object, Record<string, unknown>> = new WeakMap<object, Record<string, unknown>>();

/**
 * Resolves the typed path values of one request.
 * The values are validated and converted once, by whichever of the authorization guard and the route runtime runs first, and every later reader of the same request gets the cached result.
 * @template E - Entity type owned by the generated route.
 * @param {unknown} request - HTTP request object, used as the cache key.
 * @param {IApiControllerParametersRule | undefined} rule - Path value rule of the route: the generated route rule of the handler, or the custom route rule of the controller.
 * @param {Partial<E> | undefined} parameters - Path values as Nest passed them to the handler.
 * @returns {Promise<Partial<E> | undefined>} A copy of the typed path values, or the given values when the route has no path value rule.
 * @throws {Error} A Nest `BadRequestException` with the body a `ValidationPipe` returns, when any path value fails its described type.
 */
export async function ApiControllerParametersResolveRequest<E extends IApiBaseEntity>(request: unknown, rule: IApiControllerParametersRule | undefined, parameters: Partial<E> | undefined): Promise<Partial<E> | undefined> {
	if (!rule) {
		return parameters;
	}

	const cacheKey: object | undefined = typeof request === "object" && request !== null ? request : undefined;
	const cached: Record<string, unknown> | undefined = cacheKey ? requestParametersCache.get(cacheKey) : undefined;

	if (cached) {
		return { ...cached } as Partial<E>;
	}

	const validated: Partial<E> = await ApiControllerParametersValidate<E>(rule, parameters);

	if (cacheKey) {
		requestParametersCache.set(cacheKey, validated);
	}

	return { ...validated };
}
