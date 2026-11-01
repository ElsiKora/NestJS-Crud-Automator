import type { ExceptionFilter, OnApplicationBootstrap, Type } from "@nestjs/common";

import { Catch, Inject, Injectable } from "@nestjs/common";
import { EXCEPTION_FILTERS_METADATA } from "@nestjs/common/internal";
import { ModulesContainer } from "@nestjs/core";
import { ErrorException } from "@utility/error/exception.utility";

/**
 * The only exception class the check filter declares, so the filter never handles an exception of the application.
 */
class ApiRouteAnonymousCheckUnusedException extends Error {}

/**
 * Creates the check that fails startup when a custom route of a class without a name is served as it is.
 * Such a class has no schema prefix, so the route has no generated DTOs and no request validation until a class decorated with `@ApiController` inherits it, which drops the check.
 * It is an exception filter because Nest calls the bootstrap hook of every static enhancer; it declares an exception class that nothing throws, so it never handles an exception.
 * Nest also creates the enhancers of a provider that inherits the handler, and nothing serves a route there, so the check fails only for a controller.
 * @param {string} routeName - Handler method name.
 * @param {string} routePath - Route path.
 * @returns {Type<ExceptionFilter<ApiRouteAnonymousCheckUnusedException>>} The filter class to attach to the handler.
 */
export function ApiRouteCreateAnonymousCheck(routeName: string, routePath: string | undefined): Type<ExceptionFilter<ApiRouteAnonymousCheckUnusedException>> {
	@Catch(ApiRouteAnonymousCheckUnusedException)
	@Injectable()
	class ApiRouteAnonymousCheck implements ExceptionFilter<ApiRouteAnonymousCheckUnusedException>, OnApplicationBootstrap {
		public constructor(@Inject(ModulesContainer) private readonly modulesContainer: ModulesContainer) {}

		/**
		 * Rethrows the exception; the filter declares an exception class that nothing throws, so Nest never calls it.
		 * @param {ApiRouteAnonymousCheckUnusedException} exception - The exception.
		 * @returns {never} Never returns.
		 * @throws {ApiRouteAnonymousCheckUnusedException} Always.
		 */
		public catch(exception: ApiRouteAnonymousCheckUnusedException): never {
			throw exception;
		}

		/**
		 * Fails startup when a controller serves this handler: this check is on the served handler only when no class decorated with `@ApiController` took the route over.
		 * @returns {void}
		 * @throws {Error} When a controller of the application serves the handler.
		 */
		public onApplicationBootstrap(): void {
			for (const { controllers } of this.modulesContainer.values()) {
				for (const { metatype } of controllers.values()) {
					if (metatype && isCheckOnServedHandler(metatype, routeName, ApiRouteAnonymousCheck)) {
						throw ErrorException(`Custom route "${routeName}" with path "${String(routePath)}" is declared on a class without a name and served without @ApiController, so it would have no generated DTOs and no request validation. Name the class, or inherit the route in a class decorated with @ApiController`);
					}
				}
			}
		}
	}

	return ApiRouteAnonymousCheck;
}

/**
 * Tells whether the handler a controller serves carries a check. Nest serves the closest definition of a method name, and an override has no check. Accessors do not run.
 * @param {object} controller - Controller class.
 * @param {string} routeName - Handler method name.
 * @param {object} check - The check filter class.
 * @returns {boolean} Whether the served handler carries the check.
 */
function isCheckOnServedHandler(controller: object, routeName: string, check: object): boolean {
	for (let prototype: null | object = (controller as { prototype: object }).prototype; prototype && prototype !== Object.prototype; prototype = Object.getPrototypeOf(prototype) as null | object) {
		const handler: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(prototype, routeName);

		if (handler) {
			return typeof handler.value === "function" && ((Reflect.getMetadata(EXCEPTION_FILTERS_METADATA, handler.value as object) ?? []) as Array<unknown>).includes(check);
		}
	}

	return false;
}
