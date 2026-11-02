import type { IApiBaseEntity, TApiControllerMethodMap, TApiControllerMethodName, TApiControllerMethodNameMap, TApiControllerTargetMethod } from "../../../../../../src";

import { ApiControllerGetMethodName, EApiRouteType } from "../../../../../../src";
import { describe, expect, it } from "vitest";

interface IGeneratedNameEntity {
	id: string;
}

type TGeneratedController = InstanceType<TApiControllerTargetMethod<IGeneratedNameEntity>>;

interface IExtendingEntity extends IApiBaseEntity {
	id: string;
}

type TControllerWithoutDelete = Omit<TGeneratedController, "delete">;

type TExtendingController = InstanceType<TApiControllerTargetMethod<IExtendingEntity>>;

type TTypeEqual<L, R> = (<T>() => T extends L ? 1 : 2) extends <T>() => T extends R ? 1 : 2 ? true : false;

const EXPECTED_METHOD_NAMES: TApiControllerMethodNameMap = {
	[EApiRouteType.CREATE]: "create",
	[EApiRouteType.DELETE]: "delete",
	[EApiRouteType.GET]: "get",
	[EApiRouteType.GET_LIST]: "getList",
	[EApiRouteType.PARTIAL_UPDATE]: "partialUpdate",
	[EApiRouteType.UPDATE]: "update",
};

/**
 * Names the generated methods by the runtime names, so a type that drifts from them stops compiling.
 * @param {TGeneratedController} controller Generated controller.
 * @returns {ReadonlyArray<unknown>} The generated methods.
 */
function acceptRuntimeNames(controller: TGeneratedController): ReadonlyArray<unknown> {
	return [controller.create, controller.delete, controller.get, controller.getList, controller.partialUpdate, controller.update];
}

/**
 * Names the generated methods by names they do not have at runtime.
 * @param {TGeneratedController} controller Generated controller.
 * @returns {ReadonlyArray<unknown>} Never read; the function only has to compile.
 */
function rejectOtherNames(controller: TGeneratedController): ReadonlyArray<unknown> {
	return [
		// @ts-expect-error The runtime name is create
		controller.Create,
		// @ts-expect-error The runtime name is create
		controller.xCreate,
		// @ts-expect-error The runtime name is create
		controller.anythingCreate,
		// @ts-expect-error The runtime name is delete
		controller.Delete,
		// @ts-expect-error The runtime name is delete
		controller.xDelete,
		// @ts-expect-error The runtime name is get
		controller.Get,
		// @ts-expect-error The runtime name is get
		controller.xGet,
		// @ts-expect-error The runtime name is getList
		controller.GetList,
		// @ts-expect-error The runtime name is getList
		controller.xGetList,
		// @ts-expect-error The runtime name is partialUpdate
		controller.PartialUpdate,
		// @ts-expect-error The runtime name is partialUpdate
		controller.xPartialUpdate,
		// @ts-expect-error The runtime name is update
		controller.Update,
		// @ts-expect-error The runtime name is update
		controller.xUpdate,
	];
}

/**
 * Removes a disabled route from the type, since the exported types list all six methods.
 * @param {TControllerWithoutDelete} controller Controller with a disabled delete route.
 * @returns {ReadonlyArray<unknown>} Never read; the function only has to compile.
 */
function omitDisabledRoute(controller: TControllerWithoutDelete): ReadonlyArray<unknown> {
	return [
		controller.create,
		// @ts-expect-error The delete route is disabled
		controller.delete,
	];
}

class DecoratedController {
	public service: unknown;
}

// eslint-disable-next-line @elsikora/typescript/no-unsafe-declaration-merging
interface MergedController extends TApiControllerMethodMap<IGeneratedNameEntity> {}

// eslint-disable-next-line @elsikora/typescript/no-unsafe-declaration-merging
class MergedController {
	public service: unknown;
}

