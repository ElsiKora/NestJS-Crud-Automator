import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiRouteSubscriberProperties } from "@interface/decorator/api/subscriber";

import { SUBSCRIBER_API_DECORATOR_CONSTANT } from "@constant/decorator/api/subscriber.constant";

/**
 * Decorator for creating a new subscriber that listens to and intercepts events from a controller.
 * It allows you to create a subscriber and link it to a specific entity.
 * With this decorator, you can define a subscriber that will be automatically called when an event related to the specified entity occurs.
 * You can also define the priority of the subscriber to determine the order in which it will be executed.
 * @example
 * import { ApiRouteSubscriber, CrudEvents } from "@elsikora/nestjs-crud-automator";
 * import { Post } from "./post.entity";
 *
 * ApiRouteSubscriber({
 *   entity: Post,
 *   priority: 200
 * })
 * export class PostSubscriber {
 *   afterCreate(event: CrudEvents) {
 *    console.log(event);
 *   }
 * }
 * @template E - The entity type that the subscriber will listen to.
 * @param {IApiRouteSubscriberProperties<E>} properties - The properties of the subscriber.
 * @param {E} properties.entity - The entity that the subscriber will listen to.
 * @param {number} [properties.priority] - The priority of the subscriber. The lower the number, the higher the priority.
 * @returns {ClassDecorator} - A decorator that creates a new subscriber.
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/api-reference/decorators/api-subscriber/api-route-subscriber | API Reference - ApiRouteSubscriber}
 */
export function ApiRouteSubscriber<E extends IApiBaseEntity>(properties: IApiRouteSubscriberProperties<E>): ClassDecorator {
	return (target: object) => {
		Reflect.defineMetadata(SUBSCRIBER_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, properties, target);
	};
}
