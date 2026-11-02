import type { CanActivate, Type } from "@nestjs/common";

import { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import { DtoGenerateCacheKey } from "@utility/dto/generate/cache-key.utility";
import { describe, expect, it } from "vitest";

class TestEntity {}

class JwtGuard implements CanActivate {
	public canActivate(): boolean {
		return true;
	}
}

const createSameNameClass = (): Type<CanActivate> => {
	class SameNameClass implements CanActivate {
		public canActivate(): boolean {
			return true;
		}
	}

	return SameNameClass;
};

describe("DtoGenerateCacheKey", () => {
	it("builds cache key without guard", () => {
		const key = DtoGenerateCacheKey({
			dtoConfig: { validators: [] },
			dtoType: EApiDtoType.BODY,
			entity: TestEntity,
			method: EApiRouteType.CREATE,
		});

		expect(key).toMatch(/^no-controller_TestEntity#\d+_create_body_no-guard_no-query-plan_\{"validators":\[\]\}$/);
	});

	it("gives two guard classes that share a name different keys and one class the same key", () => {
		const FirstGuard = createSameNameClass();
		const SecondGuard = createSameNameClass();
		const keyOf = (guard: Type<CanActivate>): string => DtoGenerateCacheKey({ dtoConfig: {}, dtoType: EApiDtoType.RESPONSE, entity: TestEntity, guard, method: EApiRouteType.GET });

		expect(FirstGuard.name).toBe(SecondGuard.name);
		expect(keyOf(FirstGuard)).not.toBe(keyOf(SecondGuard));
		expect(keyOf(FirstGuard)).toBe(keyOf(FirstGuard));
	});

	it("gives two validator classes that share a name different keys and one class the same key", () => {
		const FirstConstraint = createSameNameClass();
		const SecondConstraint = createSameNameClass();
		const keyOf = (constraintClass: Type<CanActivate>): string => DtoGenerateCacheKey({ dtoConfig: { validators: [{ constraintClass, options: ["same"] }] }, dtoType: EApiDtoType.BODY, entity: TestEntity, method: EApiRouteType.CREATE });

		expect(keyOf(FirstConstraint)).not.toBe(keyOf(SecondConstraint));
		expect(keyOf(FirstConstraint)).toBe(keyOf(FirstConstraint));
	});

	it("builds cache key with the guard class", () => {
		const key = DtoGenerateCacheKey({
			dtoConfig: {},
			dtoType: EApiDtoType.RESPONSE,
			entity: TestEntity,
			guard: JwtGuard,
			method: EApiRouteType.GET,
		});

		expect(key).toMatch(/^no-controller_TestEntity#\d+_get_response_JwtGuard#\d+_no-query-plan_\{\}$/);
	});

	it("scopes typed query DTOs by controller and normalized plan", () => {
		const key = DtoGenerateCacheKey({
			controllerName: "PublicController",
			dtoType: EApiDtoType.QUERY,
			entity: TestEntity,
			method: EApiRouteType.GET_LIST,
			queryPlanSignature: "plan-a",
		});

		expect(key).toMatch(/^PublicController_TestEntity#\d+_getList_query_no-guard_plan-a_\{\}$/);
	});

	it("scopes polymorphic response variants by name", () => {
		const key = DtoGenerateCacheKey({
			dtoType: EApiDtoType.RESPONSE,
			entity: TestEntity,
			method: EApiRouteType.GET,
			responseVariantName: "TestEntityGetResponseCardTransferDTO",
		});

		expect(key).toMatch(/^no-controller_TestEntity#\d+_get_response_no-guard_no-query-plan_\{\}_TestEntityGetResponseCardTransferDTO$/);
	});

	it("keys same-named entity classes apart and one class stably", () => {
		const SecondTestEntity = (() => {
			class TestEntity {}

			return TestEntity;
		})();
		const firstKey = DtoGenerateCacheKey({ dtoType: EApiDtoType.BODY, entity: TestEntity, method: EApiRouteType.CREATE });
		const secondKey = DtoGenerateCacheKey({ dtoType: EApiDtoType.BODY, entity: SecondTestEntity, method: EApiRouteType.CREATE });

		expect(secondKey).not.toBe(firstKey);
		expect(DtoGenerateCacheKey({ dtoType: EApiDtoType.BODY, entity: TestEntity, method: EApiRouteType.CREATE })).toBe(firstKey);
	});

	it.each<[string, unknown, unknown]>([
		["regular expressions", /a/, /b/],
		["regular expression flags", /a/g, /a/i],
		["maps", new Map([["key", 1]]), new Map([["key", 2]])],
		["map keys", new Map([["first", 1]]), new Map([["second", 1]])],
		["sets", new Set([1]), new Set([2])],
		["symbols", Symbol("first"), Symbol("second")],
		["symbols with one description", Symbol("same"), Symbol("same")],
		["bigints", 1n, 2n],
		["a map and an equal array", new Map([["key", 1]]), [["key", 1]]],
		["a set and an equal array", new Set([1]), [1]],
		["a regular expression and its text", /a/, "RegExp:/a/"],
	])("tells apart validator options that hold different %s", (_label: string, first: unknown, second: unknown) => {
		const key = (option: unknown): string => DtoGenerateCacheKey({ dtoConfig: { validators: [{ constraintClass: TestEntity, options: [option] }] } as never, dtoType: EApiDtoType.BODY, entity: TestEntity, method: EApiRouteType.CREATE });

		expect(key(first)).not.toBe(key(second));
		expect(key(first)).toBe(key(first));
	});
	it("keys body DTOs apart by the fields the path binds", () => {
		const base = { controllerName: "Tenant", dtoType: EApiDtoType.BODY, entity: TestEntity, method: EApiRouteType.CREATE };

		expect(DtoGenerateCacheKey({ ...base, pathFields: ["tenantId"] })).not.toBe(DtoGenerateCacheKey(base));
		expect(DtoGenerateCacheKey({ ...base, pathFields: ["tenantId"] })).not.toBe(DtoGenerateCacheKey({ ...base, pathFields: ["ownerId"] }));
		expect(DtoGenerateCacheKey({ ...base, pathFields: [] })).toBe(DtoGenerateCacheKey(base));
	});
});
