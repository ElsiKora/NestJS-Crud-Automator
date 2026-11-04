import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import type { Repository } from "typeorm";

import { Body, Controller, Get, HttpStatus, Inject, Injectable, Param, Query, RequestMethod, ValidationPipe } from "@nestjs/common";
import { ExpressAdapter } from "@nestjs/platform-express";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiMethod, ApiPropertyBoolean, ApiPropertyDescribe, ApiPropertyNumber, ApiPropertyObject, ApiPropertyString, ApiRouteCustom, ApiService, ApiServiceBase, ApiSubscriberModule, EApiDtoType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

interface IE2eScalarWireResponse {
	body: Record<string, unknown>;
	status: number;
}

class E2eScalarWireEntityReference {}

const COUNT = { description: "count", entity: E2eScalarWireEntityReference, exampleValue: 1, format: EApiPropertyNumberType.INTEGER, isRequired: false, maximum: 100, minimum: 0, multipleOf: 1 } as const;
const COUNTS = { ...COUNT, description: "counts", exampleValue: [1] as Array<number>, isArray: true, isUniqueItems: false, maxItems: 5, minItems: 1 } as const;
const RATIO = { description: "ratio", entity: E2eScalarWireEntityReference, exampleValue: 1.5, format: EApiPropertyNumberType.DOUBLE, isRequired: false, maximum: 100, minimum: 0 } as never;
const FLAG = { description: "flag", entity: E2eScalarWireEntityReference, isRequired: false } as const;
const FLAGS = { ...FLAG, description: "flags", isArray: true, isUniqueItems: false, maxItems: 5, minItems: 1 } as never;

class E2eScalarWireNestedDto {
	@ApiPropertyNumber(COUNT)
	public count?: number;

	@ApiPropertyBoolean(FLAG)
	public flag?: boolean;
}

class E2eScalarWireBodyDto {
	@ApiPropertyNumber(COUNT)
	public count?: number;

	@ApiPropertyNumber(COUNTS)
	public counts?: Array<number>;

	@ApiPropertyBoolean(FLAG)
	public flag?: boolean;

	@ApiPropertyBoolean(FLAGS)
	public flags?: Array<boolean>;

	@ApiPropertyObject({ description: "nested", entity: E2eScalarWireEntityReference, isRequired: false, shouldValidateNested: true, type: E2eScalarWireNestedDto })
	public nested?: E2eScalarWireNestedDto;

	@ApiPropertyObject({ description: "nestedList", entity: E2eScalarWireEntityReference, isArray: true, isRequired: false, isUniqueItems: false, maxItems: 5, minItems: 1, shouldValidateNested: true, type: E2eScalarWireNestedDto })
	public nestedList?: Array<E2eScalarWireNestedDto>;

	@ApiPropertyNumber(RATIO)
	public ratio?: number;

	// A bigint is described as text, whose OpenAPI type is string, so a body sends it as a JSON string.
	@ApiPropertyString({ description: "total", entity: E2eScalarWireEntityReference, exampleValue: "1", format: EApiPropertyStringType.BIGINT_STRING, isRequired: false, maxLength: 20, minLength: 1, pattern: "/^(?:0|-?[1-9]\\d*)$/" })
	public total?: string;
}

class E2eScalarWireQueryDto {
	@ApiPropertyNumber(COUNT)
	public count?: number;

	@ApiPropertyNumber(COUNTS)
	public counts?: Array<number>;

	@ApiPropertyBoolean(FLAG)
	public flag?: boolean;

	@ApiPropertyBoolean(FLAGS)
	public flags?: Array<boolean>;

	@ApiPropertyNumber(RATIO)
	public ratio?: number;
}

class E2eScalarWirePathDto {
	@ApiPropertyNumber(COUNT)
	public count?: number;

	@ApiPropertyBoolean(FLAG)
	public flag?: boolean;
}

class E2eScalarWireCustomQueryDto {
	@ApiPropertyNumber(COUNT)
	public count?: number;
}

