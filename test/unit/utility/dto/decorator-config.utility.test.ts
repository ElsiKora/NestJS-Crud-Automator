import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { EApiDtoType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { DtoGetDecoratorConfig } from "@utility/dto/get/decorator-config.utility";
import { describe, expect, it } from "vitest";

describe("DtoGetDecoratorConfig", () => {
	it("merges custom DTO config overrides", () => {
		const metadata = {
			description: "name",
			exampleValue: "Name",
			format: EApiPropertyStringType.STRING,
			maxLength: 10,
			minLength: 1,
			pattern: "/^.+$/",
			properties: {
				[EApiRouteType.CREATE]: {
					[EApiDtoType.BODY]: { isRequired: false },
				},
			},
			type: EApiPropertyDescribeType.STRING,
		} as TApiPropertyDescribeProperties;

		const config = DtoGetDecoratorConfig(EApiRouteType.CREATE, metadata, EApiDtoType.BODY, "name");

		expect(config.isRequired).toBe(false);
	});

	it("throws for unknown dto types", () => {
		const metadata = {
			description: "name",
			exampleValue: "Name",
			format: EApiPropertyStringType.STRING,
			maxLength: 10,
			minLength: 1,
			pattern: "/^.+$/",
			type: EApiPropertyDescribeType.STRING,
		} as TApiPropertyDescribeProperties;

		const invoke = () => DtoGetDecoratorConfig(EApiRouteType.CREATE, metadata, "invalid" as EApiDtoType, "name");

		expect(invoke).toThrow("Unknown DTO type");
	});
});
