import { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import { DtoGenerateCacheKey } from "@utility/dto/generate/cache-key.utility";
import { describe, expect, it } from "vitest";

describe("DtoGenerateCacheKey", () => {
	it("builds cache key without guard", () => {
		const key = DtoGenerateCacheKey({
			dtoConfig: { validators: [] },
			dtoType: EApiDtoType.BODY,
			entityName: "TestEntity",
			method: EApiRouteType.CREATE,
		});

		expect(key).toBe('no-controller_TestEntity_create_body_no-guard_no-query-plan_{"validators":[]}');
	});

	it("builds cache key with guard name", () => {
		const key = DtoGenerateCacheKey({
			dtoConfig: {},
			dtoType: EApiDtoType.RESPONSE,
			entityName: "TestEntity",
			guardName: "JwtGuard",
			method: EApiRouteType.GET,
		});

		expect(key).toBe("no-controller_TestEntity_get_response_JwtGuard_no-query-plan_{}");
	});

	it("scopes typed query DTOs by controller and normalized plan", () => {
		const key = DtoGenerateCacheKey({
			controllerName: "PublicController",
			dtoType: EApiDtoType.QUERY,
			entityName: "TestEntity",
			method: EApiRouteType.GET_LIST,
			queryPlanSignature: "plan-a",
		});

		expect(key).toBe("PublicController_TestEntity_getList_query_no-guard_plan-a_{}");
	});
});
