import { ErrorException } from "@utility/error/exception.utility";

const CONTROLLER_CLASS_NAME_SUFFIX: string = "Controller";

/**
 * Resolves the prefix that starts every generated DTO and OpenAPI component name of a controller's routes.
 * The prefix is the controller class name without a trailing `Controller`, or the full class name when nothing else is left.
 * @param {object} controller - Controller class or the constructor of a controller instance.
 * @returns {string} The schema prefix, for example `AdminUser` for `AdminUserController`.
 * @throws {Error} When the controller class has no name.
 */
export function ApiControllerGetSchemaPrefix(controller: object): string {
	const name: unknown = (controller as { name?: unknown }).name;

	if (typeof name !== "string" || name.length === 0) {
		throw ErrorException("Controller class has no name. Declare a named controller class, because its name starts every generated DTO and OpenAPI component name");
	}

	const prefix: string = name.endsWith(CONTROLLER_CLASS_NAME_SUFFIX) ? name.slice(0, -CONTROLLER_CLASS_NAME_SUFFIX.length) : name;

	return prefix.length > 0 ? prefix : name;
}
