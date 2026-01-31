import type { IApiSubscriberFunction } from "@interface/class/api/subscriber/function.interface";
import type { IApiSubscriberRoute } from "@interface/class/api/subscriber/route.interface";

import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { apiSubscriberRegistry } from "@class/api/subscriber/registry.class";
import { CONTROLLER_API_DECORATOR_CONSTANT } from "@constant/decorator/api/controller.constant";
import { SERVICE_API_DECORATOR_CONSTANT } from "@constant/decorator/api/service.constant";
import { EApiFunctionType, EApiRouteType, EApiSubscriberOnType } from "@enum/decorator/api";
import { beforeEach, describe, expect, it, vi } from "vitest";

const resetSubscriberRegistry = (): void => {
	const registry = apiSubscriberRegistry as unknown as {
		FUNCTION_SUBSCRIBERS: { clear: () => void };
		ROUTE_SUBSCRIBERS: { clear: () => void };
	};

	registry.FUNCTION_SUBSCRIBERS.clear();
	registry.ROUTE_SUBSCRIBERS.clear();
};

const routeHookSuffixes: Record<EApiRouteType, string> = {
	[EApiRouteType.CREATE]: "Create",
	[EApiRouteType.DELETE]: "Delete",
	[EApiRouteType.GET]: "Get",
	[EApiRouteType.GET_LIST]: "GetList",
	[EApiRouteType.PARTIAL_UPDATE]: "PartialUpdate",
	[EApiRouteType.UPDATE]: "Update",
};

const functionHookSuffixes: Record<EApiFunctionType, string> = {
	[EApiFunctionType.CREATE]: "Create",
	[EApiFunctionType.DELETE]: "Delete",
	[EApiFunctionType.GET]: "Get",
	[EApiFunctionType.GET_LIST]: "GetList",
	[EApiFunctionType.GET_MANY]: "GetMany",
	[EApiFunctionType.UPDATE]: "Update",
};

