import type { IApiAuthorizationPolicySubscriberContext } from "@interface/class/api/authorization/policy/subscriber/context/interface";

import { ApiAuthorizationPolicyExecutor } from "@class/api/authorization/policy/executor.class";
import { EAuthorizationEffect } from "@enum/class/authorization/effect.enum";
import { EApiRouteType } from "@enum/decorator/api";
import { describe, expect, it, vi } from "vitest";

class ExecutorEntity {
	public id?: string;
}

const buildContext = (): IApiAuthorizationPolicySubscriberContext<ExecutorEntity> =>
	({
		action: "get",
		DATA: {} as never,
		entity: ExecutorEntity,
		entityMetadata: {} as never,
		subject: { id: "user", permissions: [], roles: [] },
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
				effect: EAuthorizationEffect.ALLOW,
			},
			null,
		]);
		const subscriber = {
			[hookName]: hook,
		};

		const result = await ApiAuthorizationPolicyExecutor.execute(subscriber as never, routeType, {
			...buildContext(),
			action: routeType,
			routeType: undefined,
		});

		expect(hook).toHaveBeenCalledTimes(1);
		expect(result).toHaveLength(1);
		expect(result[0]?.effect).toBe(EAuthorizationEffect.ALLOW);
	});

	it("executes custom action hook when route type is missing", async () => {
		const getCustomActionRule = vi.fn().mockResolvedValue([
			{
				effect: EAuthorizationEffect.DENY,
			},
			null,
		]);
		const subscriber = {
			getCustomActionRule,
		};

		const result = await ApiAuthorizationPolicyExecutor.execute(subscriber as never, "custom", buildContext());

		expect(getCustomActionRule).toHaveBeenCalledTimes(1);
		expect(result).toHaveLength(1);
		expect(result[0]?.effect).toBe(EAuthorizationEffect.DENY);
	});

	it("prefers explicit route type over action", async () => {
		const onBeforeGetList = vi.fn().mockResolvedValue([
			{
				effect: EAuthorizationEffect.ALLOW,
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
		expect(result[0]?.effect).toBe(EAuthorizationEffect.ALLOW);
	});

	it("returns empty when route hook is missing", async () => {
		const result = await ApiAuthorizationPolicyExecutor.execute({} as never, EApiRouteType.GET, {
			...buildContext(),
			action: EApiRouteType.GET,
			routeType: undefined,
		});

		expect(result).toEqual([]);
	});

	it("returns empty when no route hook or custom action exists", async () => {
		const result = await ApiAuthorizationPolicyExecutor.execute({} as never, "unknown", buildContext());

		expect(result).toEqual([]);
	});
});
