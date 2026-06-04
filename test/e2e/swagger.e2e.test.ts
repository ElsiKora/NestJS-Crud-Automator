import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";

import { Body, Controller, HttpStatus, Module, Param, Post, Query, RequestMethod } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { ApiBody, ApiProperty, DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { Column, Entity, PrimaryColumn } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiMethod, ApiPropertyDescribe, ApiPropertyObject, ApiRouteCustom, ApiServiceBase, EApiDtoType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

type TSwaggerMethod = "delete" | "get" | "patch" | "post" | "put";
type TSwaggerOperation = NonNullable<NonNullable<OpenAPIObject["paths"][string]>[TSwaggerMethod]>;

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

class SwaggerEmailRegistrationBodyDto {
	@ApiProperty()
	public channel!: string;

	@ApiProperty()
	public email!: string;
}

class SwaggerUsernameRegistrationBodyDto {
	@ApiProperty()
	public channel!: string;

	@ApiProperty()
	public username!: string;
}

class SwaggerVerificationResponseDto {
	@ApiProperty()
	public mode!: string;

	@ApiProperty()
	public verificationToken!: string;
}

class SwaggerSessionResponseDto {
	@ApiProperty()
	public mode!: string;

	@ApiProperty()
	public sessionToken!: string;
}

class SwaggerNestedEmailPayloadDto {
	@ApiProperty()
	public channel!: string;

	@ApiProperty()
	public email!: string;
}

class SwaggerNestedPhonePayloadDto {
	@ApiProperty()
	public channel!: string;

	@ApiProperty()
	public phone!: string;
}

class SwaggerNestedDiscriminatorBodyDto {
	@ApiPropertyObject({
		discriminator: {
			mapping: {
				email: SwaggerNestedEmailPayloadDto,
				phone: SwaggerNestedPhonePayloadDto,
			},
			propertyName: "channel",
			shouldKeepDiscriminatorProperty: true,
		},
		entity: SwaggerEntity,
		isRequired: true,
		shouldValidateNested: true,
		type: [SwaggerNestedEmailPayloadDto, SwaggerNestedPhonePayloadDto],
	})
	public payload!: SwaggerNestedEmailPayloadDto | SwaggerNestedPhonePayloadDto;
}

class SwaggerGeneratedService extends ApiServiceBase<SwaggerAutoDtoEntity> {}

class SwaggerGeneratedDefaultControllerBase {
	public service: SwaggerGeneratedService = new SwaggerGeneratedService();
}

class SwaggerGeneratedOverrideControllerBase {
	public service: SwaggerGeneratedService = new SwaggerGeneratedService();
}

const SwaggerGeneratedDefaultController = ApiController<SwaggerAutoDtoEntity>({
	entity: SwaggerAutoDtoEntity,
	name: "SwaggerAutoDtoResource",
	path: "swagger-generated-default",
	routes: {
		[EApiRouteType.CREATE]: {},
		[EApiRouteType.DELETE]: {},
		[EApiRouteType.GET]: {},
		[EApiRouteType.GET_LIST]: {},
		[EApiRouteType.PARTIAL_UPDATE]: {},
		[EApiRouteType.UPDATE]: {},
	},
})(SwaggerGeneratedDefaultControllerBase);

const SwaggerGeneratedOverrideController = ApiController<SwaggerAutoDtoEntity>({
	entity: SwaggerAutoDtoEntity,
	name: "SwaggerAutoDtoResource",
	path: "swagger-generated-override",
	routes: {
		[EApiRouteType.GET]: {
			documentation: {
				description: "Custom generated get description",
			},
		},
		[EApiRouteType.GET_LIST]: {
			documentation: {
				description: "Custom generated list description",
				operationId: "customGeneratedList",
				summary: "Custom generated list summary",
			},
		},
	},
})(SwaggerGeneratedOverrideControllerBase);

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

	@ApiRouteCustom<SwaggerEntity>({
		dto: {
			body: {
				discriminator: {
					mapping: {
						email: SwaggerEmailRegistrationBodyDto,
						username: SwaggerUsernameRegistrationBodyDto,
					},
					propertyName: "channel",
					shouldKeepDiscriminatorProperty: true,
				},
				type: [SwaggerEmailRegistrationBodyDto, SwaggerUsernameRegistrationBodyDto],
			},
		},
		resource: {
			action: "swagger.discriminated",
			entity: SwaggerEntity,
		},
		response: {
			discriminator: {
				mapping: {
					session: SwaggerSessionResponseDto,
					verification: SwaggerVerificationResponseDto,
				},
				propertyName: "mode",
				shouldKeepDiscriminatorProperty: true,
			},
			status: HttpStatus.CREATED,
			type: [SwaggerVerificationResponseDto, SwaggerSessionResponseDto],
		},
		route: {
			method: RequestMethod.POST,
			path: "discriminated",
		},
	})
	public discriminated(@Body() body: SwaggerEmailRegistrationBodyDto | SwaggerUsernameRegistrationBodyDto): SwaggerSessionResponseDto | SwaggerVerificationResponseDto {
		return "email" in body
			? {
					mode: "verification",
					verificationToken: body.email,
				}
			: {
					mode: "session",
					sessionToken: body.username,
				};
	}

	@ApiRouteCustom<SwaggerEntity>({
		dto: {
			[EApiDtoType.BODY]: SwaggerNestedDiscriminatorBodyDto,
		},
		resource: {
			action: "swagger.nestedDiscriminated",
			entity: SwaggerEntity,
		},
		response: {
			status: HttpStatus.OK,
			type: undefined,
		},
		route: {
			method: RequestMethod.POST,
			path: "nested-discriminated",
		},
	})
	public nestedDiscriminated(@Body() body: SwaggerNestedDiscriminatorBodyDto): SwaggerNestedDiscriminatorBodyDto {
		return body;
	}
}

