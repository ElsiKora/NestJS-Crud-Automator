import type { IApiEntity } from "@interface/entity";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { EApiDtoType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { DtoGenerateDynamic } from "@utility/dto/generate/dynamic.utility";
import { describe, expect, it } from "vitest";

const entity: IApiEntity<{ name?: string }> = {
	columns: [],
	name: "TestEntity",
	primaryKey: undefined,
	tableName: "test_entities",
};

describe("DtoGenerateDynamic", () => {
	it("returns undefined for non-object metadata", () => {
		const metadata = { type: EApiPropertyDescribeType.STRING } as TApiPropertyDescribeProperties;
		const result = DtoGenerateDynamic(EApiRouteType.CREATE, metadata, entity, EApiDtoType.BODY, "payload");

		expect(result).toBeUndefined();
	});

	it("generates DTOs for dynamic object metadata", () => {
		const metadata = {
			dataType: {
				Foo: {
					title: {
						description: "title",
						exampleValue: "Title",
						format: EApiPropertyStringType.STRING,
						maxLength: 10,
						minLength: 1,
						pattern: "/^.+$/",
						type: EApiPropertyDescribeType.STRING,
					},
				},
			},
			description: "payload",
			discriminator: {
				mapping: { foo: "Foo" },
				propertyName: "type",
				shouldKeepDiscriminatorProperty: true,
			},
			isDynamicallyGenerated: true,
			type: EApiPropertyDescribeType.OBJECT,
		} as TApiPropertyDescribeProperties;

		const result = DtoGenerateDynamic(EApiRouteType.CREATE, metadata, entity, EApiDtoType.BODY, "payload");

		expect(result).toBeDefined();
		expect(result?.Foo).toBeDefined();
		expect(result?.Foo?.name).toBe("TestEntityCreateBodyPayloadFooDTO");
	});
});
