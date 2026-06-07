import type { IApiSubscriberFunction } from "@interface/class/api/subscriber/function";
import type { IApiSubscriberRoute } from "@interface/class/api/subscriber/route.interface";

import { apiSubscriberRegistry } from "@class/api/subscriber/registry.class";
import { EApiFunctionSubscriberTransactionExpectation, EApiFunctionType, EApiRouteType } from "@enum/decorator/api";
import { beforeEach, describe, expect, it } from "vitest";

const resetSubscriberRegistry = (): void => {
	const registry = apiSubscriberRegistry as unknown as {
		FUNCTION_SUBSCRIBERS: { clear: () => void };
		ROUTE_SUBSCRIBERS: { clear: () => void };
	};

	registry.FUNCTION_SUBSCRIBERS.clear();
	registry.ROUTE_SUBSCRIBERS.clear();
};

describe("ApiSubscriberRegistry", () => {
	beforeEach(() => {
		resetSubscriberRegistry();
	});

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

	it("filters route subscribers by controller, route, action, and no-filter behavior", () => {
		class RouteEntityFilterTest {}
		class MatchingController {}
		class OtherController {}

		const noFilterSubscriber = {} as IApiSubscriberRoute<RouteEntityFilterTest>;
		const controllerSubscriber = {} as IApiSubscriberRoute<RouteEntityFilterTest>;
		const routeSubscriber = {} as IApiSubscriberRoute<RouteEntityFilterTest>;
		const actionSubscriber = {} as IApiSubscriberRoute<RouteEntityFilterTest>;
		const mismatchSubscriber = {} as IApiSubscriberRoute<RouteEntityFilterTest>;

		apiSubscriberRegistry.registerRouteSubscriber({ entity: RouteEntityFilterTest }, noFilterSubscriber);
		apiSubscriberRegistry.registerRouteSubscriber({ controllers: [MatchingController], entity: RouteEntityFilterTest }, controllerSubscriber);
		apiSubscriberRegistry.registerRouteSubscriber({ entity: RouteEntityFilterTest, routes: [EApiRouteType.GET] }, routeSubscriber);
		apiSubscriberRegistry.registerRouteSubscriber({ actions: ["custom.action"], entity: RouteEntityFilterTest }, actionSubscriber);
		apiSubscriberRegistry.registerRouteSubscriber({ controllers: [OtherController], entity: RouteEntityFilterTest }, mismatchSubscriber);

		const subscribers = apiSubscriberRegistry.getRouteSubscribers<RouteEntityFilterTest>(RouteEntityFilterTest.name, MatchingController, EApiRouteType.GET, "custom.action");

		expect(subscribers).toEqual(expect.arrayContaining([noFilterSubscriber, controllerSubscriber, routeSubscriber, actionSubscriber]));
		expect(subscribers).not.toContain(mismatchSubscriber);
	});

	it("filters function subscribers by function type and action", () => {
		class FunctionEntityFilterTest {}

		const noFilterSubscriber = {} as IApiSubscriberFunction<FunctionEntityFilterTest>;
		const typeSubscriber = {} as IApiSubscriberFunction<FunctionEntityFilterTest>;
		const actionSubscriber = {} as IApiSubscriberFunction<FunctionEntityFilterTest>;
		const mismatchSubscriber = {} as IApiSubscriberFunction<FunctionEntityFilterTest>;

		apiSubscriberRegistry.registerFunctionSubscriber({ entity: FunctionEntityFilterTest }, noFilterSubscriber);
		apiSubscriberRegistry.registerFunctionSubscriber({ entity: FunctionEntityFilterTest, functions: [{ type: EApiFunctionType.CREATE }] }, typeSubscriber);
		apiSubscriberRegistry.registerFunctionSubscriber({ entity: FunctionEntityFilterTest, functions: [{ action: "custom.create", type: EApiFunctionType.CREATE }] }, actionSubscriber);
		apiSubscriberRegistry.registerFunctionSubscriber({ entity: FunctionEntityFilterTest, functions: [{ action: "custom.delete", type: EApiFunctionType.DELETE }] }, mismatchSubscriber);

		const subscribers = apiSubscriberRegistry.getFunctionSubscribers<FunctionEntityFilterTest>(FunctionEntityFilterTest.name, EApiFunctionType.CREATE, "custom.create");

		expect(subscribers).toEqual(expect.arrayContaining([noFilterSubscriber, typeSubscriber, actionSubscriber]));
		expect(subscribers).not.toContain(mismatchSubscriber);
	});

	it("returns registered function subscriber properties for runtime enforcement", () => {
		class FunctionEntityPropertiesTest {}

		const functionSubscriber = {} as IApiSubscriberFunction<FunctionEntityPropertiesTest>;
		const properties = {
			entity: FunctionEntityPropertiesTest,
			functions: [{ type: EApiFunctionType.GET }],
			priority: 5,
			transaction: { expectation: EApiFunctionSubscriberTransactionExpectation.REQUIRED },
		};

		apiSubscriberRegistry.registerFunctionSubscriber(properties, functionSubscriber);

		expect(apiSubscriberRegistry.getFunctionSubscriberProperties(functionSubscriber)).toBe(properties);
		expect(apiSubscriberRegistry.getFunctionSubscriberProperties({} as IApiSubscriberFunction<FunctionEntityPropertiesTest>)).toBeUndefined();
	});
});