class E2eScalarWireCustomBodyDto {
	@ApiPropertyNumber(COUNT)
	public count?: number;
}

class E2eScalarWirePlainQueryDto {
	@ApiPropertyNumber(COUNT)
	public count?: number;

	@ApiPropertyBoolean(FLAG)
	public flag?: boolean;
}

class E2eScalarWireResponseDto {}

@Entity("e2e_scalar_wire_items")
class E2eScalarWireItemEntity {
	@ApiPropertyDescribe({ description: "id", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 1_000_000, minimum: 1, multipleOf: 1, properties: { [EApiRouteType.CREATE]: { [EApiDtoType.BODY]: { isEnabled: false } } }, type: EApiPropertyDescribeType.NUMBER })
	@PrimaryGeneratedColumn("increment")
	public id!: number;

	@ApiPropertyDescribe({ description: "isActive", type: EApiPropertyDescribeType.BOOLEAN })
	@Column({ type: "boolean" })
	public isActive!: boolean;

	@ApiPropertyDescribe({ description: "rank", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 100, minimum: 0, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER })
	@Column({ type: "integer" })
	public rank!: number;
}

@Injectable()
@ApiService({ entity: E2eScalarWireItemEntity })
class E2eScalarWireItemService extends ApiServiceBase<E2eScalarWireItemEntity> {
	@InjectRepository(E2eScalarWireItemEntity)
	public readonly repository!: Repository<E2eScalarWireItemEntity>;
}

@ApiController<E2eScalarWireItemEntity>({
	entity: E2eScalarWireItemEntity,
	name: "E2eScalarWireItems",
	path: "scalar-wire-items",
	routes: { [EApiRouteType.DELETE]: { generation: { isEnabled: false } } },
})
class E2eScalarWireItemController {
	public constructor(@Inject(E2eScalarWireItemService) public readonly service: E2eScalarWireItemService) {}
}

/**
 * Builds the `ApiMethod` options of one manual route; it has no route runtime, so the handler answers what the pipe gave it.
 * @param {RequestMethod} method - HTTP method.
 * @param {string} path - Route path.
 * @returns {Parameters<typeof ApiMethod>[0]} The options.
 */
function manualRoute(method: RequestMethod, path: string): Parameters<typeof ApiMethod<E2eScalarWireItemEntity>>[0] {
	return {
		metadata: {
			documentation: { summary: "Answers the bound request DTO" },
			resource: { action: `scalarWire.${path}`, entity: E2eScalarWireItemEntity },
			response: { status: HttpStatus.OK, type: E2eScalarWireResponseDto },
			route: { method, path },
		},
	};
}

@Controller("scalar-wire")
class E2eScalarWireController {
	@ApiMethod<E2eScalarWireItemEntity>(manualRoute(RequestMethod.POST, "body"))
	public bodyPost(@Body() body: E2eScalarWireBodyDto): unknown {
		return body;
	}

	@ApiMethod<E2eScalarWireItemEntity>(manualRoute(RequestMethod.PUT, "body"))
	public bodyPut(@Body() body: E2eScalarWireBodyDto): unknown {
		return body;
	}

	@ApiMethod<E2eScalarWireItemEntity>(manualRoute(RequestMethod.PATCH, "body"))
	public bodyPatch(@Body() body: E2eScalarWireBodyDto): unknown {
		return body;
	}

	@ApiRouteCustom<E2eScalarWireItemEntity>({
		resource: { action: "scalarWire.customBody", entity: E2eScalarWireItemEntity },
		response: { serialization: { isEnabled: false }, status: HttpStatus.OK, type: E2eScalarWireResponseDto },
		route: { method: RequestMethod.POST, path: "custom" },
	})
	public customBody(@Body() body: E2eScalarWireCustomBodyDto): unknown {
		return body;
	}

	@ApiRouteCustom<E2eScalarWireItemEntity>({
		resource: { action: "scalarWire.customQuery", entity: E2eScalarWireItemEntity },
		response: { serialization: { isEnabled: false }, status: HttpStatus.OK, type: E2eScalarWireResponseDto },
		route: { method: RequestMethod.GET, path: "custom" },
	})
	public customQuery(@Query() query: E2eScalarWireCustomQueryDto): unknown {
		return query;
	}