@Module({
	controllers: [SwaggerDocumentationController, SwaggerGeneratedDefaultController, SwaggerGeneratedOverrideController],
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

	it("documents discriminated custom route request bodies and responses", () => {
		const operation = getOperation("/swagger/discriminated");
		const requestBody = operation.requestBody;
		const response = operation.responses?.["201"];

		expect(JSON.stringify(requestBody)).toContain("oneOf");
		expect(JSON.stringify(requestBody)).toContain("channel");
		expect(JSON.stringify(requestBody)).toContain("#/components/schemas/SwaggerEmailRegistrationBodyDto");
		expect(JSON.stringify(requestBody)).toContain("#/components/schemas/SwaggerUsernameRegistrationBodyDto");
		expect(JSON.stringify(response)).toContain("oneOf");
		expect(JSON.stringify(response)).toContain("mode");
		expect(JSON.stringify(response)).toContain("#/components/schemas/SwaggerVerificationResponseDto");
		expect(JSON.stringify(response)).toContain("#/components/schemas/SwaggerSessionResponseDto");
		expect(document.components?.schemas?.SwaggerEmailRegistrationBodyDto).toBeDefined();
		expect(document.components?.schemas?.SwaggerUsernameRegistrationBodyDto).toBeDefined();
		expect(document.components?.schemas?.SwaggerVerificationResponseDto).toBeDefined();
		expect(document.components?.schemas?.SwaggerSessionResponseDto).toBeDefined();
	});

	it("registers nested ApiPropertyObject discriminator variants for custom route body DTOs", () => {
		const operation = getOperation("/swagger/nested-discriminated");
		const requestBody = operation.requestBody;
		const parentSchema = document.components?.schemas?.SwaggerNestedDiscriminatorBodyDto as { properties?: { payload?: { discriminator?: unknown; oneOf?: Array<unknown> } } } | undefined;

		expect(JSON.stringify(requestBody)).toContain("#/components/schemas/SwaggerNestedDiscriminatorBodyDto");
		expect(document.components?.schemas?.SwaggerNestedDiscriminatorBodyDto).toBeDefined();
		expect(document.components?.schemas?.SwaggerNestedEmailPayloadDto).toBeDefined();
		expect(document.components?.schemas?.SwaggerNestedPhonePayloadDto).toBeDefined();
		expect(parentSchema?.properties?.payload?.oneOf).toEqual([
			{ $ref: "#/components/schemas/SwaggerNestedEmailPayloadDto" },
			{ $ref: "#/components/schemas/SwaggerNestedPhonePayloadDto" },
		]);
		expect(parentSchema?.properties?.payload?.discriminator).toEqual({
			mapping: {
				email: "#/components/schemas/SwaggerNestedEmailPayloadDto",
				phone: "#/components/schemas/SwaggerNestedPhonePayloadDto",
			},
			propertyName: "channel",
		});
	});

	it("generates pluralized documentation for generated CRUD routes", () => {
		expectGeneratedDocumentation(getOperation("/swagger-generated-default"), "Create `SwaggerAutoDtoResource`", "Creates a new `SwaggerAutoDtoResource` resource.");
		expectGeneratedDocumentation(getOperation("/swagger-generated-default/{id}", "delete"), "Delete `SwaggerAutoDtoResource`", "Deletes an existing `SwaggerAutoDtoResource` resource.");
		expectGeneratedDocumentation(getOperation("/swagger-generated-default/{id}", "get"), "Get `SwaggerAutoDtoResource`", "Returns a single `SwaggerAutoDtoResource` resource by its identifier.");
		expectGeneratedDocumentation(getOperation("/swagger-generated-default", "get"), "List `SwaggerAutoDtoResources`", "Returns a paginated list of `SwaggerAutoDtoResources` resources.");
		expectGeneratedDocumentation(getOperation("/swagger-generated-default/{id}", "patch"), "Partially update `SwaggerAutoDtoResource`", "Partially updates an existing `SwaggerAutoDtoResource` resource.");
		expectGeneratedDocumentation(getOperation("/swagger-generated-default/{id}", "put"), "Update `SwaggerAutoDtoResource`", "Replaces an existing `SwaggerAutoDtoResource` resource.");
	});

	it("allows generated route documentation overrides", () => {
		const listOperation = getOperation("/swagger-generated-override", "get");

		expect(listOperation.summary).toBe("Custom generated list summary");
		expect(listOperation.description).toBe("Custom generated list description");
		expect(listOperation.operationId).toBe("customGeneratedList");
	});

	it("merges partial generated route documentation overrides", () => {
		const operation = getOperation("/swagger-generated-override/{id}", "get");

		expect(operation.summary).toBe("Get `SwaggerAutoDtoResource`");
		expect(operation.description).toBe("Custom generated get description");
		expect(operation.operationId).toBe("SwaggerGeneratedOverrideControllerBase_get");
	});

	function getOperation(path: string, method: TSwaggerMethod = "post"): TSwaggerOperation {
		const operation: TSwaggerOperation | undefined = document.paths[path]?.[method] as TSwaggerOperation | undefined;

		expect(operation).toBeDefined();

		return operation as TSwaggerOperation;
	}

	function expectGeneratedDocumentation(operation: TSwaggerOperation, summary: string, description: string): void {
		expect(operation.summary).toBe(summary);
		expect(operation.description).toBe(description);
		expect(operation.operationId).toEqual(expect.any(String));
	}
});
