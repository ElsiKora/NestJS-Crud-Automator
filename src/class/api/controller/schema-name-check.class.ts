import type { IApiControllerSchemaNameController } from "@interface/utility/schema-name";
import type { ExceptionFilter, OnApplicationBootstrap } from "@nestjs/common";
import type { InstanceWrapper, Module } from "@nestjs/core/internal";
import type { TApiControllerConstructor } from "@type/decorator/api/controller";

import { CONTROLLER_STARTUP_CHECK_METADATA_KEY } from "@constant/decorator/api/controller-startup-check.constant";
import { Catch, Injectable } from "@nestjs/common";
import { ModulesContainer } from "@nestjs/core";
import { ApiControllerAssertSchemaNames } from "@utility/api/controller/assert-schema-names.utility";
import { DtoRequestWireBindController } from "@utility/dto/request-wire/bind";

/**
 * The only exception class the check filter declares, so the filter never handles an exception of the application.
 */
class ApiControllerSchemaNameCheckUnusedException extends Error {}

const CHECKED_APPLICATIONS: WeakSet<ModulesContainer> = new WeakSet<ModulesContainer>();

/**
 * Checks at bootstrap that the controllers of one application keep their OpenAPI component names apart.
 * `ApiController` attaches it to the controller class as an exception filter, because Nest calls the bootstrap hook of every static enhancer,
 * also when the controller is REQUEST-scoped or the authorization guard is overridden; it declares an exception class that nothing throws, so it never handles an exception.
 * Each application is checked once, however many controllers and modules carry the filter.
 */
@Catch(ApiControllerSchemaNameCheckUnusedException)
@Injectable()
export class ApiControllerSchemaNameCheck implements ExceptionFilter<ApiControllerSchemaNameCheckUnusedException>, OnApplicationBootstrap {
	public constructor(private readonly modulesContainer: ModulesContainer) {}

	/**
	 * Rethrows the exception; the filter declares an exception class that nothing throws, so Nest never calls it.
	 * @param {ApiControllerSchemaNameCheckUnusedException} exception - The exception.
	 * @returns {never} Never returns.
	 * @throws {ApiControllerSchemaNameCheckUnusedException} Always.
	 */
	public catch(exception: ApiControllerSchemaNameCheckUnusedException): never {
		throw exception;
	}

	/**
	 * Runs the startup check of each controller, whose constructor a REQUEST-scoped controller only runs on a request, and binds the request DTOs of each of its routes to where the route reads them.
	 * Fails startup when two controller classes of this application have one schema prefix, two classes in its route schemas have one component name, or one DTO class is read from a JSON body and from a query or a path.
	 * @returns {void}
	 */
	public onApplicationBootstrap(): void {
		if (CHECKED_APPLICATIONS.has(this.modulesContainer)) {
			return;
		}

		CHECKED_APPLICATIONS.add(this.modulesContainer);

		for (const module of this.modulesContainer.values()) {
			for (const wrapper of module.controllers.values()) {
				if (wrapper.metatype) {
					DtoRequestWireBindController(wrapper.metatype);
					(Reflect.getMetadata(CONTROLLER_STARTUP_CHECK_METADATA_KEY, wrapper.metatype) as ((controller: TApiControllerConstructor, isConstructedPerRequest: boolean) => void) | undefined)?.(wrapper.metatype as TApiControllerConstructor, !wrapper.isDependencyTreeStatic());
				}
			}
		}

		ApiControllerAssertSchemaNames(
			[...this.modulesContainer.values()].flatMap((module: Module): Array<IApiControllerSchemaNameController> =>
				[...module.controllers.values()].flatMap((wrapper: InstanceWrapper): Array<IApiControllerSchemaNameController> => {
					if (!wrapper.metatype) {
						return [];
					}

					return [{ controller: wrapper.metatype as IApiControllerSchemaNameController["controller"], moduleName: (module.metatype as { name?: string } | undefined)?.name }];
				}),
			),
		);
	}
}