	@ApiMethod<E2eScalarWireItemEntity>(manualRoute(RequestMethod.GET, "path/:count/:flag"))
	public path(@Param() parameters: E2eScalarWirePathDto): unknown {
		return parameters;
	}

	@ApiMethod<E2eScalarWireItemEntity>(manualRoute(RequestMethod.GET, "query"))
	public query(@Query() query: E2eScalarWireQueryDto): unknown {
		return query;
	}
}

@Controller("scalar-wire-plain")
class E2eScalarWirePlainController {
	@Get()
	public query(@Query() query: E2eScalarWirePlainQueryDto): unknown {
		return query;
	}
}

/**
 * Sends a request over a real socket and reads the answer.
 * @param {string} url - Absolute URL.
 * @param {string} method - HTTP method.
 * @param {unknown} [body] - JSON body, or form text when `contentType` is given.
 * @param {string} [contentType] - Content type of a text body.
 * @returns {Promise<IE2eScalarWireResponse>} Status and JSON body.
 */
async function send(url: string, method: string, body?: unknown, contentType?: string): Promise<IE2eScalarWireResponse> {
	const init: RequestInit = { method };

	if (body !== undefined) {
		init.body = contentType === undefined ? JSON.stringify(body) : String(body);
		init.headers = { "content-type": contentType ?? "application/json" };
	}

	const response: Response = await fetch(url, init);

	return { body: (await response.json()) as Record<string, unknown>, status: response.status };
}

