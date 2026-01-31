import type { IApiSubscriberFunction } from "@interface/class/api/subscriber/function.interface";
import type { IApiSubscriberRoute } from "@interface/class/api/subscriber/route.interface";

import { apiSubscriberRegistry } from "@class/api/subscriber/registry.class";
import { describe, expect, it } from "vitest";

describe("ApiSubscriberRegistry", () => {
	it("orders function subscribers by priority", () => {
		class FunctionEntityPriorityTest {}

		const lowPrioritySubscriber = {} as IApiSubscriberFunction<FunctionEntityPriorityTest>;
		const highPrioritySubscriber = {} as IApiSubscriberFunction<FunctionEntityPriorityTest>;

		apiSubscriberRegistry.registerFunctionSubscriber({ entity: FunctionEntityPriorityTest, priority: 1 }, lowPrioritySubscriber);
		apiSubscriberRegistry.registerFunctionSubscriber({ entity: FunctionEntityPriorityTest, priority: 10 }, highPrioritySubscriber);

		const subscribers = apiSubscriberRegistry.getFunctionSubscribers<FunctionEntityPriorityTest>(FunctionEntityPriorityTest.name);

		expect(subscribers[0]).toBe(highPrioritySubscriber);
		expect(subscribers[1]).toBe(lowPrioritySubscriber);
	});

	it("orders route subscribers by priority", () => {
		class RouteEntityPriorityTest {}

		const lowPrioritySubscriber = {} as IApiSubscriberRoute<RouteEntityPriorityTest>;
		const highPrioritySubscriber = {} as IApiSubscriberRoute<RouteEntityPriorityTest>;

		apiSubscriberRegistry.registerRouteSubscriber({ entity: RouteEntityPriorityTest, priority: 2 }, lowPrioritySubscriber);
		apiSubscriberRegistry.registerRouteSubscriber({ entity: RouteEntityPriorityTest, priority: 8 }, highPrioritySubscriber);

		const subscribers = apiSubscriberRegistry.getRouteSubscribers<RouteEntityPriorityTest>(RouteEntityPriorityTest.name);

		expect(subscribers[0]).toBe(highPrioritySubscriber);
		expect(subscribers[1]).toBe(lowPrioritySubscriber);
	});
});
