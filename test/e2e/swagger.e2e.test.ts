import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";

import { Body, Controller, HttpStatus, Module, Param, Post, Query, RequestMethod } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { ApiBody, ApiProperty, DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { Column, Entity, PrimaryColumn } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiMethod, ApiPropertyDescribe, ApiRouteCustom, ApiServiceBase, EApiDtoType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

type TSwaggerOperation = NonNullable<NonNullable<OpenAPIObject["paths"][string]>["post"]>;

class SwaggerEntity {
	public id?: string;
}

@Entity("swagger_auto_dto_entities")
class SwaggerAutoDtoEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "id",
		exampleValue: "auto-id",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "name",
		exampleValue: "Auto",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public name!: string;
}

class SwaggerRegistrationPayloadDto {
	@ApiProperty()
	public provider!: string;

	@ApiProperty()
	public channel!: string;

	@ApiProperty()
	public identifier!: string;

	@ApiProperty()
	public password!: string;
}

class SwaggerRequestBodyDto {
	@ApiProperty({ type: SwaggerRegistrationPayloadDto })
	public payload!: SwaggerRegistrationPayloadDto;
}

class SwaggerParametersDto {
	@ApiProperty()
	public id!: string;
}

class SwaggerQueryDto {
	@ApiProperty()
	public filter!: string;
}

class SwaggerGeneratedService extends ApiServiceBase<SwaggerAutoDtoEntity> {}

class SwaggerGeneratedControllerBase {
	public service: SwaggerGeneratedService = new SwaggerGeneratedService();
}

const SwaggerGeneratedController = ApiController<SwaggerAutoDtoEntity>({
	entity: SwaggerAutoDtoEntity,
	path: "swagger-generated",
	routes: {
		[EApiRouteType.CREATE]: {},
		[EApiRouteType.GET_LIST]: {
			documentation: {
				description: "Custom generated list description",
				summary: "Custom generated list summary",
			},
		},
	},
})(SwaggerGeneratedControllerBase);

@Controller("swagger")
class SwaggerDocumentationController {
	@Post("plain")
	public plain(@Body() body: SwaggerRequestBodyDto): SwaggerRequestBodyDto {
		return body;
	}

	@ApiMethod<SwaggerEntity>({
		metadata: {
			resource: {
				action: "swagger.method",
				entity: SwaggerEntity,
			},
			response: {
				status: HttpStatus.OK,
				type: undefined,
			},
			route: {
				method: RequestMethod.POST,
				path: "method",
				type: EApiRouteType.CREATE,
			},
		},
	})
	public method(@Body() body: SwaggerRequestBodyDto): SwaggerRequestBodyDto {
		return body;
	}

	@ApiRouteCustom<SwaggerEntity>({
		dto: {
			[EApiDtoType.BODY]: SwaggerRequestBodyDto,
			[EApiDtoType.PARAMETERS]: SwaggerParametersDto,
			[EApiDtoType.QUERY]: SwaggerQueryDto,
		},
		resource: {
			action: "swagger.custom",
			entity: SwaggerEntity,
		},
		response: {
			status: HttpStatus.OK,
			type: undefined,
		},
		route: {
			method: RequestMethod.POST,
			path: "custom/:id",
		},
	})
	public custom(@Param() parameters: SwaggerParametersDto, @Query() query: SwaggerQueryDto, @Body() body: SwaggerRequestBodyDto): Record<string, unknown> {
		return {
			body,
			parameters,
			query,
		};
	}

	@ApiRouteCustom<SwaggerAutoDtoEntity>({
		autoDto: {
			[EApiDtoType.BODY]: {},
		},
		resource: {
			action: "swagger.autoDto",
			entity: SwaggerAutoDtoEntity,
		},
		response: {
			status: HttpStatus.OK,
			type: undefined,
		},
		route: {
			method: RequestMethod.POST,
			path: "auto-dto",
			type: EApiRouteType.CREATE,
		},
	})
	public autoDto(@Body() body: Record<string, unknown>): Record<string, unknown> {
		return body;
	}

