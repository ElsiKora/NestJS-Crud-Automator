import type { IApiEntity } from "@interface/entity";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { EApiDtoType, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { DtoBuildDecorator } from "@utility/dto/build-decorator.utility";
import { GetRegisteredAutoDtoChildren } from "@utility/register-auto-dto-child.utility";
import { describe, expect, it } from "vitest";

const entity: IApiEntity<{ name?: string }> = {
	columns: [],
	name: "BuildDecoratorEntity",
	primaryKey: undefined,
	tableName: "build_decorator_entities",
};

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

describe("DtoBuildDecorator", () => {
	it("returns undefined when property is disabled", () => {
		const metadata = {
			description: "name",
			exampleValue: "Name",
			format: EApiPropertyStringType.STRING,
			maxLength: 10,
			minLength: 1,
			pattern: "/^.+$/",
			properties: {
				[EApiRouteType.CREATE]: {
					[EApiDtoType.BODY]: { isEnabled: false },
				},
			},
			type: EApiPropertyDescribeType.STRING,
		} as TApiPropertyDescribeProperties;

		const result = DtoBuildDecorator(EApiRouteType.CREATE, metadata, entity, EApiDtoType.BODY, "name");

		expect(result).toBeUndefined();
	});

	it.each([EApiRouteType.CREATE, EApiRouteType.UPDATE, EApiRouteType.PARTIAL_UPDATE])("skips semantic infrastructure timestamps on %s bodies", (method: EApiRouteType) => {
		const result = DtoBuildDecorator(method, infrastructureDateMetadata, entity, EApiDtoType.BODY, "insertedOn");

		expect(result).toBeUndefined();
	});

	it.each([EApiRouteType.CREATE, EApiRouteType.UPDATE, EApiRouteType.PARTIAL_UPDATE])("builds route-owned DATE decorators on %s bodies", (method: EApiRouteType) => {
		const result = DtoBuildDecorator(method, businessDateMetadata, entity, EApiDtoType.BODY, "createdAt");

		expect(result).toHaveLength(1);
	});

	it("builds infrastructure timestamp decorators for responses", () => {
		const result = DtoBuildDecorator(EApiRouteType.CREATE, infrastructureDateMetadata, entity, EApiDtoType.RESPONSE, "insertedOn");

		expect(result).toHaveLength(1);
	});

	it("expands date fields for get list queries", () => {
		const metadata = {
			format: EApiPropertyDateType.DATE_TIME,
			identifier: EApiPropertyDateIdentifier.CREATED_AT,
			type: EApiPropertyDescribeType.DATE,
		} as TApiPropertyDescribeProperties;

		const result = DtoBuildDecorator(EApiRouteType.GET_LIST, metadata, entity, EApiDtoType.QUERY, "createdAt");

		expect(result).toHaveLength(2);
	});

	it("skips registering plain Object data types as auto DTO children", () => {
		const metadata = {
			dataType: Object,
			description: "payload",
			type: EApiPropertyDescribeType.OBJECT,
		} as TApiPropertyDescribeProperties;

		const decorators = DtoBuildDecorator(EApiRouteType.CREATE, metadata, entity, EApiDtoType.BODY, "payload");

		expect(decorators).toBeDefined();

		const target = {};
		for (const decorator of decorators ?? []) {
			decorator(target, "payload");
		}

		const children = GetRegisteredAutoDtoChildren(target);
		expect(children?.has(Object)).toBeUndefined();
	});
});
