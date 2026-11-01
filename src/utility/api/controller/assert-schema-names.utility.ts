import type { IApiControllerSchemaNameController, IDtoSchemaNameRoot } from "@interface/utility/schema-name";

import { SWAGGER_METADATA_CONSTANT } from "@constant/swagger";
import { DTO_SCHEMA_NAME_CONSTANT } from "@constant/utility/dto/schema-name.constant";
import { PARAMTYPES_METADATA, PATH_METADATA, ROUTE_ARGS_METADATA, RouteParamtypes } from "@nestjs/common/internal";
import { ApiControllerGetSchemaPrefix } from "@utility/api/controller/get/schema-prefix.utility";
import { DtoSchemaNameAssertUnique } from "@utility/dto/schema-name/assert-unique.utility";
import { ErrorException } from "@utility/error/exception.utility";

const REQUEST_ARGUMENT_NAMES: ReadonlyMap<string, string> = new Map<string, string>([
	[String(RouteParamtypes.BODY), "body"],
	[String(RouteParamtypes.PARAM), "parameters"],
	[String(RouteParamtypes.QUERY), "query"],
]);

/**
 * Fails startup when the controllers of one application cannot all keep their OpenAPI component names apart:
 * two different decorated controller classes with one schema prefix, or two different classes with one name anywhere in a route schema
 * of any controller, decorated or plain (responses, body, query and parameters of generated, custom and plain Nest routes, at any depth).
 * Only the controllers of this application count, so a module evaluated again (webpack HMR, `vi.resetModules`) and a second application in the process need no special case.
 * @param {ReadonlyArray<IApiControllerSchemaNameController>} controllers - Controllers registered in the application.
 * @returns {void}
 * @throws {Error} When two controller classes have one schema prefix, two classes have one component name, or a lazy type cannot be resolved.
 */
export function ApiControllerAssertSchemaNames(controllers: ReadonlyArray<IApiControllerSchemaNameController>): void {
	const prefixOwners: Map<string, { controller: object; description: string }> = new Map<string, { controller: object; description: string }>();
	const roots: Array<IDtoSchemaNameRoot> = [];

	for (const { controller, moduleName } of controllers) {
		// A subclass or mixin of a decorated controller inherits the decorated class, whose prefix its generated routes use.
		const decoratedController: object | undefined = Reflect.getMetadata(DTO_SCHEMA_NAME_CONSTANT.CONTROLLER_METADATA_KEY, controller) as object | undefined;

		roots.push(...collectControllerRoots(controller));

		if (!decoratedController) {
			continue;
		}

		const schemaPrefix: string = ApiControllerGetSchemaPrefix(decoratedController);
		const moduleDescription: string = moduleName ? ` in module ${moduleName}` : "";
		const description: string = `${controller.name}${moduleDescription} (path "${String(Reflect.getMetadata(PATH_METADATA, controller))}")`;
		const owner: { controller: object; description: string } | undefined = prefixOwners.get(schemaPrefix);

		if (owner && owner.controller !== decoratedController) {
			throw ErrorException(`Controllers ${owner.description} and ${description} have the same schema prefix "${schemaPrefix}" in one application. Rename one of the controller classes, because the prefix starts every generated DTO and OpenAPI component name`);
		}

		prefixOwners.set(schemaPrefix, { controller: decoratedController, description });
	}

	DtoSchemaNameAssertUnique(roots);
}

/**
 * Collects the Swagger types of every route of a controller (responses, body, query, parameters and extra models), then the extra models of the controller itself.
 * @param {IApiControllerSchemaNameController["controller"]} controller - Controller class.
 * @returns {Array<IDtoSchemaNameRoot>} The route schema types with where each one is used.
 */
function collectControllerRoots(controller: IApiControllerSchemaNameController["controller"]): Array<IDtoSchemaNameRoot> {
	const controllerOrigin: string = `controller ${controller.name}`;
	const roots: Array<IDtoSchemaNameRoot> = [];
	const seenMethodNames: Set<string> = new Set<string>(["constructor"]);

	for (let prototype: null | object = controller.prototype as object; prototype && prototype !== Object.prototype; prototype = Object.getPrototypeOf(prototype) as null | object) {
		for (const methodName of Object.getOwnPropertyNames(prototype)) {
			const handler: unknown = Object.getOwnPropertyDescriptor(prototype, methodName)?.value;

			if (seenMethodNames.has(methodName) || typeof handler !== "function" || Reflect.getMetadata(PATH_METADATA, handler) === undefined) {
				continue;
			}

			seenMethodNames.add(methodName);

			const routeOrigin: string = `route ${methodName} in ${controllerOrigin}`;
			const routeArguments: Record<string, { index: number }> = (Reflect.getMetadata(ROUTE_ARGS_METADATA, controller, methodName) as Record<string, { index: number }> | undefined) ?? {};
			const parameterTypes: Array<unknown> = (Reflect.getMetadata(PARAMTYPES_METADATA, controller.prototype as object, methodName) as Array<unknown> | undefined) ?? [];

			roots.push(...collectHandlerRoots(handler, routeOrigin));

			for (const [key, { index }] of Object.entries(routeArguments)) {
				const argumentName: string | undefined = REQUEST_ARGUMENT_NAMES.get(key.split(":")[0] ?? "");

				if (argumentName) {
					roots.push({ origin: `the ${argumentName} of ${routeOrigin}`, type: parameterTypes[index] });
				}
			}
		}
	}

	// The controller-level models come last, so a class that a route also uses is named by that route.
	roots.push(...collectHandlerRoots(controller, controllerOrigin));

	return roots;
}

/**
 * Collects the Swagger response, parameter and extra model types declared on a controller class or route handler.
 * @param {object} target - Controller class or route handler.
 * @param {string} origin - The controller or route, for example `route get in controller UserController`.
 * @returns {Array<IDtoSchemaNameRoot>} The declared types with where each one is used.
 */
function collectHandlerRoots(target: object, origin: string): Array<IDtoSchemaNameRoot> {
	const responses: Record<string, { type?: unknown }> = (Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.RESPONSES, target) as Record<string, { type?: unknown }> | undefined) ?? {};
	const parameters: Array<{ in?: string; name?: string; type?: unknown }> = (Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.PARAMETERS, target) as Array<{ in?: string; name?: string; type?: unknown }> | undefined) ?? [];
	const extraModels: Array<unknown> = (Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.EXTRA_MODELS, target) as Array<unknown> | undefined) ?? [];

	return [
		...Object.entries(responses).map(([status, response]: [string, { type?: unknown }]): IDtoSchemaNameRoot => ({ origin: `the ${status} response of ${origin}`, type: response.type })),
		...parameters.map((parameter: { in?: string; name?: string; type?: unknown }): IDtoSchemaNameRoot => ({ origin: [`the ${parameter.in ?? "request"} parameter`, parameter.name, `of ${origin}`].filter(Boolean).join(" "), type: parameter.type })),
		...extraModels.map((model: unknown): IDtoSchemaNameRoot => ({ origin: `an extra model of ${origin}`, type: model })),
	];
}
