import type { ExceptionFilter, OnApplicationBootstrap, Type } from "@nestjs/common";

import { ApiAuthorizationBootstrapValidationService } from "@class/api/authorization/bootstrap-validation.service.class";
import { CONTROLLER_API_DECORATOR_CONSTANT } from "@constant/decorator/api/controller.constant";
import { Catch, Inject, Injectable } from "@nestjs/common";
import { ModulesContainer } from "@nestjs/core";
import { ErrorException } from "@utility/error/exception.utility";

/**
 * The only exception class the check filter declares, so the filter never handles an exception of the application.
 */
class AuthorizationModuleCheckUnusedException extends Error {}

/**
 * Creates the check that fails startup when a securable controller is served by an application without `ApiAuthorizationModule`, where nothing validates its routes.
 * It is an exception filter because Nest calls the bootstrap hook of every static enhancer. That covers a controller with only plain routes and a request-scoped controller, whose own hook Nest does not call. It declares an exception class that nothing throws, so it never handles an exception.
 * Nest also creates the enhancers of a provider that inherits the decorator, and nothing serves a route there, so the check fails only for a controller.
 * @returns {Type<ExceptionFilter<AuthorizationModuleCheckUnusedException>>} The filter class to attach to the controller.
 */
export function AuthorizationCreateModuleCheck(): Type<ExceptionFilter<AuthorizationModuleCheckUnusedException>> {
	@Catch(AuthorizationModuleCheckUnusedException)
	@Injectable()
	class AuthorizationModuleCheck implements ExceptionFilter<AuthorizationModuleCheckUnusedException>, OnApplicationBootstrap {
		public constructor(@Inject(ModulesContainer) private readonly modulesContainer: ModulesContainer) {}

		/**
		 * Rethrows the exception; the filter declares an exception class that nothing throws, so Nest never calls it.
		 * @param {AuthorizationModuleCheckUnusedException} exception - The exception.
		 * @returns {never} Never returns.
		 * @throws {AuthorizationModuleCheckUnusedException} Always.
		 */
		public catch(exception: AuthorizationModuleCheckUnusedException): never {
			throw exception;
		}

		/**
		 * Fails startup when the application has a securable controller and no `ApiAuthorizationModule`.
		 * @returns {void}
		 * @throws {Error} When the application serves a securable controller without the module.
		 */
		public onApplicationBootstrap(): void {
			const modules: Array<{ controllers: Map<unknown, { metatype?: unknown }>; providers: Map<unknown, unknown> }> = [...this.modulesContainer.values()];

			if (modules.some((module: { providers: Map<unknown, unknown> }): boolean => module.providers.has(ApiAuthorizationBootstrapValidationService))) {
				return;
			}

			for (const { controllers } of modules) {
				for (const { metatype } of controllers.values()) {
					if (metatype && Reflect.getMetadata(CONTROLLER_API_DECORATOR_CONSTANT.SECURABLE_METADATA_KEY, metatype)) {
						throw ErrorException(`Controller "${(metatype as { name: string }).name}" is marked with @ApiControllerSecurable() but the application does not import ApiAuthorizationModule, so nothing would validate or authorize its routes: import ApiAuthorizationModule, or remove @ApiControllerSecurable()`);
					}
				}
			}
		}
	}

	return AuthorizationModuleCheck;
}