describe("ApiSubscriberExecutor", () => {
	beforeEach(() => {
		resetSubscriberRegistry();
	});

	it.each([
		{ onType: EApiSubscriberOnType.BEFORE, routeType: EApiRouteType.CREATE },
		{ onType: EApiSubscriberOnType.BEFORE, routeType: EApiRouteType.DELETE },
		{ onType: EApiSubscriberOnType.BEFORE, routeType: EApiRouteType.GET },
		{ onType: EApiSubscriberOnType.BEFORE, routeType: EApiRouteType.GET_LIST },
		{ onType: EApiSubscriberOnType.BEFORE, routeType: EApiRouteType.PARTIAL_UPDATE },
		{ onType: EApiSubscriberOnType.BEFORE, routeType: EApiRouteType.UPDATE },
		{ onType: EApiSubscriberOnType.AFTER, routeType: EApiRouteType.CREATE },
		{ onType: EApiSubscriberOnType.AFTER, routeType: EApiRouteType.DELETE },
		{ onType: EApiSubscriberOnType.AFTER, routeType: EApiRouteType.GET },
		{ onType: EApiSubscriberOnType.AFTER, routeType: EApiRouteType.GET_LIST },
		{ onType: EApiSubscriberOnType.AFTER, routeType: EApiRouteType.PARTIAL_UPDATE },
		{ onType: EApiSubscriberOnType.AFTER, routeType: EApiRouteType.UPDATE },
	])("executes route %s hook for %s", async ({ onType, routeType }) => {
		class RouteEntity {
			public id?: string;
		}

		class TestController {}

		Reflect.defineMetadata(CONTROLLER_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, true, TestController);

		const hookName = `on${onType}${routeHookSuffixes[routeType]}`;
		const updatedResult = { id: "updated" };
		const routeSubscriber = {
			[hookName]: vi.fn().mockResolvedValue(updatedResult),
		} as unknown as IApiSubscriberRoute<RouteEntity>;

		apiSubscriberRegistry.registerRouteSubscriber({ entity: RouteEntity, priority: 1 }, routeSubscriber);

		const result = await ApiSubscriberExecutor.executeRouteSubscribers(TestController, new RouteEntity(), routeType, onType, {
			DATA: {} as never,
			ENTITY: new RouteEntity(),
			result: { id: "original" },
			ROUTE_TYPE: routeType,
		});

		expect((routeSubscriber as Record<string, unknown>)[hookName]).toHaveBeenCalledTimes(1);
		expect(result).toEqual(updatedResult);
	});

	it.each([
		{ onType: EApiSubscriberOnType.BEFORE_ERROR, routeType: EApiRouteType.CREATE },
		{ onType: EApiSubscriberOnType.BEFORE_ERROR, routeType: EApiRouteType.DELETE },
		{ onType: EApiSubscriberOnType.BEFORE_ERROR, routeType: EApiRouteType.GET },
		{ onType: EApiSubscriberOnType.BEFORE_ERROR, routeType: EApiRouteType.GET_LIST },
		{ onType: EApiSubscriberOnType.BEFORE_ERROR, routeType: EApiRouteType.PARTIAL_UPDATE },
		{ onType: EApiSubscriberOnType.BEFORE_ERROR, routeType: EApiRouteType.UPDATE },
		{ onType: EApiSubscriberOnType.AFTER_ERROR, routeType: EApiRouteType.CREATE },
		{ onType: EApiSubscriberOnType.AFTER_ERROR, routeType: EApiRouteType.DELETE },
		{ onType: EApiSubscriberOnType.AFTER_ERROR, routeType: EApiRouteType.GET },
		{ onType: EApiSubscriberOnType.AFTER_ERROR, routeType: EApiRouteType.GET_LIST },
		{ onType: EApiSubscriberOnType.AFTER_ERROR, routeType: EApiRouteType.PARTIAL_UPDATE },
		{ onType: EApiSubscriberOnType.AFTER_ERROR, routeType: EApiRouteType.UPDATE },
	])("executes route %s error hook for %s", async ({ onType, routeType }) => {
		class RouteEntity {
			public id?: string;
		}

		class TestController {}

		Reflect.defineMetadata(CONTROLLER_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, true, TestController);

		const hookName = `on${onType}${routeHookSuffixes[routeType]}`;
		const routeSubscriber = {
			[hookName]: vi.fn(),
		} as unknown as IApiSubscriberRoute<RouteEntity>;

		apiSubscriberRegistry.registerRouteSubscriber({ entity: RouteEntity, priority: 1 }, routeSubscriber);

		await ApiSubscriberExecutor.executeRouteErrorSubscribers(
			TestController,
			new RouteEntity(),
			routeType,
			onType,
			{
				DATA: {} as never,
				ENTITY: new RouteEntity(),
				ROUTE_TYPE: routeType,
			},
			new Error("boom"),
		);

		expect((routeSubscriber as Record<string, unknown>)[hookName]).toHaveBeenCalledTimes(1);
	});

	it("returns original result when route hook returns undefined", async () => {
		class RouteEntity {
			public id?: string;
		}

		class TestController {}

		Reflect.defineMetadata(CONTROLLER_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, true, TestController);

		const routeSubscriber: IApiSubscriberRoute<RouteEntity> = {
			onBeforeGet: vi.fn().mockResolvedValue(undefined),
		};

		apiSubscriberRegistry.registerRouteSubscriber({ entity: RouteEntity, priority: 1 }, routeSubscriber);

		const result = await ApiSubscriberExecutor.executeRouteSubscribers(TestController, new RouteEntity(), EApiRouteType.GET, EApiSubscriberOnType.BEFORE, {
			DATA: {} as never,
			ENTITY: new RouteEntity(),
			result: { id: "original" },
			ROUTE_TYPE: EApiRouteType.GET,
		});

		expect(routeSubscriber.onBeforeGet).toHaveBeenCalledTimes(1);
		expect(result).toEqual({ id: "original" });
	});

	it("skips route subscribers when controller is not observable", async () => {
		class RouteEntity {
			public id?: string;
		}

		class TestController {}

		const routeSubscriber: IApiSubscriberRoute<RouteEntity> = {
			onBeforeGet: vi.fn(),
		};

		apiSubscriberRegistry.registerRouteSubscriber({ entity: RouteEntity, priority: 1 }, routeSubscriber);

		const result = await ApiSubscriberExecutor.executeRouteSubscribers(TestController, new RouteEntity(), EApiRouteType.GET, EApiSubscriberOnType.BEFORE, {
			DATA: {} as never,
			ENTITY: new RouteEntity(),
			result: { id: "original" },
			ROUTE_TYPE: EApiRouteType.GET,
		});

		expect(routeSubscriber.onBeforeGet).not.toHaveBeenCalled();
		expect(result).toEqual({ id: "original" });
	});

	it("uses entity metadata to resolve route subscribers", async () => {
		class RouteEntity {
			public id?: string;
		}

		class TestController {}

		Reflect.defineMetadata(CONTROLLER_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, true, TestController);

		const routeSubscriber: IApiSubscriberRoute<RouteEntity> = {
			onBeforeGet: vi.fn().mockResolvedValue({ id: "updated" }),
		};

		apiSubscriberRegistry.registerRouteSubscriber({ entity: RouteEntity, priority: 1 }, routeSubscriber);

		const plainEntity = { id: "plain" } as unknown as RouteEntity;

		const result = await ApiSubscriberExecutor.executeRouteSubscribers(TestController, plainEntity, EApiRouteType.GET, EApiSubscriberOnType.BEFORE, {
			DATA: { entityMetadata: { name: RouteEntity.name } } as never,
			ENTITY: plainEntity,
			result: { id: "original" },
			ROUTE_TYPE: EApiRouteType.GET,
		});

		expect(routeSubscriber.onBeforeGet).toHaveBeenCalledTimes(1);
		expect(result).toEqual({ id: "updated" });
	});

	it("uses entity properties to resolve route subscribers", async () => {
		class RouteEntity {
			public id?: string;
		}

		class TestController {}

		Reflect.defineMetadata(CONTROLLER_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, true, TestController);

		const routeSubscriber: IApiSubscriberRoute<RouteEntity> = {
			onBeforeGet: vi.fn().mockResolvedValue({ id: "updated" }),
		};

		apiSubscriberRegistry.registerRouteSubscriber({ entity: RouteEntity, priority: 1 }, routeSubscriber);

		const plainEntity = { id: "plain" } as unknown as RouteEntity;

		const result = await ApiSubscriberExecutor.executeRouteSubscribers(TestController, plainEntity, EApiRouteType.GET, EApiSubscriberOnType.BEFORE, {
			DATA: { properties: { entity: { name: RouteEntity.name } } } as never,
			ENTITY: plainEntity,
			result: { id: "original" },
			ROUTE_TYPE: EApiRouteType.GET,
		});

		expect(routeSubscriber.onBeforeGet).toHaveBeenCalledTimes(1);
		expect(result).toEqual({ id: "updated" });
	});

	it.each([
		{ onType: EApiSubscriberOnType.BEFORE, functionType: EApiFunctionType.CREATE },
		{ onType: EApiSubscriberOnType.BEFORE, functionType: EApiFunctionType.DELETE },
		{ onType: EApiSubscriberOnType.BEFORE, functionType: EApiFunctionType.GET },
		{ onType: EApiSubscriberOnType.BEFORE, functionType: EApiFunctionType.GET_LIST },
		{ onType: EApiSubscriberOnType.BEFORE, functionType: EApiFunctionType.GET_MANY },
		{ onType: EApiSubscriberOnType.BEFORE, functionType: EApiFunctionType.UPDATE },
		{ onType: EApiSubscriberOnType.AFTER, functionType: EApiFunctionType.CREATE },
		{ onType: EApiSubscriberOnType.AFTER, functionType: EApiFunctionType.DELETE },
		{ onType: EApiSubscriberOnType.AFTER, functionType: EApiFunctionType.GET },
		{ onType: EApiSubscriberOnType.AFTER, functionType: EApiFunctionType.GET_LIST },
		{ onType: EApiSubscriberOnType.AFTER, functionType: EApiFunctionType.GET_MANY },
		{ onType: EApiSubscriberOnType.AFTER, functionType: EApiFunctionType.UPDATE },
	])("executes function %s hook for %s", async ({ onType, functionType }) => {
		class FunctionEntity {
			public id?: string;
		}

		class TestService {}

		Reflect.defineMetadata(SERVICE_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, true, TestService);

		const hookName = `on${onType}${functionHookSuffixes[functionType]}`;
		const updatedResult = { id: "updated" };
		const functionSubscriber = {
			[hookName]: vi.fn().mockResolvedValue(updatedResult),
		} as unknown as IApiSubscriberFunction<FunctionEntity>;

		apiSubscriberRegistry.registerFunctionSubscriber({ entity: FunctionEntity, priority: 1 }, functionSubscriber);

		const result = await ApiSubscriberExecutor.executeFunctionSubscribers(TestService, new FunctionEntity(), functionType, onType, {
			DATA: {} as never,
			ENTITY: new FunctionEntity(),
			FUNCTION_TYPE: functionType,
			result: { id: "original" },
		});

		expect((functionSubscriber as Record<string, unknown>)[hookName]).toHaveBeenCalledTimes(1);
		expect(result).toEqual(updatedResult);
	});

	it.each([
		{ onType: EApiSubscriberOnType.BEFORE_ERROR, functionType: EApiFunctionType.CREATE },
		{ onType: EApiSubscriberOnType.BEFORE_ERROR, functionType: EApiFunctionType.DELETE },
		{ onType: EApiSubscriberOnType.BEFORE_ERROR, functionType: EApiFunctionType.GET },
		{ onType: EApiSubscriberOnType.BEFORE_ERROR, functionType: EApiFunctionType.GET_LIST },
		{ onType: EApiSubscriberOnType.BEFORE_ERROR, functionType: EApiFunctionType.GET_MANY },
		{ onType: EApiSubscriberOnType.BEFORE_ERROR, functionType: EApiFunctionType.UPDATE },
		{ onType: EApiSubscriberOnType.AFTER_ERROR, functionType: EApiFunctionType.CREATE },
		{ onType: EApiSubscriberOnType.AFTER_ERROR, functionType: EApiFunctionType.DELETE },
		{ onType: EApiSubscriberOnType.AFTER_ERROR, functionType: EApiFunctionType.GET },
		{ onType: EApiSubscriberOnType.AFTER_ERROR, functionType: EApiFunctionType.GET_LIST },
		{ onType: EApiSubscriberOnType.AFTER_ERROR, functionType: EApiFunctionType.GET_MANY },
		{ onType: EApiSubscriberOnType.AFTER_ERROR, functionType: EApiFunctionType.UPDATE },
	])("executes function %s error hook for %s", async ({ onType, functionType }) => {
		class FunctionEntity {
			public id?: string;
		}

		class TestService {}

		Reflect.defineMetadata(SERVICE_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, true, TestService);

		const hookName = `on${onType}${functionHookSuffixes[functionType]}`;
		const functionSubscriber = {
			[hookName]: vi.fn(),
		} as unknown as IApiSubscriberFunction<FunctionEntity>;

		apiSubscriberRegistry.registerFunctionSubscriber({ entity: FunctionEntity, priority: 1 }, functionSubscriber);

		await ApiSubscriberExecutor.executeFunctionErrorSubscribers(
			TestService,
			new FunctionEntity(),
			functionType,
			onType,
			{
				DATA: {} as never,
				ENTITY: new FunctionEntity(),
				FUNCTION_TYPE: functionType,
			},
			new Error("boom"),
		);

		expect((functionSubscriber as Record<string, unknown>)[hookName]).toHaveBeenCalledTimes(1);
	});

	it("returns original result when function hook returns undefined", async () => {
		class FunctionEntity {
			public id?: string;
		}

		class TestService {}

		Reflect.defineMetadata(SERVICE_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, true, TestService);

		const functionSubscriber: IApiSubscriberFunction<FunctionEntity> = {
			onBeforeGet: vi.fn().mockResolvedValue(undefined),
		};

		apiSubscriberRegistry.registerFunctionSubscriber({ entity: FunctionEntity, priority: 1 }, functionSubscriber);

		const result = await ApiSubscriberExecutor.executeFunctionSubscribers(TestService, new FunctionEntity(), EApiFunctionType.GET, EApiSubscriberOnType.BEFORE, {
			DATA: {} as never,
			ENTITY: new FunctionEntity(),
			FUNCTION_TYPE: EApiFunctionType.GET,
			result: { id: "original" },
		});

		expect(functionSubscriber.onBeforeGet).toHaveBeenCalledTimes(1);
		expect(result).toEqual({ id: "original" });
	});

	it("skips function subscribers when service is not observable", async () => {
		class FunctionEntity {
			public id?: string;
		}

		class TestService {}

		const functionSubscriber: IApiSubscriberFunction<FunctionEntity> = {
			onAfterGet: vi.fn(),
		};

		apiSubscriberRegistry.registerFunctionSubscriber({ entity: FunctionEntity, priority: 1 }, functionSubscriber);

		const result = await ApiSubscriberExecutor.executeFunctionSubscribers(TestService, new FunctionEntity(), EApiFunctionType.GET, EApiSubscriberOnType.AFTER, {
			DATA: {} as never,
			ENTITY: new FunctionEntity(),
			FUNCTION_TYPE: EApiFunctionType.GET,
			result: { id: "original" },
		});

		expect(functionSubscriber.onAfterGet).not.toHaveBeenCalled();
		expect(result).toEqual({ id: "original" });
	});

	it("skips function error subscribers when service is not observable", async () => {
		class FunctionEntity {
			public id?: string;
		}

		class TestService {}

		const functionSubscriber: IApiSubscriberFunction<FunctionEntity> = {
			onBeforeErrorGet: vi.fn(),
		};

		apiSubscriberRegistry.registerFunctionSubscriber({ entity: FunctionEntity, priority: 1 }, functionSubscriber);

		await ApiSubscriberExecutor.executeFunctionErrorSubscribers(
			TestService,
			new FunctionEntity(),
			EApiFunctionType.GET,
			EApiSubscriberOnType.BEFORE_ERROR,
			{
				DATA: {} as never,
				ENTITY: new FunctionEntity(),
				FUNCTION_TYPE: EApiFunctionType.GET,
			},
			new Error("boom"),
		);

		expect(functionSubscriber.onBeforeErrorGet).not.toHaveBeenCalled();
	});
});
