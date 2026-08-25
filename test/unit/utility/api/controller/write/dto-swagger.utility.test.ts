import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerProperties } from "@interface/decorator/api";
import type { IApiEntity } from "@interface/entity";

import { MetadataStorage } from "@class/metadata-storage.class";
import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiDtoType, EApiPropertyDescribeType, EApiRouteType } from "@enum/decorator/api";
import { DECORATORS } from "@nestjs/swagger/dist/constants";
import { ApiControllerWriteDtoSwagger } from "@utility/api/controller/write/dto-swagger.utility";
import { describe, expect, it } from "vitest";

class SwaggerDto {}

abstract class InheritedSwaggerBaseEntity {
	@ApiPropertyDescribe({
		description: "owner",
		isAutoDtoEnabled: false,
		properties: {
			[EApiRouteType.CREATE]: {
				[EApiDtoType.BODY]: {
					isEnabled: true,
				},
			},
		},
		type: EApiPropertyDescribeType.RELATION,
	})
	public owner!: { id: string };
}

class InheritedSwaggerEntity extends InheritedSwaggerBaseEntity {}

describe("ApiControllerWriteDtoSwagger", () => {
	it("registers relation DTOs in swagger extra models", () => {
		const entityMetadata: IApiEntity<{ name?: string }> = {
			columns: [{ isPrimary: true, name: "id" as never, type: "uuid" }],
			name: "SwaggerEntity",
			primaryKey: { isPrimary: true, name: "id" as never, type: "uuid" },
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
				parameters: SwaggerDto,
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

		expect(modelNames).toEqual(expect.arrayContaining([SwaggerDto.name, "SwaggerEntityGetBodyownerDTO"]));
	});

	it("does not register an orphan relation component for a globally hidden inherited property", () => {
		const entityMetadata: IApiEntity<{ owner?: { id: string } }> = {
			columns: [{ isPrimary: true, name: "id" as never, type: "uuid" }],
			name: InheritedSwaggerEntity.name,
			primaryKey: { isPrimary: true, name: "id" as never, type: "uuid" },
			tableName: "inherited_swagger_entities",
		};
		const properties: IApiControllerProperties<{ owner?: { id: string } }> = {
			entity: InheritedSwaggerEntity as unknown as IApiBaseEntity,
			routes: {},
		};
		const routeConfig = {
			dto: {
				body: SwaggerDto,
				query: SwaggerDto,
				parameters: SwaggerDto,
				response: SwaggerDto,
			},
		};
		const target = {};

		ApiControllerWriteDtoSwagger(target, entityMetadata, properties, EApiRouteType.CREATE, routeConfig as never, entityMetadata);

		const modelNames = (Reflect.getMetadata(DECORATORS.API_EXTRA_MODELS, target) as Array<{ name?: string }>).map((model) => model?.name);

		expect(modelNames).toContain(SwaggerDto.name);
		expect(modelNames).not.toContain("InheritedSwaggerEntityCreateBodyownerDTO");
	});
});
