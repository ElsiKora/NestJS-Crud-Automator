import type { Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { DtoIsPropertyExposedForGuard } from "@utility/dto/is/property/exposed-for-guard.utility";
import { EApiDtoType, EApiRouteType, EApiPropertyDescribeType, EApiPropertyStringType } from "@enum/decorator/api";
import { describe, expect, it } from "vitest";

class GuardA {}
class GuardB {}

const baseProperty: TApiPropertyDescribeProperties = {
	description: "name",
	format: EApiPropertyStringType.STRING,
	maxLength: 100,
	minLength: 1,
	pattern: "/^.+$/",
	type: EApiPropertyDescribeType.STRING,
} as TApiPropertyDescribeProperties;

describe("DtoIsPropertyExposedForGuard", () => {
	it("returns true when no guard config is provided", () => {
		const result = DtoIsPropertyExposedForGuard(EApiRouteType.GET, baseProperty, EApiDtoType.RESPONSE, GuardA as Type<IAuthGuard>);

		expect(result).toBe(true);
	});

	it("returns true when current guard is missing", () => {
		const guardedProperty: TApiPropertyDescribeProperties = {
			...baseProperty,
			properties: {
				[EApiRouteType.GET]: {
					[EApiDtoType.RESPONSE]: {
						guard: {
							guards: GuardA as Type<IAuthGuard>,
						},
					},
				},
			},
		};

		const result = DtoIsPropertyExposedForGuard(EApiRouteType.GET, guardedProperty, EApiDtoType.RESPONSE);

		expect(result).toBe(true);
	});

	it("matches guards and respects inverse settings", () => {
		const guardedProperty: TApiPropertyDescribeProperties = {
			...baseProperty,
			properties: {
				[EApiRouteType.GET]: {
					[EApiDtoType.RESPONSE]: {
						guard: {
							guards: GuardA as Type<IAuthGuard>,
						},
					},
				},
			},
		};

		expect(DtoIsPropertyExposedForGuard(EApiRouteType.GET, guardedProperty, EApiDtoType.RESPONSE, GuardA as Type<IAuthGuard>)).toBe(true);
		expect(DtoIsPropertyExposedForGuard(EApiRouteType.GET, guardedProperty, EApiDtoType.RESPONSE, GuardB as Type<IAuthGuard>)).toBe(false);

		const inverseProperty: TApiPropertyDescribeProperties = {
			...baseProperty,
			properties: {
				[EApiRouteType.GET]: {
					[EApiDtoType.RESPONSE]: {
						guard: {
							guards: GuardA as Type<IAuthGuard>,
							isInverse: true,
						},
					},
				},
			},
		};

		expect(DtoIsPropertyExposedForGuard(EApiRouteType.GET, inverseProperty, EApiDtoType.RESPONSE, GuardA as Type<IAuthGuard>)).toBe(false);
		expect(DtoIsPropertyExposedForGuard(EApiRouteType.GET, inverseProperty, EApiDtoType.RESPONSE, GuardB as Type<IAuthGuard>)).toBe(true);
	});

	it("supports guard arrays", () => {
		const guardedProperty: TApiPropertyDescribeProperties = {
			...baseProperty,
			properties: {
				[EApiRouteType.GET]: {
					[EApiDtoType.RESPONSE]: {
						guard: {
							guards: [GuardA as Type<IAuthGuard>, GuardB as Type<IAuthGuard>],
						},
					},
				},
			},
		};

		expect(DtoIsPropertyExposedForGuard(EApiRouteType.GET, guardedProperty, EApiDtoType.RESPONSE, GuardA as Type<IAuthGuard>)).toBe(true);
		expect(DtoIsPropertyExposedForGuard(EApiRouteType.GET, guardedProperty, EApiDtoType.RESPONSE, GuardB as Type<IAuthGuard>)).toBe(true);
	});
});
