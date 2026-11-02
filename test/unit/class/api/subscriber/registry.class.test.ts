import type { IApiSubscriberFunction } from "@interface/class/api/subscriber/function";
import type { IApiSubscriberRoute } from "@interface/class/api/subscriber/route.interface";

import { apiSubscriberRegistry } from "@class/api/subscriber/registry.class";
import { EApiFunctionSubscriberTransactionExpectation, EApiFunctionType, EApiRouteType } from "@enum/decorator/api";
import { resetApiSubscriberRegistry } from "@test/unit/fixture";
import { beforeEach, describe, expect, it } from "vitest";

describe("ApiSubscriberRegistry", () => {
	beforeEach(() => {
		resetApiSubscriberRegistry();
	});

	it("orders function subscribers by priority", () => {
		class FunctionEntityPriorityTest {}

		const lowPrioritySubscriber = {} as IApiSubscriberFunction<FunctionEntityPriorityTest>;
		const highPrioritySubscriber = {} as IApiSubscriberFunction<FunctionEntityPriorityTest>;

		apiSubscriberRegistry.registerFunctionSubscriber({ entity: FunctionEntityPriorityTest, priority: 1 }, lowPrioritySubscriber);
		apiSubscriberRegistry.registerFunctionSubscriber({ entity: FunctionEntityPriorityTest, priority: 10 }, highPrioritySubscriber);

		const subscribers = apiSubscriberRegistry.getFunctionSubscribers<FunctionEntityPriorityTest>(FunctionEntityPriorityTest);

		expect(subscribers[0]).toBe(highPrioritySubscriber);
		expect(subscribers[1]).toBe(lowPrioritySubscriber);
	});

	it("orders route subscribers by priority", () => {
		class RouteEntityPriorityTest {}

		const lowPrioritySubscriber = {} as IApiSubscriberRoute<RouteEntityPriorityTest>;
		const highPrioritySubscriber = {} as IApiSubscriberRoute<RouteEntityPriorityTest>;

		apiSubscriberRegistry.registerRouteSubscriber({ entity: RouteEntityPriorityTest, priority: 2 }, lowPrioritySubscriber);
		apiSubscriberRegistry.registerRouteSubscriber({ entity: RouteEntityPriorityTest, priority: 8 }, highPrioritySubscriber);

		const subscribers = apiSubscriberRegistry.getRouteSubscribers<RouteEntityPriorityTest>(RouteEntityPriorityTest);

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

		const subscribers = apiSubscriberRegistry.getRouteSubscribers<RouteEntityFilterTest>(RouteEntityFilterTest, MatchingController, EApiRouteType.GET, "custom.action");

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

		const subscribers = apiSubscriberRegistry.getFunctionSubscribers<FunctionEntityFilterTest>(FunctionEntityFilterTest, EApiFunctionType.CREATE, "custom.create");

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

	it("unregisters only the given function subscriber and keeps the priority order of the rest", () => {
		class FunctionEntityUnregisterTest {}

		const highPrioritySubscriber = {} as IApiSubscriberFunction<FunctionEntityUnregisterTest>;
		const removedSubscriber = {} as IApiSubscriberFunction<FunctionEntityUnregisterTest>;
		const firstLowPrioritySubscriber = {} as IApiSubscriberFunction<FunctionEntityUnregisterTest>;
		const secondLowPrioritySubscriber = {} as IApiSubscriberFunction<FunctionEntityUnregisterTest>;

		apiSubscriberRegistry.registerFunctionSubscriber({ entity: FunctionEntityUnregisterTest, priority: 1 }, firstLowPrioritySubscriber);
		apiSubscriberRegistry.registerFunctionSubscriber({ entity: FunctionEntityUnregisterTest, priority: 5 }, removedSubscriber);
		apiSubscriberRegistry.registerFunctionSubscriber({ entity: FunctionEntityUnregisterTest, priority: 1 }, secondLowPrioritySubscriber);
		apiSubscriberRegistry.registerFunctionSubscriber({ entity: FunctionEntityUnregisterTest, priority: 10 }, highPrioritySubscriber);

		apiSubscriberRegistry.unregisterFunctionSubscriber(removedSubscriber);

		const subscribers = apiSubscriberRegistry.getFunctionSubscribers<FunctionEntityUnregisterTest>(FunctionEntityUnregisterTest);

		expect(subscribers).toHaveLength(3);
		expect(subscribers[0]).toBe(highPrioritySubscriber);
		expect(subscribers[1]).toBe(firstLowPrioritySubscriber);
		expect(subscribers[2]).toBe(secondLowPrioritySubscriber);
		expect(apiSubscriberRegistry.getFunctionSubscriberProperties(removedSubscriber)).toBeUndefined();
	});

	it("unregisters only the given route subscriber and keeps the priority order of the rest", () => {
		class RouteEntityUnregisterTest {}

		const highPrioritySubscriber = {} as IApiSubscriberRoute<RouteEntityUnregisterTest>;
		const removedSubscriber = {} as IApiSubscriberRoute<RouteEntityUnregisterTest>;
		const firstLowPrioritySubscriber = {} as IApiSubscriberRoute<RouteEntityUnregisterTest>;
		const secondLowPrioritySubscriber = {} as IApiSubscriberRoute<RouteEntityUnregisterTest>;

		apiSubscriberRegistry.registerRouteSubscriber({ entity: RouteEntityUnregisterTest, priority: 1 }, firstLowPrioritySubscriber);
		apiSubscriberRegistry.registerRouteSubscriber({ entity: RouteEntityUnregisterTest, priority: 5 }, removedSubscriber);
		apiSubscriberRegistry.registerRouteSubscriber({ entity: RouteEntityUnregisterTest, priority: 1 }, secondLowPrioritySubscriber);
		apiSubscriberRegistry.registerRouteSubscriber({ entity: RouteEntityUnregisterTest, priority: 10 }, highPrioritySubscriber);

		apiSubscriberRegistry.unregisterRouteSubscriber(removedSubscriber);

		const subscribers = apiSubscriberRegistry.getRouteSubscribers<RouteEntityUnregisterTest>(RouteEntityUnregisterTest);

		expect(subscribers).toHaveLength(3);
		expect(subscribers[0]).toBe(highPrioritySubscriber);
		expect(subscribers[1]).toBe(firstLowPrioritySubscriber);
		expect(subscribers[2]).toBe(secondLowPrioritySubscriber);
	});

	it("drops an entity wrapper once its last subscriber is unregistered", () => {
		class FunctionEntityEmptyWrapperTest {}
		class RouteEntityEmptyWrapperTest {}

		const internalRegistry = apiSubscriberRegistry as unknown as { FUNCTION_SUBSCRIBERS: Map<string, unknown>; ROUTE_SUBSCRIBERS: Map<string, unknown> };
		const functionSubscriber = {} as IApiSubscriberFunction<FunctionEntityEmptyWrapperTest>;
		const routeSubscriber = {} as IApiSubscriberRoute<RouteEntityEmptyWrapperTest>;

		apiSubscriberRegistry.registerFunctionSubscriber({ entity: FunctionEntityEmptyWrapperTest }, functionSubscriber);
		apiSubscriberRegistry.registerRouteSubscriber({ entity: RouteEntityEmptyWrapperTest }, routeSubscriber);

		apiSubscriberRegistry.unregisterFunctionSubscriber(functionSubscriber);
		apiSubscriberRegistry.unregisterRouteSubscriber(routeSubscriber);

		expect(internalRegistry.FUNCTION_SUBSCRIBERS.has(FunctionEntityEmptyWrapperTest.name)).toBe(false);
		expect(internalRegistry.ROUTE_SUBSCRIBERS.has(RouteEntityEmptyWrapperTest.name)).toBe(false);
	});

	it("unregisters a function subscriber of any entity while other entities are registered", () => {
		class FirstFunctionEntityTest {}
		class SecondFunctionEntityTest {}
		class ThirdFunctionEntityTest {}

		const firstSubscriber = {} as IApiSubscriberFunction<FirstFunctionEntityTest>;
		const secondSubscriber = {} as IApiSubscriberFunction<SecondFunctionEntityTest>;
		const thirdSubscriber = {} as IApiSubscriberFunction<ThirdFunctionEntityTest>;

		apiSubscriberRegistry.registerFunctionSubscriber({ entity: FirstFunctionEntityTest }, firstSubscriber);
		apiSubscriberRegistry.registerFunctionSubscriber({ entity: SecondFunctionEntityTest }, secondSubscriber);
		apiSubscriberRegistry.registerFunctionSubscriber({ entity: ThirdFunctionEntityTest }, thirdSubscriber);

		apiSubscriberRegistry.unregisterFunctionSubscriber(thirdSubscriber);
		apiSubscriberRegistry.unregisterFunctionSubscriber(secondSubscriber);

		expect(apiSubscriberRegistry.getFunctionSubscribers<FirstFunctionEntityTest>(FirstFunctionEntityTest)).toEqual([firstSubscriber]);
		expect(apiSubscriberRegistry.getFunctionSubscribers<SecondFunctionEntityTest>(SecondFunctionEntityTest)).toEqual([]);
		expect(apiSubscriberRegistry.getFunctionSubscribers<ThirdFunctionEntityTest>(ThirdFunctionEntityTest)).toEqual([]);
	});

	it("unregisters a route subscriber of any entity while other entities are registered", () => {
		class FirstRouteEntityTest {}
		class SecondRouteEntityTest {}
		class ThirdRouteEntityTest {}

		const firstSubscriber = {} as IApiSubscriberRoute<FirstRouteEntityTest>;
		const secondSubscriber = {} as IApiSubscriberRoute<SecondRouteEntityTest>;
		const thirdSubscriber = {} as IApiSubscriberRoute<ThirdRouteEntityTest>;

		apiSubscriberRegistry.registerRouteSubscriber({ entity: FirstRouteEntityTest }, firstSubscriber);
		apiSubscriberRegistry.registerRouteSubscriber({ entity: SecondRouteEntityTest }, secondSubscriber);
		apiSubscriberRegistry.registerRouteSubscriber({ entity: ThirdRouteEntityTest }, thirdSubscriber);

		apiSubscriberRegistry.unregisterRouteSubscriber(thirdSubscriber);
		apiSubscriberRegistry.unregisterRouteSubscriber(secondSubscriber);

		expect(apiSubscriberRegistry.getRouteSubscribers<FirstRouteEntityTest>(FirstRouteEntityTest)).toEqual([firstSubscriber]);
		expect(apiSubscriberRegistry.getRouteSubscribers<SecondRouteEntityTest>(SecondRouteEntityTest)).toEqual([]);
		expect(apiSubscriberRegistry.getRouteSubscribers<ThirdRouteEntityTest>(ThirdRouteEntityTest)).toEqual([]);
	});

	it("ignores a subscriber that is not registered", () => {
		class FunctionEntityUnknownTest {}
		class RouteEntityUnknownTest {}

		const functionSubscriber = {} as IApiSubscriberFunction<FunctionEntityUnknownTest>;
		const routeSubscriber = {} as IApiSubscriberRoute<RouteEntityUnknownTest>;

		apiSubscriberRegistry.registerFunctionSubscriber({ entity: FunctionEntityUnknownTest }, functionSubscriber);
		apiSubscriberRegistry.registerRouteSubscriber({ entity: RouteEntityUnknownTest }, routeSubscriber);

		apiSubscriberRegistry.unregisterFunctionSubscriber({} as IApiSubscriberFunction<FunctionEntityUnknownTest>);
		apiSubscriberRegistry.unregisterRouteSubscriber({} as IApiSubscriberRoute<RouteEntityUnknownTest>);

		expect(apiSubscriberRegistry.getFunctionSubscribers<FunctionEntityUnknownTest>(FunctionEntityUnknownTest)).toEqual([functionSubscriber]);
		expect(apiSubscriberRegistry.getRouteSubscribers<RouteEntityUnknownTest>(RouteEntityUnknownTest)).toEqual([routeSubscriber]);
	});

	it.each([
		["a string", "RouteEntity", 'the string "RouteEntity"'],
		["an object with a name", { name: "RouteEntity" }, "object"],
		["undefined", undefined, "undefined"],
	])("refuses %s instead of returning no subscribers", (_label: string, argument: unknown, received: string) => {
		expect(() => apiSubscriberRegistry.getFunctionSubscribers(argument as never)).toThrowError(new TypeError(`ApiSubscriberRegistry.getFunctionSubscribers expects the entity class, got ${received}. From 5.0.0, pass the class itself.`));
		expect(() => apiSubscriberRegistry.getRouteSubscribers(argument as never)).toThrowError(new TypeError(`ApiSubscriberRegistry.getRouteSubscribers expects the entity class, got ${received}. From 5.0.0, pass the class itself.`));
	});
});
