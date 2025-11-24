import { CONTROLLER_API_DECORATOR_CONSTANT } from "@constant/decorator/api/controller.constant";

/**
 * Decorator that marks a controller as observable, allowing it to be monitored by subscribers.
 * When a controller is marked as observable, its methods can be intercepted by subscribers that listen for specific events.
 * @returns {ClassDecorator} - A decorator that marks a controller as observable.
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/api-reference/decorators/api-controller/api-controller-observable | API Reference - ApiControllerObservable}
 */
export function ApiControllerObservable(): ClassDecorator {
	return (target: object) => {
		Reflect.defineMetadata(CONTROLLER_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, true, target);
	};
}
