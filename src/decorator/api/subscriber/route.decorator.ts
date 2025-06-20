import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiRouteSubscriberProperties } from "@interface/decorator/api/subscriber";

import { SUBSCRIBER_API_DECORATOR_CONSTANT } from "@constant/decorator/api/subscriber.constant";

/**
 *
 * @param properties
 * @param properties.entity
 * @param properties.priority
 */
export function ApiRouteSubscriber<E extends IApiBaseEntity>(properties: IApiRouteSubscriberProperties<E>): ClassDecorator {
	return (target: object) => {
		Reflect.defineMetadata(SUBSCRIBER_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, properties, target);
	};
}
