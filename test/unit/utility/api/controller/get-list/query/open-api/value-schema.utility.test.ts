import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType } from "@enum/decorator/api";
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
});
