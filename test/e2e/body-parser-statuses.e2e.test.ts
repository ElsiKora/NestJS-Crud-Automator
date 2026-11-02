import "reflect-metadata";

import type { ExceptionFilter, INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import type { IncomingMessage } from "node:http";
import type { Repository } from "typeorm";

import { request } from "node:http";

import { HttpStatus, Inject, Injectable, RequestMethod, ValidationPipe } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { Ajv } from "ajv";
import addFormats from "ajv-formats";
import { Column, Entity, PrimaryColumn } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiPropertyDescribe, ApiRouteCustom, ApiService, ApiServiceBase, ApiSubscriberModule, CorrelationIDResponseBodyExceptionFilter, CorrelationIDResponseBodyInterceptor, EApiPropertyDescribeType, EApiPropertyStringType } from "../../src/index";

type TAdapterName = "express" | "fastify";

type TSwaggerMethod = "delete" | "get" | "patch" | "post" | "put";

interface IBodyCase {
	body: string;
	headers: Record<string, string>;
	name: string;
}

interface IOperation {
	method: TSwaggerMethod;
	path: string;
	url: string;
}

interface IWireAnswer {
	body: unknown;
	status: number;
}

const STRING_PROPERTY = { format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING } as const;

@Entity("body_parser_items")
class BodyParserItemEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({ ...STRING_PROPERTY, description: "id", exampleValue: "item-1" })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ ...STRING_PROPERTY, description: "name", exampleValue: "Item" })
	public name!: string;
}

@Injectable()
@ApiService({ entity: BodyParserItemEntity })
class BodyParserItemService extends ApiServiceBase<BodyParserItemEntity> {
	@InjectRepository(BodyParserItemEntity)
	public readonly repository!: Repository<BodyParserItemEntity>;
}

@ApiController<BodyParserItemEntity>({ entity: BodyParserItemEntity, name: "BodyParserItems", path: "body-parser-items", routes: {} })
class BodyParserItemController {
	@Inject(BodyParserItemService)
	public readonly service!: BodyParserItemService;

	@ApiRouteCustom<BodyParserItemEntity>({
		resource: { action: "items.summary", entity: BodyParserItemEntity },
		response: { status: HttpStatus.OK, type: undefined },
		route: { method: RequestMethod.GET, path: "custom/summary" },
	})
	public summary(): { isReady: boolean } {
		return { isReady: true };
	}
}

const ITEMS: string = "/body-parser-items";
const ITEM: string = "/body-parser-items/{id}";

const OPERATIONS: Array<IOperation> = [
	{ method: "get", path: ITEMS, url: `${ITEMS}?limit=10&page=1` },
	{ method: "get", path: ITEM, url: `${ITEMS}/item-1` },
	{ method: "get", path: "/body-parser-items/custom/summary", url: `${ITEMS}/custom/summary` },
	{ method: "delete", path: ITEM, url: `${ITEMS}/item-missing` },
	{ method: "post", path: ITEMS, url: ITEMS },
	{ method: "put", path: ITEM, url: `${ITEMS}/item-1` },
	{ method: "patch", path: ITEM, url: `${ITEMS}/item-1` },
];

// Over both default body limits: 1 MiB in Fastify, 100 kB in Express
const OVERSIZED_BODY: string = JSON.stringify({ name: "x".repeat(1_100_000) });

// Fastify refuses an unknown content type, Express an unsupported charset or content encoding
const BODY_CASES: Array<IBodyCase> = [
	{ body: "{bad", headers: { "content-type": "application/json" }, name: "malformed JSON" },
	{ body: OVERSIZED_BODY, headers: { "content-type": "application/json" }, name: "oversized body" },
	{ body: "<item/>", headers: { "content-type": "text/xml" }, name: "unsupported content type" },
	{ body: "{}", headers: { "content-type": "application/json; charset=latin1" }, name: "unsupported charset" },
	{ body: "{}", headers: { "content-encoding": "x-unknown", "content-type": "application/json" }, name: "unsupported content encoding" },
];

