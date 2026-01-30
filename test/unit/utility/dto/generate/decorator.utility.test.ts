import type { IApiEntity } from "@interface/entity";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { EApiDtoType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { DECORATORS } from "@nestjs/swagger/dist/constants";
import { DtoGenerateDecorator } from "@utility/dto/generate/decorator.utility";
import { describe, expect, it } from "vitest";

const entity: IApiEntity<{ name?: string }> = {
	columns: [],
	name: "DecoratorEntity",
	primaryKey: undefined,
	tableName: "decorator_entities",
};

describe("DtoGenerateDecorator", () => {
	it("creates a decorator for known property types", () => {
		const metadata = {
			description: "name",
			exampleValue: "Name",
			format: EApiPropertyStringType.STRING,
			maxLength: 10,
			minLength: 1,
			pattern: "/^.+$/",
			type: EApiPropertyDescribeType.STRING,
		} as TApiPropertyDescribeProperties;
		const decorator = DtoGenerateDecorator(metadata, entity, { isRequired: true }, EApiRouteType.CREATE, EApiDtoType.BODY, "name");

		const target = {};
		decorator(target, "name");

		const swagger = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, target, "name");
		expect(swagger).toBeDefined();
	});

	it("throws for unknown property types", () => {
		const metadata = {
			type: "unknown",
		};

		const invoke = () => DtoGenerateDecorator(metadata as never, entity, { isRequired: true }, EApiRouteType.CREATE, EApiDtoType.BODY, "name");

		expect(invoke).toThrow("Unknown property type");
	});
});
