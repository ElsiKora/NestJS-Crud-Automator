import { SERVICE_API_DECORATOR_CONSTANT } from "@constant/decorator/api/service.constant";

/**
 * Decorator that marks a service as observable, allowing it to be monitored by subscribers.
 * When a service is marked as observable, its methods can be intercepted by subscribers that listen for specific events.
 * @returns {ClassDecorator} A class decorator that enables service observability.
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/api-reference/decorators/api-service/api-service-observable | API Reference - ApiServiceObservable}
 */
export function ApiServiceObservable(): ClassDecorator {
	return (target: object) => {
		Reflect.defineMetadata(SERVICE_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, true, target);
	};
}
