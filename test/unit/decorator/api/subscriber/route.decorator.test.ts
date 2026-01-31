import "reflect-metadata";

import { SUBSCRIBER_API_DECORATOR_CONSTANT } from "@constant/decorator/api/subscriber.constant";
import { ApiRouteSubscriber } from "@decorator/api/subscriber/route.decorator";
import { describe, expect, it } from "vitest";

class RouteSubscriberEntity {}

describe("ApiRouteSubscriber", () => {
	it("stores metadata on subscriber class", () => {
		@ApiRouteSubscriber({ entity: RouteSubscriberEntity, priority: 5 })
		class RouteSubscriber {}

		const metadata = Reflect.getMetadata(SUBSCRIBER_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, RouteSubscriber);
		expect(metadata).toEqual({ entity: RouteSubscriberEntity, priority: 5 });
	});
});