const ADAPTERS: Array<[TAdapterName, () => ExpressAdapter | FastifyAdapter]> = [
	["fastify", (): FastifyAdapter => new FastifyAdapter()],
	["express", (): ExpressAdapter => new ExpressAdapter()],
];

const EXCEPTION_FILTER_MODES: Array<[string, (application: INestApplication) => Array<ExceptionFilter>]> = [
	["without an exception filter", (): Array<ExceptionFilter> => []],
	["with CorrelationIDResponseBodyExceptionFilter", (application: INestApplication): Array<ExceptionFilter> => [new CorrelationIDResponseBodyExceptionFilter(application.get(HttpAdapterHost))]],
];

const BODY_PARSER_STATUSES: ReadonlySet<number> = new Set<number>([HttpStatus.BAD_REQUEST, HttpStatus.PAYLOAD_TOO_LARGE, HttpStatus.UNSUPPORTED_MEDIA_TYPE]);

// Body parser statuses each adapter answers per method, which the declared statuses must cover together
const measured: Record<TAdapterName, Record<TSwaggerMethod, Set<number>>> = {
	express: { delete: new Set<number>(), get: new Set<number>(), patch: new Set<number>(), post: new Set<number>(), put: new Set<number>() },
	fastify: { delete: new Set<number>(), get: new Set<number>(), patch: new Set<number>(), post: new Set<number>(), put: new Set<number>() },
};

/**
 * Drops OpenAPI `nullable: false`, its default, which Ajv rejects next to a schema combinator.
 * @param {unknown} value - OpenAPI schema fragment.
 * @returns {unknown} The fragment without `nullable: false`.
 */
function withoutNonNullableFlags(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((item: unknown): unknown => withoutNonNullableFlags(item));
	}

	if (value === null || typeof value !== "object") {
		return value;
	}

	return Object.fromEntries(
		Object.entries(value)
			.filter(([key, item]: [string, unknown]): boolean => key !== "nullable" || item !== false)
			.map(([key, item]: [string, unknown]): [string, unknown] => [key, withoutNonNullableFlags(item)]),
	);
}

/**
 * Sends a raw request over a socket, so the adapter body parser sees the body of any method.
 * @param {string} baseUrl - Listening application URL.
 * @param {TSwaggerMethod} method - Request method.
 * @param {string} url - Request path and query.
 * @param {IBodyCase} bodyCase - Body and its headers.
 * @returns {Promise<IWireAnswer>} Status and parsed body.
 */
function sendOverSocket(baseUrl: string, method: TSwaggerMethod, url: string, bodyCase: IBodyCase): Promise<IWireAnswer> {
	const target: URL = new URL(url, baseUrl);

	return new Promise<IWireAnswer>((resolve: (answer: IWireAnswer) => void, reject: (error: Error) => void) => {
		const outgoing = request({ headers: { ...bodyCase.headers, "content-length": String(Buffer.byteLength(bodyCase.body)) }, hostname: target.hostname, method: method.toUpperCase(), path: `${target.pathname}${target.search}`, port: target.port }, (incoming: IncomingMessage) => {
			let text: string = "";

			incoming.on("data", (chunk: Buffer) => {
				text += chunk.toString();
			});
			incoming.on("end", () => {
				resolve({ body: text ? (JSON.parse(text) as unknown) : undefined, status: incoming.statusCode ?? 0 });
			});
		});

		outgoing.on("error", reject);
		outgoing.end(bodyCase.body);
	});
}

