import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

import { SUBSCRIBER_API_DECORATOR_CONSTANT } from "@constant/decorator/api/subscriber.constant";

/**
 *
 * @param properties
 * @param properties.entity
 */
export function ApiRouteSubscriber<E extends IApiBaseEntity>(properties: { entity: new (...arguments_: Array<any>) => E }): ClassDecorator {
	return (target: object) => {
		Reflect.defineMetadata(SUBSCRIBER_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, properties, target);
	};
}
