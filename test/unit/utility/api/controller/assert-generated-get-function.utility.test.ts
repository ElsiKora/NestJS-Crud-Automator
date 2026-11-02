import type { IApiControllerProperties } from "@interface/decorator/api";

import { ApiFunctionGet } from "@decorator/api/function/get/decorator";
import { EApiFunctionTransactionMode, EApiFunctionType, EApiRouteType } from "@enum/decorator/api";
import { ApiControllerAssertGeneratedGetFunction } from "@utility/api/controller/assert-generated-get-function.utility";
import { describe, expect, it } from "vitest";

import { RuntimeRouteEntity } from "@test/unit/class/api/route/runtime/fixture";

const DISABLED: { generation: { isEnabled: false } } = { generation: { isEnabled: false } };

/**
 * Builds a service whose GET function is decorated with one transaction mode, or not decorated.
 * @param {EApiFunctionTransactionMode | undefined} getMode - Transaction mode of the GET function, or undefined for an undecorated one.
 * @returns {object} Service instance.
 */
function createService(getMode: EApiFunctionTransactionMode | undefined): object {
	class AssertGetFunctionService {}

	const descriptor: PropertyDescriptor = { configurable: true, value: async (): Promise<RuntimeRouteEntity> => ({ id: "row" }), writable: true };

	if (getMode) {
		ApiFunctionGet({ entity: RuntimeRouteEntity, transaction: { mode: getMode } })(AssertGetFunctionService.prototype, EApiFunctionType.GET, descriptor);
	}

	Object.defineProperty(AssertGetFunctionService.prototype, EApiFunctionType.GET, descriptor);

	return new AssertGetFunctionService();
}

/**
 * Builds controller properties that enable one generated route in one transaction mode.
 * @param {EApiRouteType} routeType - The enabled route.
 * @param {EApiFunctionTransactionMode} [routeMode] - Transaction mode of that route.
 * @returns {IApiControllerProperties<RuntimeRouteEntity>} Controller properties.
 */
function createProperties(routeType: EApiRouteType, routeMode?: EApiFunctionTransactionMode): IApiControllerProperties<RuntimeRouteEntity> {
	const routes: Record<string, object> = Object.fromEntries(Object.values(EApiRouteType).map((candidate: EApiRouteType): [string, object] => [candidate, candidate === routeType ? (routeMode ? { transaction: { mode: routeMode } } : {}) : DISABLED]));

	return { entity: RuntimeRouteEntity, routes } as unknown as IApiControllerProperties<RuntimeRouteEntity>;
}

describe("ApiControllerAssertGeneratedGetFunction", () => {
	it.each([EApiRouteType.CREATE, EApiRouteType.GET, EApiRouteType.PARTIAL_UPDATE, EApiRouteType.UPDATE])("refuses route %s without a decorated GET function", (routeType: EApiRouteType) => {
		expect(() => ApiControllerAssertGeneratedGetFunction(createProperties(routeType), createService(undefined), "ItemController")).toThrow(`Controller "ItemController" route "${routeType}" reads its response through the GET function of service "AssertGetFunctionService", but that service has no GET function protected by its built-in decorator.`);
	});

	it.each([EApiRouteType.DELETE, EApiRouteType.GET_LIST])("does not check route %s", (routeType: EApiRouteType) => {
		expect(() => ApiControllerAssertGeneratedGetFunction(createProperties(routeType), createService(undefined), "ItemController")).not.toThrow();
	});

	it.each([
		[EApiFunctionTransactionMode.MANDATORY, EApiFunctionTransactionMode.NONE, true],
		[EApiFunctionTransactionMode.MANDATORY, EApiFunctionTransactionMode.SUPPORTS, true],
		[EApiFunctionTransactionMode.MANDATORY, undefined, true],
		[EApiFunctionTransactionMode.MANDATORY, EApiFunctionTransactionMode.REQUIRED, false],
		[EApiFunctionTransactionMode.MANDATORY, EApiFunctionTransactionMode.MANDATORY, false],
		[EApiFunctionTransactionMode.NONE, EApiFunctionTransactionMode.REQUIRED, true],
		[EApiFunctionTransactionMode.NONE, EApiFunctionTransactionMode.MANDATORY, true],
		[EApiFunctionTransactionMode.NONE, EApiFunctionTransactionMode.SUPPORTS, false],
		[EApiFunctionTransactionMode.NONE, EApiFunctionTransactionMode.NONE, false],
		[EApiFunctionTransactionMode.REQUIRED, EApiFunctionTransactionMode.NONE, false],
		[EApiFunctionTransactionMode.SUPPORTS, EApiFunctionTransactionMode.MANDATORY, false],
	])("with a %s GET function and route mode %s refuses: %s", (getMode: EApiFunctionTransactionMode, routeMode: EApiFunctionTransactionMode | undefined, isRefused: boolean) => {
		const assertion: () => void = (): void => ApiControllerAssertGeneratedGetFunction(createProperties(EApiRouteType.UPDATE, routeMode), createService(getMode), "ItemController");

		if (isRefused) {
			expect(assertion).toThrow(`Controller "ItemController" route "update" runs in transaction mode ${routeMode ?? EApiFunctionTransactionMode.SUPPORTS}, but the GET function of service "AssertGetFunctionService" runs in mode ${getMode}`);
		} else {
			expect(assertion).not.toThrow();
		}
	});
});
