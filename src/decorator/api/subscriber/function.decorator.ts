import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiFunctionSubscriberProperties } from "@interface/decorator/api/subscriber";

import { SUBSCRIBER_API_DECORATOR_CONSTANT } from "@constant/decorator/api/subscriber.constant";

/**
 *
 * @param properties
 * @param properties.entity
 * @param properties.priority
 */
export function ApiFunctionSubscriber<E extends IApiBaseEntity>(properties: IApiFunctionSubscriberProperties<E>): ClassDecorator {
	return (target: object) => {
		Reflect.defineMetadata(SUBSCRIBER_API_DECORATOR_CONSTANT.FUNCTION_METADATA_KEY, properties, target);
	};
}
