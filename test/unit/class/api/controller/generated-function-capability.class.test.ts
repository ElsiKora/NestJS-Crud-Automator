import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

import { ApiControllerGeneratedFunctionCapability } from "@class/api/controller/generated/function-capability.class";
import { ApiControllerGeneratedReadScopeStorage } from "@class/api/controller/generated/read-scope-storage.class";
import { ApiServiceBase } from "@class/api/service-base.class";
import { ApiFunctionGet } from "@decorator/api/function/get/decorator";
import { ApiService } from "@decorator/api/service/decorator";
import { EApiFunctionType } from "@enum/decorator/api";
import { describe, expect, it, vi } from "vitest";

import { RuntimeRouteEntity, RuntimeRouteRelationEntity } from "@test/unit/class/api/route/runtime/fixture";

describe("ApiControllerGeneratedFunctionCapability", () => {
	it("accepts an inherited built-in decorated implementation and a decorated override", () => {
		const basePrototype: object = {};
		const baseDescriptor: PropertyDescriptor = {
			configurable: true,
			value: async (): Promise<RuntimeRouteEntity> => ({ id: "base" }),
			writable: true,
		};

		ApiFunctionGet({ entity: RuntimeRouteEntity })(basePrototype, EApiFunctionType.GET, baseDescriptor);
		Object.defineProperty(basePrototype, EApiFunctionType.GET, baseDescriptor);
		const inheritedService: object = Object.create(basePrototype) as object;

		expect(ApiControllerGeneratedFunctionCapability.resolve(inheritedService, EApiFunctionType.GET, EApiFunctionType.GET, RuntimeRouteEntity)).toBe(baseDescriptor.value);

		const childPrototype: object = Object.create(basePrototype) as object;
		const childDescriptor: PropertyDescriptor = {
			configurable: true,
			value: async (): Promise<RuntimeRouteEntity> => ({ id: "child" }),
			writable: true,
		};

		ApiFunctionGet({ entity: RuntimeRouteEntity })(childPrototype, EApiFunctionType.GET, childDescriptor);
		Object.defineProperty(childPrototype, EApiFunctionType.GET, childDescriptor);

		expect(ApiControllerGeneratedFunctionCapability.resolve(Object.create(childPrototype) as object, EApiFunctionType.GET, EApiFunctionType.GET, RuntimeRouteEntity)).toBe(childDescriptor.value);
	});

	it("rejects undecorated own and inherited overrides", () => {
		const markedPrototype: object = {};
		const markedFunction = async (): Promise<RuntimeRouteEntity> => ({ id: "marked" });

		Object.defineProperty(markedPrototype, EApiFunctionType.GET, { configurable: true, value: markedFunction, writable: true });
		ApiControllerGeneratedFunctionCapability.mark(markedFunction, EApiFunctionType.GET, RuntimeRouteEntity);

		const inheritedOverridePrototype: object = Object.create(markedPrototype) as object;
		const inheritedOverride = vi.fn();
		Object.defineProperty(inheritedOverridePrototype, EApiFunctionType.GET, { configurable: true, value: inheritedOverride, writable: true });

		expect(() => ApiControllerGeneratedFunctionCapability.resolve(Object.create(inheritedOverridePrototype) as object, EApiFunctionType.GET, EApiFunctionType.GET, RuntimeRouteEntity)).toThrow("not protected by its built-in decorator");

		const ownOverride = vi.fn();
		const ownService: object = Object.create(markedPrototype) as object;
		Object.defineProperty(ownService, EApiFunctionType.GET, { configurable: true, value: ownOverride, writable: true });

		expect(() => ApiControllerGeneratedFunctionCapability.resolve(ownService, EApiFunctionType.GET, EApiFunctionType.GET, RuntimeRouteEntity)).toThrow("not protected by its built-in decorator");
		expect(inheritedOverride).not.toHaveBeenCalled();
		expect(ownOverride).not.toHaveBeenCalled();
	});

	it("rejects accessors without invoking their getter", () => {
		const getter = vi.fn(() => vi.fn());
		const service: object = {};

		Object.defineProperty(service, EApiFunctionType.DELETE, { configurable: true, get: getter });

		expect(() => ApiControllerGeneratedFunctionCapability.resolve(service, EApiFunctionType.DELETE, EApiFunctionType.DELETE, RuntimeRouteEntity)).toThrow("must be a data function");
		expect(getter).not.toHaveBeenCalled();
	});

	it("binds a capability to the exact entity and function type", () => {
		const implementation = vi.fn();
		const service = { get: implementation };

		ApiControllerGeneratedFunctionCapability.mark(implementation, EApiFunctionType.GET, RuntimeRouteEntity);

		expect(() => ApiControllerGeneratedFunctionCapability.resolve(service, EApiFunctionType.GET, EApiFunctionType.GET, RuntimeRouteRelationEntity)).toThrow("not protected by its built-in decorator");
		expect(() => ApiControllerGeneratedFunctionCapability.resolve(service, EApiFunctionType.GET, EApiFunctionType.GET_LIST, RuntimeRouteEntity)).toThrow("not protected by its built-in decorator");
	});

	it("uses the captured native function identity instead of an own call property", async () => {
		const maliciousCall = vi.fn();
		const input: object = {};
		const implementation = vi.fn(async function (this: object, properties: object): Promise<object> {
			ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.GET, properties);

			return this;
		});
		const service = { get: implementation };

		Object.defineProperty(implementation, "call", { configurable: true, value: maliciousCall });
		ApiControllerGeneratedFunctionCapability.mark(implementation, EApiFunctionType.GET, RuntimeRouteEntity);
		const resolved: (...arguments_: Array<never>) => unknown = ApiControllerGeneratedFunctionCapability.resolve(service, EApiFunctionType.GET, EApiFunctionType.GET, RuntimeRouteEntity);

		await expect(ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.GET, input, { id: "safe" }, async (): Promise<unknown> => await Reflect.apply(resolved, service, [input as never]))).resolves.toBe(service);
		expect(implementation).toHaveBeenCalledOnce();
		expect(maliciousCall).not.toHaveBeenCalled();
	});

	it("rejects bare ApiServiceBase stubs and accepts ApiService generated functions", () => {
		const bareService: ApiServiceBase<RuntimeRouteEntity> = new ApiServiceBase<RuntimeRouteEntity>();

		expect(() => ApiControllerGeneratedFunctionCapability.resolve(bareService, EApiFunctionType.GET, EApiFunctionType.GET, RuntimeRouteEntity)).toThrow("not protected by its built-in decorator");

		const GeneratedService = ApiService<IApiBaseEntity>({ entity: RuntimeRouteEntity })(class extends ApiServiceBase<RuntimeRouteEntity> {});
		const generatedService: object = new GeneratedService();

		for (const functionType of [EApiFunctionType.GET, EApiFunctionType.GET_LIST, EApiFunctionType.GET_MANY, EApiFunctionType.UPDATE, EApiFunctionType.DELETE] as const) {
			expect(() => ApiControllerGeneratedFunctionCapability.resolve(generatedService, functionType, functionType, RuntimeRouteEntity)).not.toThrow();
		}
	});
});
