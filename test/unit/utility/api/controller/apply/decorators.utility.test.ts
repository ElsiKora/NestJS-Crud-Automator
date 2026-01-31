import type { IApiControllerProperties } from "@interface/decorator/api";
import type { IApiEntity } from "@interface/entity";

import { EApiRouteType } from "@enum/decorator/api";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { RequestMethod } from "@nestjs/common";
import { ApiControllerApplyDecorators } from "@utility/api/controller/apply/decorators.utility";
import { describe, expect, it } from "vitest";

class DecoratorEntity {
	public id?: string;
}

describe("ApiControllerApplyDecorators", () => {
	it("applies route metadata for GET handlers", () => {
		const entityMetadata: IApiEntity<DecoratorEntity> = {
			columns: [],
			name: "DecoratorEntity",
			primaryKey: { name: "id" } as never,
			tableName: "decorator_entities",
		};
		const properties: IApiControllerProperties<DecoratorEntity> = {
			entity: DecoratorEntity,
			routes: {},
		};
		const routeConfig = {
			dto: {
				response: DecoratorEntity,
			},
		};
		const targetMethod = () => undefined;

		ApiControllerApplyDecorators(targetMethod as never, entityMetadata, properties, EApiRouteType.GET, "get", routeConfig as never, []);

		expect(Reflect.getMetadata(PATH_METADATA, targetMethod)).toBe(":id");
		expect(Reflect.getMetadata(METHOD_METADATA, targetMethod)).toBe(RequestMethod.GET);
	});
});
