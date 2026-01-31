import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { EApiDtoType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { DtoIsPropertyShouldBeMarked } from "@utility/dto/is/property/should-be-marked.utility";
import { describe, expect, it } from "vitest";

const stringMetadata = {
	description: "name",
	exampleValue: "Name",
	format: EApiPropertyStringType.STRING,
	maxLength: 10,
	minLength: 1,
	pattern: "/^.+$/",
	type: EApiPropertyDescribeType.STRING,
} as TApiPropertyDescribeProperties;

describe("DtoIsPropertyShouldBeMarked", () => {
	it("skips date fields on create body", () => {
		const result = DtoIsPropertyShouldBeMarked(EApiRouteType.CREATE, EApiDtoType.BODY, "createdAt", stringMetadata, false);

		expect(result).toBe(false);
	});

	it("skips disabled properties", () => {
		const metadata = {
			...stringMetadata,
			properties: {
				[EApiRouteType.GET]: {
					[EApiDtoType.RESPONSE]: { isEnabled: false },
				},
			},
		} as TApiPropertyDescribeProperties;

		const result = DtoIsPropertyShouldBeMarked(EApiRouteType.GET, EApiDtoType.RESPONSE, "name", metadata, false);

		expect(result).toBe(false);
	});

	it("skips object properties in query DTOs", () => {
		const metadata = {
			description: "payload",
			type: EApiPropertyDescribeType.OBJECT,
		} as TApiPropertyDescribeProperties;

		const result = DtoIsPropertyShouldBeMarked(EApiRouteType.GET_LIST, EApiDtoType.QUERY, "payload", metadata, false);

		expect(result).toBe(false);
	});

	it("marks primary keys for request DTOs", () => {
		const result = DtoIsPropertyShouldBeMarked(EApiRouteType.GET, EApiDtoType.REQUEST, "id", stringMetadata, true);

		expect(result).toBe(true);
	});

	it("marks non-primary fields for body DTOs", () => {
		const result = DtoIsPropertyShouldBeMarked(EApiRouteType.CREATE, EApiDtoType.BODY, "name", stringMetadata, false);

		expect(result).toBe(true);
	});

	it("marks response DTOs by default", () => {
		const result = DtoIsPropertyShouldBeMarked(EApiRouteType.GET, EApiDtoType.RESPONSE, "name", stringMetadata, false);

		expect(result).toBe(true);
	});
});
