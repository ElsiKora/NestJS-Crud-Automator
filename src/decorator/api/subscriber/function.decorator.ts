import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiFunctionSubscriberProperties } from "@interface/decorator/api/subscriber";

import { SUBSCRIBER_API_DECORATOR_CONSTANT } from "@constant/decorator/api/subscriber.constant";

/**
 * Decorator for creating a new subscriber that listens to and intercepts events from a service.
 * It allows you to create a subscriber and link it to a specific entity.
 * With this decorator, you can define a subscriber that will be automatically called when an event related to the specified entity occurs.
 * You can also define the priority of the subscriber to determine the order in which it will be executed.
 * @example
 * import { ApiFunctionSubscriber, CrudEvents } from "@elsikora/nestjs-crud-automator";
 * import { Post } from "./post.entity";
 *
 * ApiFunctionSubscriber({
 *   entity: Post,
 *   priority: 200
 * })
 * export class PostSubscriber {
 *   afterCreate(event: CrudEvents) {
 *    console.log(event);
 *   }
 * }
 * @template E - The entity type that the subscriber will listen to.
 * @param {IApiFunctionSubscriberProperties<E>} properties - The properties of the subscriber.
 * @param {E} properties.entity - The entity that the subscriber will listen to.
 * @param {number} [properties.priority] - The priority of the subscriber. The lower the number, the higher the priority.
 * @returns {ClassDecorator} - A decorator that creates a new subscriber.
 */
export function ApiFunctionSubscriber<E extends IApiBaseEntity>(properties: IApiFunctionSubscriberProperties<E>): ClassDecorator {
	return (target: object) => {
		Reflect.defineMetadata(SUBSCRIBER_API_DECORATOR_CONSTANT.FUNCTION_METADATA_KEY, properties, target);
	};
}
