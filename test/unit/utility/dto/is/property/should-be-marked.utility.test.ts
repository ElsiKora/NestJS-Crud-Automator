import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { EApiDtoType, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
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

const infrastructureDateMetadata = {
	format: EApiPropertyDateType.DATE_TIME,
	identifier: EApiPropertyDateIdentifier.CREATED_AT,
	type: EApiPropertyDescribeType.DATE,
} as TApiPropertyDescribeProperties;

const businessDateMetadata = {
	format: EApiPropertyDateType.DATE_TIME,
	identifier: EApiPropertyDateIdentifier.DATE,
	type: EApiPropertyDescribeType.DATE,
} as TApiPropertyDescribeProperties;

describe("DtoIsPropertyShouldBeMarked", () => {
	it.each([EApiRouteType.CREATE, EApiRouteType.UPDATE, EApiRouteType.PARTIAL_UPDATE])("skips semantic infrastructure timestamps on %s bodies", (method: EApiRouteType) => {
		const result = DtoIsPropertyShouldBeMarked(method, EApiDtoType.BODY, "insertedOn", infrastructureDateMetadata, false);

		expect(result).toBe(false);
	});

	it.each([EApiRouteType.CREATE, EApiRouteType.UPDATE, EApiRouteType.PARTIAL_UPDATE])("keeps route-owned DATE properties on %s bodies", (method: EApiRouteType) => {
		const result = DtoIsPropertyShouldBeMarked(method, EApiDtoType.BODY, "createdAt", businessDateMetadata, false);

		expect(result).toBe(true);
	});

	it("does not infer timestamp ownership from a property name", () => {
		const result = DtoIsPropertyShouldBeMarked(EApiRouteType.CREATE, EApiDtoType.BODY, "createdAt", stringMetadata, false);

		expect(result).toBe(true);
	});

	it("keeps infrastructure timestamps in responses", () => {
		const result = DtoIsPropertyShouldBeMarked(EApiRouteType.CREATE, EApiDtoType.RESPONSE, "insertedOn", infrastructureDateMetadata, false);

		expect(result).toBe(true);
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

	it.each([
		["an omitted flag", undefined, true],
		["an explicit enable", true, true],
		["an explicit disable", false, false],
	] as const)("treats %s as the auto-DTO visibility source of truth", (_label, isAutoDtoEnabled, expected) => {
		const metadata = {
			...stringMetadata,
			...(isAutoDtoEnabled === undefined ? {} : { isAutoDtoEnabled }),
		} as TApiPropertyDescribeProperties;

		expect(DtoIsPropertyShouldBeMarked(EApiRouteType.GET, EApiDtoType.RESPONSE, "name", metadata, false)).toBe(expected);
	});

	it.each([
		[EApiRouteType.CREATE, EApiDtoType.BODY, false],
		[EApiRouteType.GET, EApiDtoType.PARAMETERS, true],
		[EApiRouteType.GET_LIST, EApiDtoType.QUERY, false],
		[EApiRouteType.GET, EApiDtoType.RESPONSE, false],
	] as const)("does not let %s %s generation reopen a globally hidden property", (method, dtoType, isPrimary) => {
		const metadata = {
			...stringMetadata,
			isAutoDtoEnabled: false,
			properties: {
				[method]: {
					[dtoType]: { isEnabled: true },
				},
			},
		} as TApiPropertyDescribeProperties;

		expect(DtoIsPropertyShouldBeMarked(method, dtoType, "internalReference", metadata, isPrimary)).toBe(false);
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
		const result = DtoIsPropertyShouldBeMarked(EApiRouteType.GET, EApiDtoType.PARAMETERS, "id", stringMetadata, true);

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
