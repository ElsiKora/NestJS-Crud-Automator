import "reflect-metadata";

import type { CallHandler, CanActivate, ExecutionContext, INestApplication, NestInterceptor } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import type { Observable } from "rxjs";
import type { Repository } from "typeorm";

import { Readable } from "node:stream";

import { Body, Controller, Get, HttpStatus, Inject, Injectable, Post, RequestMethod, UnauthorizedException, ValidationPipe } from "@nestjs/common";
import { APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { ApiProperty, DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { classToPlain, plainToInstance, Transform } from "class-transformer";
import { IsObject, IsOptional, IsString } from "class-validator";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiPropertyDescribe, ApiRouteCustom, ApiService, ApiServiceBase, CorrelationIDResponseBodyInterceptor, EApiDtoType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

const DEPTH_MESSAGE: string = "request body must not nest more than 64 levels deep";
const KEYS_MESSAGE: string = "request body must not hold an object with more than 1000 keys";
const FASTIFY_DEFAULT_BODY_LIMIT: number = 1_048_576;
const CLIENT_KEY_MARKER: string = "clientKeyMarker";
const ROW_NAME: string = "row";

interface IE2eBodyShapeResponse {
	json: () => Record<string, unknown>;
	payload: string;
	statusCode: number;
}

interface IE2eBodyShapeRoute {
	method: "PATCH" | "POST" | "PUT";
	name: string;
	// Fields every body sends next to the free-form payload.
	prefix: string;
	success: HttpStatus;
	url: () => string;
}

const transformRuns: { count: number } = { count: 0 };

class E2eBodyShapeCustomDto {
	@IsObject()
	@IsOptional()
	public payload?: Record<string, unknown>;
}

class E2eBodyShapeResponseDto {}

class E2eBodyShapeDiscriminatedFirstDto {
	@ApiProperty()
	@IsString()
	@Transform(({ value }: { value: unknown }): unknown => {
		transformRuns.count += 1;

		return value;
	})
	public channel!: string;

	@IsObject()
	@IsOptional()
	public payload?: Record<string, unknown>;
}

class E2eBodyShapeDiscriminatedSecondDto {
	@ApiProperty()
	@IsString()
	public channel!: string;
}

class E2eBodyShapeInstanceBody {
	public kind: string = "instance";
}

@Entity("e2e_body_shape_rows")
class E2eBodyShapeEntity {
	@ApiPropertyDescribe({ description: "bodyShapeRowId", type: EApiPropertyDescribeType.UUID })
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@ApiPropertyDescribe({ description: "bodyShapeRowName", exampleValue: "row", format: EApiPropertyStringType.STRING, maxLength: 10, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	@Column({ type: "varchar" })
	public name!: string;

	@ApiPropertyDescribe({ dataType: Object, description: "bodyShapeRowPayload", isNullable: true, type: EApiPropertyDescribeType.OBJECT })
	@Column({ nullable: true, type: "simple-json" })
	public payload?: null | Record<string, unknown>;
}

@Injectable()
@ApiService({ entity: E2eBodyShapeEntity })
class E2eBodyShapeService extends ApiServiceBase<E2eBodyShapeEntity> {
	@InjectRepository(E2eBodyShapeEntity)
	public readonly repository!: Repository<E2eBodyShapeEntity>;
}

@Injectable()
class E2eBodyShapeForbiddenGuard implements CanActivate {
	public canActivate(): boolean {
		return false;
	}
}

@Injectable()
class E2eBodyShapeUnauthorizedGuard implements CanActivate {
	public canActivate(): boolean {
		throw new UnauthorizedException();
	}
}

/**
 * Stands in for a consumer's global interceptor that replaced the parsed body before the route's interceptors run.
 */
@Injectable()
class E2eBodyShapeReplaceBodyInterceptor implements NestInterceptor {
	public intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
		const request: { body?: unknown; headers: Record<string, string | undefined> } = context.switchToHttp().getRequest();

		switch (request.headers["x-replace-body"]) {
			case "cycle": {
				const cycle: Record<string, unknown> = {};
				cycle.self = cycle;
				request.body = cycle;

				break;
			}

			case "instance": {
				request.body = new E2eBodyShapeInstanceBody();

				break;
			}

			default: {
				break;
			}
		}

		return next.handle();
	}
}

@ApiController<E2eBodyShapeEntity>({
	entity: E2eBodyShapeEntity,
	name: "E2eBodyShapeRows",
	path: "body-shape-rows",
	routes: {},
})
class E2eBodyShapeRowController {
	public constructor(@Inject(E2eBodyShapeService) public readonly service: E2eBodyShapeService) {}
}

@ApiController<E2eBodyShapeEntity>({
	entity: E2eBodyShapeEntity,
	name: "E2eBodyShapeForbiddenRows",
	path: "body-shape-forbidden-rows",
	routes: {
		[EApiRouteType.CREATE]: { execution: { guards: [E2eBodyShapeForbiddenGuard] } },
	},
})
class E2eBodyShapeForbiddenRowController {
	public constructor(@Inject(E2eBodyShapeService) public readonly service: E2eBodyShapeService) {}
}

@Controller("body-shape-custom")
class E2eBodyShapeCustomController {
	@ApiRouteCustom<E2eBodyShapeEntity>({
		dto: {
			[EApiDtoType.BODY]: {
				discriminator: {
					mapping: {
						first: E2eBodyShapeDiscriminatedFirstDto,
						second: E2eBodyShapeDiscriminatedSecondDto,
					},
					propertyName: "channel",
					shouldKeepDiscriminatorProperty: true,
				},
				type: [E2eBodyShapeDiscriminatedFirstDto, E2eBodyShapeDiscriminatedSecondDto],
			},
		},
		resource: { action: "bodyShape.discriminated", entity: E2eBodyShapeEntity },
		response: { serialization: { isEnabled: false }, status: HttpStatus.OK, type: E2eBodyShapeResponseDto },
		route: { method: RequestMethod.POST, path: "discriminated" },
	})
	public discriminated(@Body() body: E2eBodyShapeDiscriminatedFirstDto): { channel: string } {
		return { channel: body.channel };
	}

	@ApiRouteCustom<E2eBodyShapeEntity>({
		execution: { guards: [E2eBodyShapeForbiddenGuard] },
		resource: { action: "bodyShape.forbidden", entity: E2eBodyShapeEntity },
		response: { serialization: { isEnabled: false }, status: HttpStatus.OK, type: E2eBodyShapeResponseDto },
		route: { method: RequestMethod.POST, path: "forbidden" },
	})
	public forbidden(@Body() _body: E2eBodyShapeCustomDto): { isReached: boolean } {
		return { isReached: true };
	}

	@ApiRouteCustom<E2eBodyShapeEntity>({
		resource: { action: "bodyShape.plain", entity: E2eBodyShapeEntity },
		response: { serialization: { isEnabled: false }, status: HttpStatus.OK, type: E2eBodyShapeResponseDto },
		route: { method: RequestMethod.POST, path: "plain" },
	})
	public plain(@Body() body: E2eBodyShapeCustomDto): { keys: number } {
		return { keys: Object.keys(body.payload ?? {}).length };
	}

	@ApiRouteCustom<E2eBodyShapeEntity>({
		resource: { action: "bodyShape.read", entity: E2eBodyShapeEntity },
		response: { serialization: { isEnabled: false }, status: HttpStatus.OK, type: E2eBodyShapeResponseDto },
		route: { method: RequestMethod.GET, path: "read" },
	})
	public read(): { isRead: boolean } {
		return { isRead: true };
	}

	@ApiRouteCustom<E2eBodyShapeEntity>({
		resource: { action: "bodyShape.received", entity: E2eBodyShapeEntity },
		response: { serialization: { isEnabled: false }, status: HttpStatus.OK, type: E2eBodyShapeResponseDto },
		route: { method: RequestMethod.POST, path: "received" },
	})
	public async received(@Body() body: unknown): Promise<{ kind: string; text?: string }> {
		if (Buffer.isBuffer(body)) {
			return { kind: "buffer", text: body.toString("utf8") };
		}

		if (body instanceof Readable) {
			const chunks: Array<Buffer> = [];

			for await (const chunk of body) {
				chunks.push(Buffer.from(chunk as Uint8Array));
			}

			return { kind: "stream", text: Buffer.concat(chunks).toString("utf8") };
		}

		return { kind: body instanceof E2eBodyShapeInstanceBody ? body.kind : typeof body };
	}

	@ApiRouteCustom<E2eBodyShapeEntity>({
		execution: { guards: [E2eBodyShapeUnauthorizedGuard] },
		resource: { action: "bodyShape.unauthorized", entity: E2eBodyShapeEntity },
		response: { serialization: { isEnabled: false }, status: HttpStatus.OK, type: E2eBodyShapeResponseDto },
		route: { method: RequestMethod.POST, path: "unauthorized" },
	})
	public unauthorized(@Body() _body: E2eBodyShapeCustomDto): { isReached: boolean } {
		return { isReached: true };
	}
}

// A plain Nest route on a library DTO: outside the rule, so a host keeps its own limit there.
@Controller("body-shape-plain")
class E2eBodyShapePlainController {
	@Get()
	public read(): { isRead: boolean } {
		return { isRead: true };
	}

	@Post()
	public write(@Body() body: E2eBodyShapeCustomDto): { keys: number } {
		return { keys: Object.keys(body.payload ?? {}).length };
	}
}

/**
 * Builds the JSON of an object that holds the given number of keys.
 * @param {number} count - Keys in the object.
 * @returns {string} JSON text.
 */
function wideObject(count: number): string {
	const parts: Array<string> = [];

	for (let index: number = 0; index < count; index += 1) {
		parts.push(`"${CLIENT_KEY_MARKER}${String(index)}":0`);
	}

	return `{${parts.join(",")}}`;
}

/**
 * Builds the JSON of a free-form object that fills the bytes it is given with the shortest distinct keys.
 * @param {number} bytes - Size to fill.
 * @returns {string} JSON text.
 */
function wideObjectOfBytes(bytes: number): string {
	const alphabet: string = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	// Three key characters plus `"":0,` take eight bytes each.
	const count: number = Math.floor((bytes - 2) / 8);
	const parts: Array<string> = [];

	for (let index: number = 0; index < count; index += 1) {
		// eslint-disable-next-line @elsikora/typescript/no-magic-numbers
		parts.push(`"${alphabet.charAt(Math.floor(index / 3844) % 62)}${alphabet.charAt(Math.floor(index / 62) % 62)}${alphabet.charAt(index % 62)}":0`);
	}

	return `{${parts.join(",")}}`;
}

/**
 * Builds the JSON of an object chain of the given number of levels.
 * @param {number} levels - Objects nested in each other.
 * @returns {string} JSON text.
 */
function nestedObjects(levels: number): string {
	return `${'{"a":'.repeat(levels - 1)}{}${"}".repeat(levels - 1)}`;
}

/**
 * Builds the JSON of an array chain of the given number of levels.
 * @param {number} levels - Arrays nested in each other.
 * @returns {string} JSON text.
 */
function nestedArrays(levels: number): string {
	return `${"[".repeat(levels)}${"]".repeat(levels)}`;
}

describe.each([
	{ hasHostPipe: true, name: "a transforming host ValidationPipe" },
	{ hasHostPipe: false, name: "no host pipe" },
])("request body shape limits with $name (E2E)", ({ hasHostPipe }: { hasHostPipe: boolean }) => {
	const hostPipeTransform: ReturnType<typeof vi.fn> = vi.fn(plainToInstance);
	let app: INestApplication;
	let fastify: { inject: (options: { headers?: Record<string, string>; method: string; payload?: unknown; url: string }) => Promise<IE2eBodyShapeResponse> };
	let rowId: string;

	const send = async (url: string, method: string, payload: string): Promise<IE2eBodyShapeResponse> => await fastify.inject({ headers: { "content-type": "application/json" }, method, payload, url });

	const routes: Array<IE2eBodyShapeRoute> = [
		{ method: "POST", name: "generated CREATE", prefix: `"name":"${ROW_NAME}",`, success: HttpStatus.CREATED, url: (): string => "/body-shape-rows" },
		{ method: "PUT", name: "generated UPDATE", prefix: `"name":"${ROW_NAME}",`, success: HttpStatus.OK, url: (): string => `/body-shape-rows/${rowId}` },
		{ method: "PATCH", name: "generated PARTIAL_UPDATE", prefix: `"name":"${ROW_NAME}",`, success: HttpStatus.OK, url: (): string => `/body-shape-rows/${rowId}` },
		{ method: "POST", name: "ApiRouteCustom", prefix: "", success: HttpStatus.OK, url: (): string => "/body-shape-custom/plain" },
		{ method: "POST", name: "discriminated ApiRouteCustom", prefix: `"channel":"first",`, success: HttpStatus.OK, url: (): string => "/body-shape-custom/discriminated" },
	];

	const transformerRuns = (): number => hostPipeTransform.mock.calls.length + transformRuns.count;

	beforeAll(async () => {
		const pipeProviders: Array<{ provide: string; useValue: ValidationPipe }> = hasHostPipe ? [{ provide: APP_PIPE, useValue: new ValidationPipe({ transform: true, transformerPackage: { classToPlain, plainToInstance: hostPipeTransform as typeof plainToInstance }, whitelist: true }) }] : [];
		const moduleReference = await Test.createTestingModule({
			controllers: [E2eBodyShapeCustomController, E2eBodyShapeForbiddenRowController, E2eBodyShapePlainController, E2eBodyShapeRowController],
			imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [E2eBodyShapeEntity], logging: false, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature([E2eBodyShapeEntity]), ApiAuthorizationModule.forRoot()],
			providers: [...pipeProviders, { provide: APP_INTERCEPTOR, useClass: CorrelationIDResponseBodyInterceptor }, { provide: APP_INTERCEPTOR, useClass: E2eBodyShapeReplaceBodyInterceptor }, E2eBodyShapeService],
		}).compile();

		const adapter: FastifyAdapter = new FastifyAdapter();
		const instance = adapter.getInstance();

		instance.addContentTypeParser("application/octet-stream", { parseAs: "buffer" }, (_request: unknown, body: Buffer | string, done: (error: Error | null, body?: unknown) => void) => {
			done(null, body);
		});
		instance.addContentTypeParser("application/x-raw-stream", (_request: unknown, payload: unknown, done: (error: Error | null, body?: unknown) => void) => {
			done(null, payload);
		});

		app = moduleReference.createNestApplication(adapter, { logger: false });
		await app.init();
		fastify = app.getHttpAdapter().getInstance();

		const created: IE2eBodyShapeResponse = await send("/body-shape-rows", "POST", `{"name":"${ROW_NAME}","payload":{}}`);
		rowId = created.json().id as string;
	});

	beforeEach(() => {
		hostPipeTransform.mockClear();
		transformRuns.count = 0;
	});

	afterAll(async () => {
		await app.close();
	});

	describe.each(routes)("on $name", (route: IE2eBodyShapeRoute) => {
		it("passes a body of 64 levels of objects", async () => {
			// The body is level 1, so the payload starts at level 2.
			const response: IE2eBodyShapeResponse = await send(route.url(), route.method, `{${route.prefix}"payload":${nestedObjects(63)}}`);

			expect(response.statusCode).toBe(route.success);
		});

		it("refuses a body of 65 levels of objects", async () => {
			const response: IE2eBodyShapeResponse = await send(route.url(), route.method, `{${route.prefix}"payload":${nestedObjects(64)}}`);

			expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
			expect(response.json().message).toEqual([DEPTH_MESSAGE]);
			expect(transformerRuns()).toBe(0);
		});

		it("counts array levels the same way", async () => {
			// Levels: the body, the payload object, then the arrays.
			const passing: IE2eBodyShapeResponse = await send(route.url(), route.method, `{${route.prefix}"payload":{"list":${nestedArrays(62)}}}`);
			const refused: IE2eBodyShapeResponse = await send(route.url(), route.method, `{${route.prefix}"payload":{"list":${nestedArrays(63)}}}`);

			expect(passing.statusCode).toBe(route.success);
			expect(refused.statusCode).toBe(HttpStatus.BAD_REQUEST);
			expect(refused.json().message).toEqual([DEPTH_MESSAGE]);
		});

		it("passes a free-form object of 1000 keys", async () => {
			const response: IE2eBodyShapeResponse = await send(route.url(), route.method, `{${route.prefix}"payload":${wideObject(1000)}}`);

			expect(response.statusCode).toBe(route.success);
		});

		it("refuses a free-form object of 1001 keys without echoing a client key", async () => {
			const response: IE2eBodyShapeResponse = await send(route.url(), route.method, `{${route.prefix}"payload":${wideObject(1001)}}`);

			expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
			expect(response.json().message).toEqual([KEYS_MESSAGE]);
			expect(response.payload).not.toContain(CLIENT_KEY_MARKER);
			expect(transformerRuns()).toBe(0);
		});

		it("refuses a wide body at the default body limit before the transformer runs", async () => {
			const prefix: string = `{${route.prefix}"payload":`;
			const payload: string = `${prefix}${wideObjectOfBytes(FASTIFY_DEFAULT_BODY_LIMIT - prefix.length - 1)}}`;

			expect(payload.length).toBeLessThanOrEqual(FASTIFY_DEFAULT_BODY_LIMIT);

			const response: IE2eBodyShapeResponse = await send(route.url(), route.method, payload);

			expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
			expect(response.json().message).toEqual([KEYS_MESSAGE]);
			expect(transformerRuns()).toBe(0);
		});

		it.each([
			{ build: nestedObjects, name: "objects" },
			{ build: nestedArrays, name: "arrays" },
		])("answers 400, not a stack overflow, for 100000 levels of $name", async ({ build }: { build: (levels: number) => string }) => {
			const response: IE2eBodyShapeResponse = await send(route.url(), route.method, `{${route.prefix}"payload":${build(100_000)}}`);

			expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
			expect(response.json().message).toEqual([DEPTH_MESSAGE]);
			expect(transformerRuns()).toBe(0);
		});
	});

	it("runs the transformers these tests watch on a body within the limits", async () => {
		await send("/body-shape-custom/discriminated", "POST", '{"channel":"first"}');

		expect(transformRuns.count).toBe(1);

		if (hasHostPipe) {
			await send("/body-shape-custom/plain", "POST", '{"payload":{}}');

			expect(hostPipeTransform).toHaveBeenCalled();
		}
	});

	it("counts the keys of the body itself", async () => {
		const prefix: string = '"name":"row","payload":{}';
		const keysAtLimit: string = wideObject(998).slice(1);
		const keysOverLimit: string = wideObject(999).slice(1);

		const passing: IE2eBodyShapeResponse = await send("/body-shape-rows", "POST", `{${prefix},${keysAtLimit}`);
		const refused: IE2eBodyShapeResponse = await send("/body-shape-rows", "POST", `{${prefix},${keysOverLimit}`);

		// Without a host pipe the undeclared keys reach the service, so only the refusal is the rule's.
		expect(passing.json().message).not.toEqual([KEYS_MESSAGE]);
		expect(refused.statusCode).toBe(HttpStatus.BAD_REQUEST);
		expect(refused.json().message).toEqual([KEYS_MESSAGE]);
	});

	it("does not limit the length of an array", async () => {
		const items: string = Array.from({ length: 5000 }, (): string => "0").join(",");
		const response: IE2eBodyShapeResponse = await send("/body-shape-custom/plain", "POST", `{"payload":{"items":[${items}]}}`);

		expect(response.statusCode).toBe(HttpStatus.OK);
	});

	it("refuses an array body past the limit", async () => {
		const response: IE2eBodyShapeResponse = await send("/body-shape-custom/received", "POST", nestedArrays(65));

		expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
		expect(response.json().message).toEqual([DEPTH_MESSAGE]);
	});

	it.each([
		{ name: "a string", payload: '"text"' },
		{ name: "a number", payload: "7" },
		{ name: "null", payload: "null" },
	])("leaves $name as a body to the route", async ({ payload }: { payload: string }) => {
		const response: IE2eBodyShapeResponse = await send("/body-shape-custom/received", "POST", payload);

		expect(response.statusCode).toBe(HttpStatus.OK);
	});

	it("leaves a raw Buffer body intact for the handler", async () => {
		const response: IE2eBodyShapeResponse = await fastify.inject({ headers: { "content-type": "application/octet-stream" }, method: "POST", payload: wideObject(1001), url: "/body-shape-custom/received" });

		expect(response.statusCode).toBe(HttpStatus.OK);
		expect(response.json()).toEqual({ kind: "buffer", text: wideObject(1001) });
	});

	it("does not consume a raw stream body", async () => {
		const response: IE2eBodyShapeResponse = await fastify.inject({ headers: { "content-type": "application/x-raw-stream" }, method: "POST", payload: "stream text", url: "/body-shape-custom/received" });

		expect(response.statusCode).toBe(HttpStatus.OK);
		expect(response.json()).toEqual({ kind: "stream", text: "stream text" });
	});

	it("leaves a body a consumer interceptor turned into a class instance", async () => {
		const response: IE2eBodyShapeResponse = await fastify.inject({ headers: { "content-type": "application/json", "x-replace-body": "instance" }, method: "POST", payload: "{}", url: "/body-shape-custom/received" });

		expect(response.statusCode).toBe(HttpStatus.OK);
		expect(response.json()).toEqual({ kind: "instance" });
	});

	it("answers 400, not a hang or a crash, for a cyclic body a consumer interceptor built", async () => {
		const response: IE2eBodyShapeResponse = await fastify.inject({ headers: { "content-type": "application/json", "x-replace-body": "cycle" }, method: "POST", payload: "{}", url: "/body-shape-custom/received" });

		expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
		expect(response.json().message).toEqual([DEPTH_MESSAGE]);
	});

	it.each([
		{ expected: HttpStatus.FORBIDDEN, name: "generated CREATE", url: "/body-shape-forbidden-rows" },
		{ expected: HttpStatus.FORBIDDEN, name: "ApiRouteCustom", url: "/body-shape-custom/forbidden" },
		{ expected: HttpStatus.UNAUTHORIZED, name: "ApiRouteCustom without credentials", url: "/body-shape-custom/unauthorized" },
	])("answers $expected on $name for an oversized body", async ({ expected, url }: { expected: HttpStatus; url: string }) => {
		const tooWide: IE2eBodyShapeResponse = await send(url, "POST", `{"payload":${wideObject(1001)}}`);
		const tooDeep: IE2eBodyShapeResponse = await send(url, "POST", `{"payload":${nestedObjects(100_000)}}`);

		expect(tooWide.statusCode).toBe(expected);
		expect(tooDeep.statusCode).toBe(expected);
		expect(transformerRuns()).toBe(0);
	});

	it("leaves GET routes without a body untouched", async () => {
		const list: IE2eBodyShapeResponse = await fastify.inject({ method: "GET", url: "/body-shape-rows?limit=10&page=1" });
		const row: IE2eBodyShapeResponse = await fastify.inject({ method: "GET", url: `/body-shape-rows/${rowId}` });
		const custom: IE2eBodyShapeResponse = await fastify.inject({ method: "GET", url: "/body-shape-custom/read" });

		expect(list.statusCode).toBe(HttpStatus.OK);
		expect(row.statusCode).toBe(HttpStatus.OK);
		expect(custom.statusCode).toBe(HttpStatus.OK);
	});

	it("leaves a DELETE without a body untouched", async () => {
		const created: IE2eBodyShapeResponse = await send("/body-shape-rows", "POST", `{"name":"${ROW_NAME}","payload":{}}`);
		const response: IE2eBodyShapeResponse = await fastify.inject({ method: "DELETE", url: `/body-shape-rows/${String(created.json().id)}` });

		expect(response.statusCode).toBe(HttpStatus.NO_CONTENT);
	});

	it("does not apply to a plain Nest route", async () => {
		const response: IE2eBodyShapeResponse = await send("/body-shape-plain", "POST", `{"payload":${wideObject(1001)}}`);

		expect(response.statusCode).toBe(HttpStatus.CREATED);
	});

	it("answers with the shape of the other 400s, correlation included", async () => {
		const refused: IE2eBodyShapeResponse = await send("/body-shape-custom/plain", "POST", `{"payload":${wideObject(1001)}}`);
		const refusedBody: Record<string, unknown> = refused.json();

		expect(refusedBody.statusCode).toBe(HttpStatus.BAD_REQUEST);
		expect(refusedBody.error).toBe("Bad Request");
		expect(refusedBody.correlationID).toEqual(expect.any(String));

		if (hasHostPipe) {
			const invalid: IE2eBodyShapeResponse = await send("/body-shape-custom/plain", "POST", '{"payload":1}');

			expect(invalid.statusCode).toBe(HttpStatus.BAD_REQUEST);
			expect(Object.keys(refusedBody).toSorted()).toEqual(Object.keys(invalid.json()).toSorted());
		}
	});

	it("keeps the declared 400 able to describe the refusal", () => {
		const document: OpenAPIObject = SwaggerModule.createDocument(app, new DocumentBuilder().build());
		const response = document.paths["/body-shape-rows/{id}"]?.patch?.responses[HttpStatus.BAD_REQUEST] as { content: Record<string, { schema: { $ref: string } }> };
		const schemaName: string = response.content["application/json"]?.schema.$ref.split("/").at(-1) ?? "";
		const schema = document.components?.schemas?.[schemaName] as { properties: { message: { oneOf: Array<Record<string, unknown>> } } };

		expect(schema.properties.message.oneOf).toContainEqual({ items: { type: "string" }, type: "array" });
	});
});