describe.each(ADAPTERS)("body parser statuses on %s (E2E)", (adapterName: TAdapterName, createAdapter: () => ExpressAdapter | FastifyAdapter) => {
	describe.each(EXCEPTION_FILTER_MODES)("%s", (_modeName: string, createFilters: (application: INestApplication) => Array<ExceptionFilter>) => {
		let app: INestApplication;
		let ajv: Ajv;
		let baseUrl: string;
		let document: OpenAPIObject;

		// Fastify closes the socket of an oversized body while it is still written, so it answers through inject
		const send = async (operation: IOperation, bodyCase: IBodyCase): Promise<IWireAnswer> => {
			if (adapterName === "express") {
				return await sendOverSocket(baseUrl, operation.method, operation.url, bodyCase);
			}

			const fastify: { inject: (options: { headers: Record<string, string>; method: string; payload: string; url: string }) => Promise<{ body: string; statusCode: number }> } = app.getHttpAdapter().getInstance();
			const response = await fastify.inject({ headers: bodyCase.headers, method: operation.method.toUpperCase(), payload: bodyCase.body, url: operation.url });

			return { body: response.body ? (JSON.parse(response.body) as unknown) : undefined, status: response.statusCode };
		};

		beforeAll(async () => {
			const moduleReference = await Test.createTestingModule({
				controllers: [BodyParserItemController],
				imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [BodyParserItemEntity], synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature([BodyParserItemEntity]), ApiAuthorizationModule.forRoot({}), ApiSubscriberModule],
				providers: [BodyParserItemService],
			}).compile();

			app = moduleReference.createNestApplication(createAdapter());
			app.useGlobalPipes(new ValidationPipe({ transform: true }));
			app.useGlobalInterceptors(new CorrelationIDResponseBodyInterceptor());
			app.useGlobalFilters(...createFilters(app));
			await app.listen(0, "127.0.0.1");
			baseUrl = (await app.getUrl()).replace("[::1]", "127.0.0.1");
			document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
			await app.get(BodyParserItemService).repository.save({ id: "item-1", name: "One" });

			ajv = new Ajv({ allErrors: true, discriminator: false, strict: false });
			addFormats(ajv);
			ajv.addFormat("int64", true);
			ajv.addFormat("string", true);
			ajv.addSchema({ components: withoutNonNullableFlags(document.components) }, "openapi");
		}, 60_000);

		afterAll(async () => {
			await app?.close();
		});

		it.each(OPERATIONS.flatMap((operation: IOperation): Array<[string, IOperation, IBodyCase]> => BODY_CASES.map((bodyCase: IBodyCase): [string, IOperation, IBodyCase] => [`${operation.method} ${operation.url} ${bodyCase.name}`, operation, bodyCase])))("declares and describes the body parser answer: %s", async (_name: string, operation: IOperation, bodyCase: IBodyCase) => {
			const answer: IWireAnswer = await send(operation, bodyCase);

			if (answer.status < HttpStatus.BAD_REQUEST) {
				return;
			}

			if (BODY_PARSER_STATUSES.has(answer.status)) {
				measured[adapterName][operation.method].add(answer.status);
			}

			const response: { content?: Record<string, { schema?: { $ref?: string } }> } | undefined = document.paths[operation.path]?.[operation.method]?.responses[String(answer.status)] as { content?: Record<string, { schema?: { $ref?: string } }> } | undefined;

			expect(response, JSON.stringify(answer.body)).toBeDefined();
			const validate = ajv.getSchema(`openapi${response?.content?.["application/json"]?.schema?.$ref ?? ""}`);

			expect(validate).toBeDefined();
			validate?.(answer.body);

			expect(validate?.errors ?? null, JSON.stringify(answer.body)).toBeNull();
		});

		it("answers 400, 413, and 415 from the body parser exactly where the adapter parses a body", () => {
			for (const method of ["delete", "patch", "post", "put"] as const) {
				expect([...measured[adapterName][method]].toSorted(), method).toEqual([HttpStatus.BAD_REQUEST, HttpStatus.PAYLOAD_TOO_LARGE, HttpStatus.UNSUPPORTED_MEDIA_TYPE]);
			}

			// Fastify skips the body of GET, Express parses it like any other
			expect([...measured[adapterName].get].toSorted()).toEqual(adapterName === "express" ? [HttpStatus.BAD_REQUEST, HttpStatus.PAYLOAD_TOO_LARGE, HttpStatus.UNSUPPORTED_MEDIA_TYPE] : []);
		});
	});
});
