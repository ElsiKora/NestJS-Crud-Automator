import { CONTROLLER_API_DECORATOR_CONSTANT } from "@constant/decorator/api/controller.constant";

/**
 * Decorator that marks a controller as securable, enabling automatic RBAC guard application.
 * Without this decorator the authorization guard short-circuits and controller methods remain unsecured.
 * @returns {ClassDecorator} Class decorator that enables authorization for the controller.
 */
export function ApiControllerSecurable(): ClassDecorator {
	return (target: object) => {
		Reflect.defineMetadata(CONTROLLER_API_DECORATOR_CONSTANT.SECURABLE_METADATA_KEY, true, target);
	};
}
