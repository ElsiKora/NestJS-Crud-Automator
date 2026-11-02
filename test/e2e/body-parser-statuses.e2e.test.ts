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

type TBodyCaseName = "malformedJson" | "noBody" | "oversizedBody" | "unsupportedCharset" | "unsupportedContentEncoding" | "unsupportedContentType";

type TOperationName = "customGet" | "delete" | "get" | "getList" | "patch" | "post" | "put";

type TSwaggerMethod = "delete" | "get" | "patch" | "post" | "put";

interface IBodyCase {
	body?: string;
	headers: Record<string, string>;
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

const OPERATIONS: Record<TOperationName, IOperation> = {
	customGet: { method: "get", path: "/body-parser-items/custom/summary", url: `${ITEMS}/custom/summary` },
	delete: { method: "delete", path: ITEM, url: `${ITEMS}/item-missing` },
	get: { method: "get", path: ITEM, url: `${ITEMS}/item-1` },
	getList: { method: "get", path: ITEMS, url: `${ITEMS}?limit=10&page=1` },
	patch: { method: "patch", path: ITEM, url: `${ITEMS}/item-1` },
	post: { method: "post", path: ITEMS, url: ITEMS },
	put: { method: "put", path: ITEM, url: `${ITEMS}/item-1` },
};

// Over both default body limits: 1 MiB in Fastify, 100 kB in Express
const OVERSIZED_BODY: string = JSON.stringify({ name: "x".repeat(1_100_000) });

const BODY_CASES: Record<TBodyCaseName, IBodyCase> = {
	malformedJson: { body: "{bad", headers: { "content-type": "application/json" } },
	noBody: { headers: {} },
	oversizedBody: { body: OVERSIZED_BODY, headers: { "content-type": "application/json" } },
	unsupportedCharset: { body: "{}", headers: { "content-type": "application/json; charset=latin1" } },
	unsupportedContentEncoding: { body: "{}", headers: { "content-encoding": "x-unknown", "content-type": "application/json" } },
	unsupportedContentType: { body: "<item/>", headers: { "content-type": "text/xml" } },
};

// A DELETE targets a missing row, so reaching the handler answers 404. POST and PUT send no valid body, so reaching their DTO validation answers 400
const REACHES_ROUTE: Record<TOperationName, number> = { customGet: HttpStatus.OK, delete: HttpStatus.NOT_FOUND, get: HttpStatus.OK, getList: HttpStatus.OK, patch: HttpStatus.OK, post: HttpStatus.BAD_REQUEST, put: HttpStatus.BAD_REQUEST };

const refusedBy = (status: number): Record<TOperationName, number> => ({ customGet: status, delete: status, get: status, getList: status, patch: status, post: status, put: status });

// Fastify never parses the body of a GET, Express parses a body on any method
const fastifyRefusedBy = (status: number): Record<TOperationName, number> => ({ ...REACHES_ROUTE, delete: status, patch: status, post: status, put: status });

const EXPECTED_STATUSES: Record<TAdapterName, Record<TBodyCaseName, Record<TOperationName, number>>> = {
	express: {
		malformedJson: refusedBy(HttpStatus.BAD_REQUEST),
		noBody: REACHES_ROUTE,
		oversizedBody: refusedBy(HttpStatus.PAYLOAD_TOO_LARGE),
		unsupportedCharset: refusedBy(HttpStatus.UNSUPPORTED_MEDIA_TYPE),
		unsupportedContentEncoding: refusedBy(HttpStatus.UNSUPPORTED_MEDIA_TYPE),
		// Express ignores a body of a type it has no parser for
		unsupportedContentType: REACHES_ROUTE,
	},
	fastify: {
		malformedJson: fastifyRefusedBy(HttpStatus.BAD_REQUEST),
		noBody: REACHES_ROUTE,
		oversizedBody: fastifyRefusedBy(HttpStatus.PAYLOAD_TOO_LARGE),
		// Fastify reads neither the charset nor the content encoding of a JSON body
		unsupportedCharset: REACHES_ROUTE,
		unsupportedContentEncoding: REACHES_ROUTE,
		unsupportedContentType: fastifyRefusedBy(HttpStatus.UNSUPPORTED_MEDIA_TYPE),
	},
};

// Express answers 500 on a custom route the body parser lets through until bugfix/custom-route-express-query merges. The table holds the correct status, so these cases fail once the fix lands and the marker goes
const EXPRESS_KNOWN_BUG_CASES: ReadonlyArray<[TBodyCaseName, TOperationName]> = [
	["noBody", "customGet"],
	["unsupportedContentType", "customGet"],
];

const ADAPTERS: Array<[TAdapterName, () => ExpressAdapter | FastifyAdapter]> = [
	["fastify", (): FastifyAdapter => new FastifyAdapter()],
	["express", (): ExpressAdapter => new ExpressAdapter()],
];

const EXCEPTION_FILTER_MODES: Array<[string, (application: INestApplication) => Array<ExceptionFilter>]> = [
	["without an exception filter", (): Array<ExceptionFilter> => []],
	["with CorrelationIDResponseBodyExceptionFilter", (application: INestApplication): Array<ExceptionFilter> => [new CorrelationIDResponseBodyExceptionFilter(application.get(HttpAdapterHost))]],
];

const TABLE_CASES: Array<[TBodyCaseName, TOperationName]> = (Object.keys(BODY_CASES) as Array<TBodyCaseName>).flatMap((bodyCaseName: TBodyCaseName): Array<[TBodyCaseName, TOperationName]> => (Object.keys(OPERATIONS) as Array<TOperationName>).map((operationName: TOperationName): [TBodyCaseName, TOperationName] => [bodyCaseName, operationName]));

/**
 * Checks whether a table case is the known Express custom route failure.
 * @param {TAdapterName} adapterName - Adapter under test.
 * @param {TBodyCaseName} bodyCaseName - Body case.
 * @param {TOperationName} operationName - Operation.
 * @returns {boolean} Whether the case is expected to fail until the fix merges.
 */
function isKnownBug(adapterName: TAdapterName, bodyCaseName: TBodyCaseName, operationName: TOperationName): boolean {
	return adapterName === "express" && EXPRESS_KNOWN_BUG_CASES.some(([knownBodyCase, knownOperation]: [TBodyCaseName, TOperationName]): boolean => knownBodyCase === bodyCaseName && knownOperation === operationName);
}

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
		const outgoing = request({ headers: bodyCase.body === undefined ? bodyCase.headers : { ...bodyCase.headers, "content-length": String(Buffer.byteLength(bodyCase.body)) }, hostname: target.hostname, method: method.toUpperCase(), path: `${target.pathname}${target.search}`, port: target.port }, (incoming: IncomingMessage) => {
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

			const fastify: { inject: (options: { headers: Record<string, string>; method: string; payload?: string; url: string }) => Promise<{ body: string; statusCode: number }> } = app.getHttpAdapter().getInstance();
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

		const expectTableStatus = async (bodyCaseName: TBodyCaseName, operationName: TOperationName): Promise<void> => {
			const operation: IOperation = OPERATIONS[operationName];
			const answer: IWireAnswer = await send(operation, BODY_CASES[bodyCaseName]);

			expect(answer.status, JSON.stringify(answer.body)).toBe(EXPECTED_STATUSES[adapterName][bodyCaseName][operationName]);

			if (answer.status < HttpStatus.BAD_REQUEST) {
				return;
			}

			const response: { content?: Record<string, { schema?: { $ref?: string } }> } | undefined = document.paths[operation.path]?.[operation.method]?.responses[String(answer.status)] as { content?: Record<string, { schema?: { $ref?: string } }> } | undefined;

			expect(response, JSON.stringify(answer.body)).toBeDefined();
			const validate = ajv.getSchema(`openapi${response?.content?.["application/json"]?.schema?.$ref ?? ""}`);

			expect(validate).toBeDefined();
			validate?.(answer.body);

			expect(validate?.errors ?? null, JSON.stringify(answer.body)).toBeNull();
		};

		it.each(TABLE_CASES.filter(([bodyCaseName, operationName]: [TBodyCaseName, TOperationName]): boolean => !isKnownBug(adapterName, bodyCaseName, operationName)))("answers %s on %s with the exact status of the table", async (bodyCaseName: TBodyCaseName, operationName: TOperationName) => {
			await expectTableStatus(bodyCaseName, operationName);
		});

		it.fails.each(TABLE_CASES.filter(([bodyCaseName, operationName]: [TBodyCaseName, TOperationName]): boolean => isKnownBug(adapterName, bodyCaseName, operationName)))("answers %s on %s with the exact status of the table", async (bodyCaseName: TBodyCaseName, operationName: TOperationName) => {
			await expectTableStatus(bodyCaseName, operationName);
		});
	});
});
