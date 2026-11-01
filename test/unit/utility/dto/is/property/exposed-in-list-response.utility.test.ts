import type { CanActivate } from "@nestjs/common";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { EApiDtoType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { DtoIsPropertyExposedInListResponse } from "@utility/dto/is/property/exposed-in-list-response.utility";
import { describe, expect, it } from "vitest";

class AdminGuard implements CanActivate {
	public canActivate(): boolean {
		return true;
	}
}

class UserGuard implements CanActivate {
	public canActivate(): boolean {
		return true;
	}
}

const createMetadata = (response?: Record<string, unknown>, extra: Record<string, unknown> = {}): TApiPropertyDescribeProperties =>
	({
		description: "name",
		exampleValue: "Name",
		format: EApiPropertyStringType.STRING,
		maxLength: 10,
		minLength: 1,
		pattern: "/^.+$/",
		...(response ? { properties: { [EApiRouteType.GET_LIST]: { [EApiDtoType.RESPONSE]: response } } } : {}),
		type: EApiPropertyDescribeType.STRING,
		...extra,
	}) as unknown as TApiPropertyDescribeProperties;

describe("DtoIsPropertyExposedInListResponse", () => {
	it("exposes a described property by default", () => {
		expect(DtoIsPropertyExposedInListResponse("name", createMetadata(), false)).toBe(true);
	});

	it.each([
		{ case: "disabled", metadata: createMetadata({ isEnabled: false }) },
		{ case: "not exposed", metadata: createMetadata({ isExpose: false, isResponse: true }) },
		{ case: "not a response value", metadata: createMetadata({ isResponse: false }) },
		{ case: "kept out of generated DTOs", metadata: createMetadata(undefined, { isAutoDtoEnabled: false }) },
	])("hides a property that is $case", ({ metadata }: { metadata: TApiPropertyDescribeProperties }) => {
		expect(DtoIsPropertyExposedInListResponse("name", metadata, false)).toBe(false);
	});

	it("follows guard-scoped response visibility for the route guard", () => {
		const metadata: TApiPropertyDescribeProperties = createMetadata({ guard: { guards: [AdminGuard] } });

		expect(DtoIsPropertyExposedInListResponse("name", metadata, false, AdminGuard)).toBe(true);
		expect(DtoIsPropertyExposedInListResponse("name", metadata, false, UserGuard)).toBe(false);
	});
});
