import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType } from "@enum/decorator/api";
import { ApiControllerGetListQueryOpenApiValueSchema } from "@utility/api/controller/get-list/query/open-api/value-schema.utility";
import { describe, expect, it } from "vitest";

describe("ApiControllerGetListQueryOpenApiValueSchema", () => {
	it("preserves the entity date format", () => {
		const schema = ApiControllerGetListQueryOpenApiValueSchema({
			format: EApiPropertyDateType.DATE,
			identifier: EApiPropertyDateIdentifier.CREATED_AT,
			type: EApiPropertyDescribeType.DATE,
		});

		expect(schema).toMatchObject({ format: EApiPropertyDateType.DATE, type: "string" });
	});

	it("documents heterogeneous enum values without a false scalar type", () => {
		const schema = ApiControllerGetListQueryOpenApiValueSchema({
			description: "mixed enum",
			enum: {
				0: "DISABLED",
				DISABLED: 0,
				ENABLED: "enabled",
			},
			enumName: "MixedState",
			type: EApiPropertyDescribeType.ENUM,
		} as TApiPropertyDescribeProperties);

		expect(schema.enum).toEqual([0, "enabled"]);
		expect(schema.type).toBeUndefined();
	});

	it("publishes the number bounds the route validates", () => {
		const schema = ApiControllerGetListQueryOpenApiValueSchema({
			description: "rank",
			exampleValue: 1,
			format: EApiPropertyNumberType.INTEGER,
			maximum: 1000,
			minimum: 0,
			multipleOf: 1,
			type: EApiPropertyDescribeType.NUMBER,
		} as TApiPropertyDescribeProperties);

		expect(schema).toEqual({ maximum: 1000, minimum: 0, multipleOf: 1, type: "integer" });
	});

	it("publishes the string length, format and pattern the route validates", () => {
		const schema = ApiControllerGetListQueryOpenApiValueSchema({
			description: "label",
			exampleValue: "Label",
			format: EApiPropertyStringType.STRING,
			maxLength: 64,
			minLength: 1,
			pattern: "/^[A-Za-z0-9 ]+$/",
			type: EApiPropertyDescribeType.STRING,
		} as TApiPropertyDescribeProperties);

		expect(schema).toEqual({ format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "^[A-Za-z0-9 ]+$", type: "string" });
	});
});