describe.each([
	{ adapterName: "Express", isImplicit: false },
	{ adapterName: "Fastify", isImplicit: false },
	{ adapterName: "Express", isImplicit: true },
	{ adapterName: "Fastify", isImplicit: true },
])("number and boolean request values through $adapterName, enableImplicitConversion $isImplicit (E2E)", ({ adapterName, isImplicit }: { adapterName: string; isImplicit: boolean }) => {
	let app: INestApplication;
	let base: string;
	let document: OpenAPIObject;

	beforeAll(async () => {
		const moduleReference = await Test.createTestingModule({
			controllers: [E2eScalarWireController, E2eScalarWireItemController, E2eScalarWirePlainController],
			imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [E2eScalarWireItemEntity], logging: false, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature([E2eScalarWireItemEntity]), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
			providers: [E2eScalarWireItemService],
		}).compile();

		app = moduleReference.createNestApplication(adapterName === "Express" ? new ExpressAdapter() : new FastifyAdapter(), { logger: false });
		// Project Core runs its pipe without implicit conversion; the rule is the same with it.
		app.useGlobalPipes(new ValidationPipe({ forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: isImplicit }, whitelist: true }));
		await app.listen(0, "127.0.0.1");
		base = await app.getUrl();
		document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
	});

	afterAll(async () => {
		await app.close();
	});

	describe("query and path values, which are text", () => {
		it("converts query number and boolean text, lists included", async () => {
			const response: IE2eScalarWireResponse = await send(`${base}/scalar-wire/query?count=5&ratio=1.5&flag=false&counts=1&counts=2&flags=true&flags=false`, "GET");

			expect(response).toEqual({ body: { count: 5, counts: [1, 2], flag: false, flags: [true, false], ratio: 1.5 }, status: HttpStatus.OK });
		});

		it("reads a lone query value of a list as a one-item list", async () => {
			const response: IE2eScalarWireResponse = await send(`${base}/scalar-wire/query?counts=7&flags=true`, "GET");

			expect(response).toEqual({ body: { counts: [7], flags: [true] }, status: HttpStatus.OK });
		});

		it.each(["count=05", "count=abc", "flag=yes", "flag=1", "counts=1&counts=x", "flags=true&flags=TRUE"])("refuses the non-canonical query %s", async (search: string) => {
			expect((await send(`${base}/scalar-wire/query?${search}`, "GET")).status).toBe(HttpStatus.BAD_REQUEST);
		});

		it("converts path number and boolean text", async () => {
			const response: IE2eScalarWireResponse = await send(`${base}/scalar-wire/path/5/true`, "GET");

			expect(response).toEqual({ body: { count: 5, flag: true }, status: HttpStatus.OK });
		});

		it("converts the query of an ApiRouteCustom route", async () => {
			expect(await send(`${base}/scalar-wire/custom?count=5`, "GET")).toEqual({ body: { count: 5 }, status: HttpStatus.OK });
		});

		it("converts the query DTO of a plain Nest route", async () => {
			expect(await send(`${base}/scalar-wire-plain?count=5&flag=true`, "GET")).toEqual({ body: { count: 5, flag: true }, status: HttpStatus.OK });
		});
	});

	describe("JSON bodies, which carry numbers and booleans", () => {
		it.each(["POST", "PUT", "PATCH"])("accepts JSON numbers and booleans in a %s body, lists and nested objects included", async (method: string) => {
			const body: Record<string, unknown> = { count: 5, counts: [1, 2], flag: false, flags: [true, false], nested: { count: 3, flag: true }, nestedList: [{ count: 4, flag: false }], ratio: 1.5 };

			expect(await send(`${base}/scalar-wire/body`, method, body)).toEqual({ body, status: HttpStatus.OK });
		});

		it.each([
			["POST", { count: "5" }, "count must be an integer number"],
			["PUT", { count: "5" }, "count must be an integer number"],
			["PATCH", { count: "5" }, "count must be an integer number"],
			["POST", { ratio: "1.5" }, "ratio must be a number conforming to the specified constraints"],
			["POST", { flag: "true" }, "flag must be a boolean value"],
			["PUT", { flag: "false" }, "flag must be a boolean value"],
			["PATCH", { flag: "false" }, "flag must be a boolean value"],
			["POST", { counts: [1, "2"] }, "each value in counts must be an integer number"],
			["PATCH", { counts: "2" }, "each value in counts must be an integer number"],
			["POST", { flags: [true, "false"] }, "each value in flags must be a boolean value"],
			["POST", { nested: { count: "5" } }, "nested.count must be an integer number"],
			["PUT", { nestedList: [{ flag: "true" }] }, "nestedList.0.flag must be a boolean value"],
		])("refuses number and boolean text in a %s body %j", async (method: string, body: Record<string, unknown>, message: string) => {
			const response: IE2eScalarWireResponse = await send(`${base}/scalar-wire/body`, method, body);

			expect(response.status).toBe(HttpStatus.BAD_REQUEST);
			expect(response.body.message).toContain(message);
		});

		it("answers number text in a body exactly as any other invalid number", async () => {
			const text: IE2eScalarWireResponse = await send(`${base}/scalar-wire/body`, "POST", { count: "5" });
			const invalid: IE2eScalarWireResponse = await send(`${base}/scalar-wire/body`, "POST", { count: "abc" });

			expect(text).toEqual(invalid);
			expect(text.body).toEqual({ error: "Bad Request", message: ["count must be an integer number", "count must not be less than 0", "count must not be greater than 100", "count must be divisible by 1"], statusCode: HttpStatus.BAD_REQUEST });
		});

		it("refuses number text in the body of an ApiRouteCustom route", async () => {
			expect((await send(`${base}/scalar-wire/custom`, "POST", { count: "5" })).status).toBe(HttpStatus.BAD_REQUEST);
			expect(await send(`${base}/scalar-wire/custom`, "POST", { count: 5 })).toEqual({ body: { count: 5 }, status: HttpStatus.OK });
		});

		it("keeps a BIGINT_STRING as the JSON string its OpenAPI schema declares", async () => {
			expect(await send(`${base}/scalar-wire/body`, "POST", { total: "9007199254740993" })).toEqual({ body: { total: "9007199254740993" }, status: HttpStatus.OK });
		});

		it("publishes the types the body accepts", () => {
			const properties: Record<string, { items?: { type?: string }; type?: string }> = (document.components?.schemas?.E2eScalarWireBodyDto as { properties: Record<string, { items?: { type?: string }; type?: string }> }).properties;

			expect(properties.count?.type).toBe("integer");
			expect(properties.ratio?.type).toBe("number");
			expect(properties.flag?.type).toBe("boolean");
			expect(properties.counts?.items?.type).toBe("integer");
			expect(properties.total?.type).toBe("string");
		});
	});

	describe("form bodies, whose fields are text", () => {
		it("converts the canonical text of a form body", async () => {
			const response: IE2eScalarWireResponse = await send(`${base}/scalar-wire/body`, "POST", "count=5&flag=true&counts=1&counts=2", "application/x-www-form-urlencoded");

			expect(response).toEqual({ body: { count: 5, counts: [1, 2], flag: true }, status: HttpStatus.OK });
		});

		it("refuses non-canonical text in a form body", async () => {
			expect((await send(`${base}/scalar-wire/body`, "POST", "count=05", "application/x-www-form-urlencoded")).status).toBe(HttpStatus.BAD_REQUEST);
		});
	});

	describe("generated routes", () => {
		let id: number;

		it("refuses number and boolean text in a generated CREATE body with the usual validation error", async () => {
			const text: IE2eScalarWireResponse = await send(`${base}/scalar-wire-items`, "POST", { isActive: true, rank: "5" });
			const invalid: IE2eScalarWireResponse = await send(`${base}/scalar-wire-items`, "POST", { isActive: true, rank: 1.5 });

			expect(text.status).toBe(HttpStatus.BAD_REQUEST);
			expect(text.body.message).toContain("rank must be an integer number");
			expect(invalid.body.message).toContain("rank must be an integer number");
			expect((await send(`${base}/scalar-wire-items`, "POST", { isActive: "true", rank: 5 })).body.message).toContain("isActive must be a boolean value");
		});

		it("creates a row from JSON numbers and booleans", async () => {
			const response: IE2eScalarWireResponse = await send(`${base}/scalar-wire-items`, "POST", { isActive: true, rank: 5 });

			expect(response.status).toBe(HttpStatus.CREATED);
			expect(response.body).toEqual(expect.objectContaining({ isActive: true, rank: 5 }));
			id = response.body.id as number;
		});

		it("reads the row by its path text", async () => {
			expect(await send(`${base}/scalar-wire-items/${String(id)}`, "GET")).toEqual({ body: expect.objectContaining({ id, rank: 5 }) as unknown, status: HttpStatus.OK });
		});

		it("lists rows with query text for pagination and filters", async () => {
			const response: IE2eScalarWireResponse = await send(`${base}/scalar-wire-items?limit=10&page=1&rank[operator]=eq&rank[value]=5&isActive[operator]=eq&isActive[value]=true`, "GET");

			expect(response.status).toBe(HttpStatus.OK);
			expect(response.body.items).toEqual([expect.objectContaining({ id, isActive: true, rank: 5 })]);
		});

		it.each([
			["PUT", { isActive: false, rank: "6" }, "rank must be an integer number"],
			["PATCH", { rank: "6" }, "rank must be an integer number"],
			["PATCH", { isActive: "false" }, "isActive must be a boolean value"],
		])("refuses text in a generated %s body %j", async (method: string, body: Record<string, unknown>, message: string) => {
			const response: IE2eScalarWireResponse = await send(`${base}/scalar-wire-items/${String(id)}`, method, body);

			expect(response.status).toBe(HttpStatus.BAD_REQUEST);
			expect(response.body.message).toContain(message);
		});

		it.each([
			["PUT", { isActive: false, rank: 6 }],
			["PATCH", { rank: 7 }],
		])("updates a row from a generated %s body of JSON values", async (method: string, body: Record<string, unknown>) => {
			const response: IE2eScalarWireResponse = await send(`${base}/scalar-wire-items/${String(id)}`, method, body);

			expect(response.status).toBe(HttpStatus.OK);
			expect(response.body).toEqual(expect.objectContaining(body));
		});
	});
});