/**
 * Shows that a decorated class keeps its own type until the methods are merged into it.
 * @param {DecoratedController} decorated A class without merged methods.
 * @param {MergedController} merged A class with merged methods.
 * @returns {ReadonlyArray<unknown>} Never read; the function only has to compile.
 */
function reachDecoratedClass(decorated: DecoratedController, merged: MergedController): ReadonlyArray<unknown> {
	return [
		// @ts-expect-error A decorator cannot change a class's type
		decorated.create,
		merged.create,
		merged.getList,
	];
}

/**
 * Calls the generated methods of an entity that extends the base interface.
 * @param {TExtendingController} controller Generated controller.
 * @returns {ReadonlyArray<unknown>} Never read; the function only has to compile.
 */
function callExtendingEntityMethods(controller: TExtendingController): ReadonlyArray<unknown> {
	return [
		controller.create({ id: "id" }, {}, "127.0.0.1"),
		controller.get({ id: "id" }, {}, "127.0.0.1"),
		controller.update({ id: "id" }, { id: "other" }, {}, "127.0.0.1"),
		controller.partialUpdate({ id: "id" }, { id: "other" }, {}, "127.0.0.1"),
		controller.delete({ id: "id" }, {}, "127.0.0.1"),
		// @ts-expect-error bugfix/base-entity-index-signature makes this call compile and removes this directive
		controller.getList({ limit: 10, page: 1 }, {}, "127.0.0.1"),
	];
}

describe("generated controller method names", () => {
	it("gives every route type exactly its runtime name as a type", () => {
		const create: TTypeEqual<TApiControllerMethodName<EApiRouteType.CREATE>, "create"> = true;
		const remove: TTypeEqual<TApiControllerMethodName<EApiRouteType.DELETE>, "delete"> = true;
		const get: TTypeEqual<TApiControllerMethodName<EApiRouteType.GET>, "get"> = true;
		const getList: TTypeEqual<TApiControllerMethodName<EApiRouteType.GET_LIST>, "getList"> = true;
		const partialUpdate: TTypeEqual<TApiControllerMethodName<EApiRouteType.PARTIAL_UPDATE>, "partialUpdate"> = true;
		const update: TTypeEqual<TApiControllerMethodName<EApiRouteType.UPDATE>, "update"> = true;
		const nameMap: TTypeEqual<TApiControllerMethodNameMap, { [K in EApiRouteType]: `${K}` }> = true;
		const controllerKeys: TTypeEqual<Exclude<keyof TGeneratedController, "service">, `${EApiRouteType}`> = true;

		expect([create, remove, get, getList, partialUpdate, update, nameMap, controllerKeys]).not.toContain(false);
	});

	it("returns the type's name from ApiControllerGetMethodName for a known route type", () => {
		const create: TTypeEqual<ReturnType<typeof ApiControllerGetMethodName<EApiRouteType.CREATE>>, TApiControllerMethodName<EApiRouteType.CREATE>> = true;
		const getList: TApiControllerMethodName<EApiRouteType.GET_LIST> = ApiControllerGetMethodName(EApiRouteType.GET_LIST);

		// @ts-expect-error The runtime name of the get list route is getList
		const wrongName: TApiControllerMethodName<EApiRouteType.GET_LIST> = "GetList";

		expect(create).toBe(true);
		expect(getList).toBe("getList");
		expect(wrongName).not.toBe(getList);
	});

	it.each(Object.values(EApiRouteType))("names the %s route at runtime as the type names it", (route: EApiRouteType) => {
		const typedName: TApiControllerMethodNameMap[EApiRouteType] = EXPECTED_METHOD_NAMES[route];

		expect(ApiControllerGetMethodName(route)).toBe(typedName);
	});

	it("keeps the name checks referenced", () => {
		expect([acceptRuntimeNames, callExtendingEntityMethods, MergedController, omitDisabledRoute, reachDecoratedClass, rejectOtherNames].every((check: unknown) => typeof check === "function")).toBe(true);
	});
});