	@ApiBody({ description: "Manual request body", type: SwaggerRequestBodyDto })
	@ApiRouteCustom<SwaggerEntity>({
		dto: {
			[EApiDtoType.BODY]: SwaggerRequestBodyDto,
		},
		resource: {
			action: "swagger.manualBody",
			entity: SwaggerEntity,
		},
		response: {
			status: HttpStatus.OK,
			type: undefined,
		},
		route: {
			method: RequestMethod.POST,
			path: "manual-body",
		},
	})
	public manualBody(@Body() body: SwaggerRequestBodyDto): SwaggerRequestBodyDto {
		return body;
	}
}

@Module({
	controllers: [SwaggerDocumentationController, SwaggerGeneratedController],
	imports: [ApiAuthorizationModule],
})
class SwaggerDocumentationModule {}

describe("Swagger request DTO documentation (E2E)", () => {
	let app: INestApplication | undefined;
	let document: OpenAPIObject;

	beforeAll(async () => {
		const moduleReference = await Test.createTestingModule({
			imports: [SwaggerDocumentationModule],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();

		document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
	});

	afterAll(async () => {
		await app?.close();
	});

	it("documents request bodies for plain, ApiMethod, and ApiRouteCustom routes", () => {
		expect(getOperation("/swagger/plain").requestBody).toBeDefined();
		expect(getOperation("/swagger/method").requestBody).toBeDefined();

		const customRequestBody: unknown = getOperation("/swagger/custom/{id}").requestBody;

		expect(customRequestBody).toBeDefined();
		expect(JSON.stringify(customRequestBody)).toContain("#/components/schemas/SwaggerRequestBodyDto");
		expect(document.components?.schemas?.SwaggerRequestBodyDto).toBeDefined();
		expect(document.components?.schemas?.SwaggerRegistrationPayloadDto).toBeDefined();
	});

	it("documents configured query and parameter DTOs for ApiRouteCustom", () => {
		const parameters = getOperation("/swagger/custom/{id}").parameters ?? [];

		expect(parameters).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ in: "path", name: "id" }),
				expect.objectContaining({ in: "query", name: "filter" }),
			]),
		);
	});

	it("documents generated autoDto request bodies for ApiRouteCustom", () => {
		const autoDtoRequestBody: unknown = getOperation("/swagger/auto-dto").requestBody;

		expect(autoDtoRequestBody).toBeDefined();
		expect(JSON.stringify(autoDtoRequestBody)).toContain("#/components/schemas/SwaggerAutoDtoEntityCreateBodyDTO");
		expect(document.components?.schemas?.SwaggerAutoDtoEntityCreateBodyDTO).toBeDefined();
	});

	it("coexists with manual Swagger body decorators on ApiRouteCustom", () => {
		const manualRequestBody = getOperation("/swagger/manual-body").requestBody;

		expect(manualRequestBody).toEqual(
			expect.objectContaining({
				description: "Manual request body",
			}),
		);
		expect(JSON.stringify(manualRequestBody)).toContain("#/components/schemas/SwaggerRequestBodyDto");
	});

	it("generates pluralized documentation for generated CRUD routes", () => {
		const createOperation = getOperation("/swagger-generated");

		expect(createOperation.summary).toBe("Creating `SwaggerAutoDtoEntities`");
		expect(createOperation.description).toBe("This method is used for creating `SwaggerAutoDtoEntities`");
	});

	it("allows generated route documentation overrides", () => {
		const listOperation = getOperation("/swagger-generated", "get");

		expect(listOperation.summary).toBe("Custom generated list summary");
		expect(listOperation.description).toBe("Custom generated list description");
	});

	function getOperation(path: string, method: "get" | "post" = "post"): TSwaggerOperation {
		const operation: TSwaggerOperation | undefined = document.paths[path]?.[method] as TSwaggerOperation | undefined;

		expect(operation).toBeDefined();

		return operation as TSwaggerOperation;
	}
});
