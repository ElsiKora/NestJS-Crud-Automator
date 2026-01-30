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

		expect(key).toBe('TestEntity_create_body_no-guard_{"validators":[]}');
	});

	it("builds cache key with guard name", () => {
		const key = DtoGenerateCacheKey({
			dtoConfig: {},
			dtoType: EApiDtoType.RESPONSE,
			entityName: "TestEntity",
			guardName: "JwtGuard",
			method: EApiRouteType.GET,
		});

		expect(key).toBe("TestEntity_get_response_JwtGuard_{}");
	});
});
