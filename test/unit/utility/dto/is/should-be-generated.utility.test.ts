import { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import { DtoIsShouldBeGenerated } from "@utility/dto/is/should-be-generated.utility";
import { describe, expect, it } from "vitest";

describe("DtoIsShouldBeGenerated", () => {
	it("handles body DTO generation rules", () => {
		expect(DtoIsShouldBeGenerated(EApiRouteType.CREATE, EApiDtoType.BODY)).toBe(true);
		expect(DtoIsShouldBeGenerated(EApiRouteType.UPDATE, EApiDtoType.BODY)).toBe(true);
		expect(DtoIsShouldBeGenerated(EApiRouteType.GET, EApiDtoType.BODY)).toBe(false);
	});

	it("handles query and request DTO generation rules", () => {
		expect(DtoIsShouldBeGenerated(EApiRouteType.GET_LIST, EApiDtoType.QUERY)).toBe(true);
		expect(DtoIsShouldBeGenerated(EApiRouteType.GET, EApiDtoType.QUERY)).toBe(false);
		expect(DtoIsShouldBeGenerated(EApiRouteType.GET, EApiDtoType.REQUEST)).toBe(true);
	});

	it("handles response DTO generation rules", () => {
		expect(DtoIsShouldBeGenerated(EApiRouteType.GET, EApiDtoType.RESPONSE)).toBe(true);
		expect(DtoIsShouldBeGenerated(EApiRouteType.DELETE, EApiDtoType.RESPONSE)).toBe(false);
	});
});
