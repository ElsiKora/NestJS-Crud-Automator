import type { IApiControllerProperties, IApiFunctionProperties } from "@interface/decorator/api";

import { ApiFunctionCreate } from "@decorator/api/function/create.decorator";
import { ApiFunctionDelete } from "@decorator/api/function/delete.decorator";
import { ApiFunctionGet } from "@decorator/api/function/get/decorator";
import { ApiFunctionUpdate } from "@decorator/api/function/update.decorator";
import { EApiFunctionTransactionMode, EApiFunctionType, EApiRouteType } from "@enum/decorator/api";
import { ApiControllerAssertRouteFunctions } from "@utility/api/controller/assert";
import { describe, expect, it } from "vitest";

import { RuntimeRouteEntity } from "@test/unit/class/api/route/runtime/fixture";

type TCheckedFunctionType = EApiFunctionType.CREATE | EApiFunctionType.DELETE | EApiFunctionType.GET | EApiFunctionType.UPDATE;

const DISABLED: { generation: { isEnabled: false } } = { generation: { isEnabled: false } };

const DECORATORS: Record<TCheckedFunctionType, (properties: IApiFunctionProperties<RuntimeRouteEntity>) => (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor> = {
	[EApiFunctionType.CREATE]: ApiFunctionCreate,
	[EApiFunctionType.DELETE]: ApiFunctionDelete,
	[EApiFunctionType.GET]: ApiFunctionGet,
	[EApiFunctionType.UPDATE]: ApiFunctionUpdate,
};

const ALL_SUPPORTS: Record<TCheckedFunctionType, EApiFunctionTransactionMode> = {
	[EApiFunctionType.CREATE]: EApiFunctionTransactionMode.SUPPORTS,
	[EApiFunctionType.DELETE]: EApiFunctionTransactionMode.SUPPORTS,
	[EApiFunctionType.GET]: EApiFunctionTransactionMode.SUPPORTS,
	[EApiFunctionType.UPDATE]: EApiFunctionTransactionMode.SUPPORTS,
};

/**
 * Builds a service whose functions are decorated with one transaction mode each, or not decorated.
 * @param {Partial<Record<TCheckedFunctionType, EApiFunctionTransactionMode>>} modes - Transaction mode of each decorated function; a function left out is not decorated.
 * @returns {object} Service instance.
 */
function createService(modes: Partial<Record<TCheckedFunctionType, EApiFunctionTransactionMode>>): object {
	class AssertFunctionsService {}

	for (const functionType of Object.keys(DECORATORS) as Array<TCheckedFunctionType>) {
		const descriptor: PropertyDescriptor = { configurable: true, value: async (): Promise<RuntimeRouteEntity> => ({ id: "row" }), writable: true };
		const mode: EApiFunctionTransactionMode | undefined = modes[functionType];

		if (mode) {
			DECORATORS[functionType]({ entity: RuntimeRouteEntity, transaction: { mode } })(AssertFunctionsService.prototype, functionType, descriptor);
		}

		Object.defineProperty(AssertFunctionsService.prototype, functionType, descriptor);
	}

	return new AssertFunctionsService();
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

const MODE_CASES: ReadonlyArray<[EApiFunctionTransactionMode, EApiFunctionTransactionMode | undefined, boolean]> = [
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
];

/**
 * Picks the route mode under which every other function of a mode case runs.
 * @param {EApiFunctionTransactionMode | undefined} routeMode - Route mode of the case.
 * @returns {EApiFunctionTransactionMode} A mode that runs under that route mode.
 */
function createFittingMode(routeMode: EApiFunctionTransactionMode | undefined): EApiFunctionTransactionMode {
	return routeMode === EApiFunctionTransactionMode.NONE ? EApiFunctionTransactionMode.NONE : EApiFunctionTransactionMode.SUPPORTS;
}

describe("ApiControllerAssertRouteFunctions", () => {
	it.each<[EApiRouteType, TCheckedFunctionType, string]>([
		[EApiRouteType.CREATE, EApiFunctionType.CREATE, "writes through"],
		[EApiRouteType.CREATE, EApiFunctionType.GET, "reads its response through"],
		[EApiRouteType.DELETE, EApiFunctionType.DELETE, "writes through"],
		[EApiRouteType.GET, EApiFunctionType.GET, "reads its response through"],
		[EApiRouteType.PARTIAL_UPDATE, EApiFunctionType.UPDATE, "writes through"],
		[EApiRouteType.PARTIAL_UPDATE, EApiFunctionType.GET, "reads its response through"],
		[EApiRouteType.UPDATE, EApiFunctionType.UPDATE, "writes through"],
		[EApiRouteType.UPDATE, EApiFunctionType.GET, "reads its response through"],
	])("refuses route %s without a decorated %s function", (routeType: EApiRouteType, functionType: TCheckedFunctionType, purpose: string) => {
		const modes: Partial<Record<TCheckedFunctionType, EApiFunctionTransactionMode>> = { ...ALL_SUPPORTS };
		delete modes[functionType];
		const name: string = functionType.toUpperCase();

		expect(() => ApiControllerAssertRouteFunctions(createProperties(routeType), createService(modes), "ItemController")).toThrow(`Controller "ItemController" route "${routeType}" ${purpose} the ${name} function of service "AssertFunctionsService", but that service has no ${name} function protected by its built-in decorator.`);
	});

	it("does not check route getList", () => {
		expect(() => ApiControllerAssertRouteFunctions(createProperties(EApiRouteType.GET_LIST), createService({}), "ItemController")).not.toThrow();
	});

	it("does not check a disabled route", () => {
		expect(() => ApiControllerAssertRouteFunctions({ entity: RuntimeRouteEntity, routes: Object.fromEntries(Object.values(EApiRouteType).map((routeType: EApiRouteType): [string, object] => [routeType, DISABLED])) } as unknown as IApiControllerProperties<RuntimeRouteEntity>, createService({}), "ItemController")).not.toThrow();
	});

	describe.each<[EApiRouteType, TCheckedFunctionType]>([
		[EApiRouteType.CREATE, EApiFunctionType.CREATE],
		[EApiRouteType.CREATE, EApiFunctionType.GET],
		[EApiRouteType.DELETE, EApiFunctionType.DELETE],
		[EApiRouteType.GET, EApiFunctionType.GET],
		[EApiRouteType.PARTIAL_UPDATE, EApiFunctionType.UPDATE],
		[EApiRouteType.UPDATE, EApiFunctionType.UPDATE],
		[EApiRouteType.UPDATE, EApiFunctionType.GET],
	])("route %s and its %s function", (routeType: EApiRouteType, functionType: TCheckedFunctionType) => {
		it.each(MODE_CASES)("with function mode %s and route mode %s refuses: %s", (functionMode: EApiFunctionTransactionMode, routeMode: EApiFunctionTransactionMode | undefined, isRefused: boolean) => {
			const fittingMode: EApiFunctionTransactionMode = createFittingMode(routeMode);
			const modes: Record<TCheckedFunctionType, EApiFunctionTransactionMode> = { [EApiFunctionType.CREATE]: fittingMode, [EApiFunctionType.DELETE]: fittingMode, [EApiFunctionType.GET]: fittingMode, [EApiFunctionType.UPDATE]: fittingMode, [functionType]: functionMode };
			const assertion: () => void = (): void => ApiControllerAssertRouteFunctions(createProperties(routeType, routeMode), createService(modes), "ItemController");

			if (isRefused) {
				expect(assertion).toThrow(`Controller "ItemController" route "${routeType}" runs in transaction mode ${routeMode ?? EApiFunctionTransactionMode.SUPPORTS}, but the ${functionType.toUpperCase()} function of service "AssertFunctionsService" runs in mode ${functionMode}`);
			} else {
				expect(assertion).not.toThrow();
			}
		});
	});
});
