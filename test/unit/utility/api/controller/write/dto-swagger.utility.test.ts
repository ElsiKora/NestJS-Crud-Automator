import type { IApiControllerProperties } from "@interface/decorator/api";
import type { IApiEntity } from "@interface/entity";

import { MetadataStorage } from "@class/metadata-storage.class";
import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { EApiPropertyDescribeType, EApiRouteType } from "@enum/decorator/api";
import { DECORATORS } from "@nestjs/swagger/dist/constants";
import { ApiControllerWriteDtoSwagger } from "@utility/api/controller/write/dto-swagger.utility";
import { describe, expect, it } from "vitest";

class SwaggerDto {}

describe("ApiControllerWriteDtoSwagger", () => {
	it("registers relation DTOs in swagger extra models", () => {
		const entityMetadata: IApiEntity<{ name?: string }> = {
			columns: [],
			name: "SwaggerEntity",
			primaryKey: undefined,
			tableName: "swagger_entities",
		};
		const properties: IApiControllerProperties<{ name?: string }> = {
			entity: { name: "SwaggerEntity" },
			routes: {},
		};
		const routeConfig = {
			dto: {
				body: SwaggerDto,
				query: SwaggerDto,
				request: SwaggerDto,
				response: SwaggerDto,
			},
		};

		MetadataStorage.getInstance().setMetadata(entityMetadata.name ?? "SwaggerEntity", "owner", PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY, {
			description: "owner",
			type: EApiPropertyDescribeType.RELATION,
		});

		const target = {};

		ApiControllerWriteDtoSwagger(target, entityMetadata, properties, EApiRouteType.GET, routeConfig as never, entityMetadata);

		const models = Reflect.getMetadata(DECORATORS.API_EXTRA_MODELS, target) as Array<{ name?: string }>;
		const modelNames = models.map((model) => model?.name);

		expect(modelNames).toContain(SwaggerDto.name);
		expect(modelNames).toContain("SwaggerEntityGetBodyownerDTO");
	});
});
