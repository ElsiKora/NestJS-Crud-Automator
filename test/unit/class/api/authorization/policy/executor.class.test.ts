import type { IApiAuthorizationPolicySubscriberContext } from "@interface/class/api/authorization/policy/subscriber/context/interface";

import { ApiAuthorizationPolicyExecutor } from "@class/api/authorization/policy/executor.class";
import { EApiAuthorizationPrincipalType, EApiPolicyEffect } from "@enum/class/authorization";
import { EApiRouteType } from "@enum/decorator/api";
import { describe, expect, it, vi } from "vitest";

class ExecutorEntity {
	public id?: string;
}

const buildContext = (): IApiAuthorizationPolicySubscriberContext<ExecutorEntity> =>
	({
		action: "get",
		DATA: {
			action: "get",
			entity: ExecutorEntity,
			entityMetadata: {} as never,
			permissions: [],
			principal: { attributes: {}, id: "user", roles: [], type: EApiAuthorizationPrincipalType.USER },
		} as never,
		entity: ExecutorEntity,
		entityMetadata: {} as never,
		permissions: [],
		principal: { attributes: {}, id: "user", roles: [], type: EApiAuthorizationPrincipalType.USER },
	}) as IApiAuthorizationPolicySubscriberContext<ExecutorEntity>;

describe("ApiAuthorizationPolicyExecutor", () => {
	it.each([
		{ hookName: "onBeforeCreate", routeType: EApiRouteType.CREATE },
		{ hookName: "onBeforeDelete", routeType: EApiRouteType.DELETE },
		{ hookName: "onBeforeGet", routeType: EApiRouteType.GET },
		{ hookName: "onBeforeGetList", routeType: EApiRouteType.GET_LIST },
		{ hookName: "onBeforePartialUpdate", routeType: EApiRouteType.PARTIAL_UPDATE },
		{ hookName: "onBeforeUpdate", routeType: EApiRouteType.UPDATE },
	])("executes policy hook %s", async ({ hookName, routeType }) => {
		const hook = vi.fn().mockResolvedValue([
			{
				effect: EApiPolicyEffect.ALLOW,
			},
			null,
		]);
		const subscriber = {
			[hookName]: hook,
		};

		const result = await ApiAuthorizationPolicyExecutor.execute(subscriber as never, routeType, {
			...buildContext(),
			action: routeType,
			routeType,
		});

		expect(hook).toHaveBeenCalledTimes(1);
		expect(result).toHaveLength(1);
		expect(result[0]?.effect).toBe(EApiPolicyEffect.ALLOW);
	});

	it("executes custom action hook when route type is missing", async () => {
		const getCustomActionRule = vi.fn().mockResolvedValue([
			{
				effect: EApiPolicyEffect.DENY,
			},
			null,
		]);
		const subscriber = {
			getCustomActionRule,
		};

		const result = await ApiAuthorizationPolicyExecutor.execute(subscriber as never, "custom", buildContext());

		expect(getCustomActionRule).toHaveBeenCalledTimes(1);
		expect(result).toHaveLength(1);
		expect(result[0]?.effect).toBe(EApiPolicyEffect.DENY);
	});

	it("prefers explicit route type over action", async () => {
		const onBeforeGetList = vi.fn().mockResolvedValue([
			{
				effect: EApiPolicyEffect.ALLOW,
			},
		]);
		const subscriber = {
			onBeforeGetList,
		};

		const result = await ApiAuthorizationPolicyExecutor.execute(subscriber as never, "custom", {
			...buildContext(),
			action: "custom",
			routeType: EApiRouteType.GET_LIST,
		});

		expect(onBeforeGetList).toHaveBeenCalledTimes(1);
		expect(result).toHaveLength(1);
		expect(result[0]?.effect).toBe(EApiPolicyEffect.ALLOW);
	});

	it("does not derive a CRUD hook from action when routeType is missing", async () => {
		const onBeforeGet = vi.fn().mockResolvedValue([
			{
				effect: EApiPolicyEffect.ALLOW,
			},
		]);
		const getCustomActionRule = vi.fn().mockResolvedValue([
			{
				effect: EApiPolicyEffect.DENY,
			},
		]);
		const subscriber = {
			getCustomActionRule,
			onBeforeGet,
		};

		const result = await ApiAuthorizationPolicyExecutor.execute(subscriber as never, EApiRouteType.GET, {
			...buildContext(),
			action: EApiRouteType.GET,
			routeType: undefined,
		});

		expect(onBeforeGet).not.toHaveBeenCalled();
		expect(getCustomActionRule).toHaveBeenCalledTimes(1);
		expect(result[0]?.effect).toBe(EApiPolicyEffect.DENY);
	});

	it("returns empty when route hook is missing", async () => {
		const result = await ApiAuthorizationPolicyExecutor.execute({} as never, EApiRouteType.GET, {
			...buildContext(),
			action: EApiRouteType.GET,
			routeType: EApiRouteType.GET,
		});

		expect(result).toEqual([]);
	});

	it("returns empty when no route hook or custom action exists", async () => {
		const result = await ApiAuthorizationPolicyExecutor.execute({} as never, "unknown", buildContext());

		expect(result).toEqual([]);
	});
});
