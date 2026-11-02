import "reflect-metadata";

import type { AbstractHttpAdapter } from "@nestjs/core";
import type { ArgumentsHost, CanActivate, ExceptionFilter, INestApplication } from "@nestjs/common";
import type { ValidationError as IValidationError } from "class-validator";

import { BadRequestException, Body, Catch, Controller, HttpStatus, Injectable, RequestMethod, UseGuards } from "@nestjs/common";
import { APP_INTERCEPTOR, BaseExceptionFilter, HttpAdapterHost } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { ValidationError } from "class-validator";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiMethod, ApiPropertyDescribe, ApiRequestValidationException, ApiRequestValidationGetErrors, ApiRouteCustom, CorrelationIDNormalizeException, CorrelationIDResponseBodyInterceptor, EApiPropertyDescribeType } from "../../src/index";

const DEPTH_MESSAGE: string = "request body must not nest more than 64 levels deep";
const KEYS_MESSAGE: string = "request body must not hold an object with more than 1000 keys";
const GUARD_MESSAGE: string = "guard refused the request";
const CLIENT_CORRELATION_ID: string = "client-correlation-id";
const VALIDATION_CODE: string = "VALIDATION_FAILED";
const JSON_CONTENT_TYPE: string = "application/json";

interface IE2eExceptionResponse {
	body: Record<string, unknown>;
	correlationId: null | string;
	status: number;
}

class E2eExceptionEntity {
	@ApiPropertyDescribe({ description: "requestValidationExceptionId", type: EApiPropertyDescribeType.UUID })
	public id!: string;
}

class E2eExceptionResponseDto {}

const seenErrors: { value?: Array<IValidationError> } = {};

@Injectable()
class E2eExceptionThrowingGuard implements CanActivate {
	public canActivate(): boolean {
		throw new ApiRequestValidationException([Object.assign(new ValidationError(), { children: [], constraints: { guardRefused: GUARD_MESSAGE }, property: "guarded" })]);
	}
}

@Controller("request-validation")
class E2eExceptionController {
	@ApiRouteCustom<E2eExceptionEntity>({
		resource: { action: "requestValidation.custom", entity: E2eExceptionEntity },
		response: { serialization: { isEnabled: false }, status: HttpStatus.OK, type: E2eExceptionResponseDto },
		route: { method: RequestMethod.POST, path: "custom" },
	})
	public custom(@Body() _body: object): { isReached: boolean } {
		return { isReached: true };
	}

	@ApiMethod<E2eExceptionEntity>({
		metadata: {
			documentation: { summary: "Answers a guard refusal" },
			resource: { action: "requestValidation.guarded", entity: E2eExceptionEntity },
			response: { status: HttpStatus.OK, type: E2eExceptionResponseDto },
			route: { method: RequestMethod.POST, path: "guarded" },
		},
	})
	@UseGuards(E2eExceptionThrowingGuard)
	public guarded(): { isReached: boolean } {
		return { isReached: true };
	}

	@ApiMethod<E2eExceptionEntity>({
		metadata: {
			documentation: { summary: "Reaches the handler" },
			resource: { action: "requestValidation.method", entity: E2eExceptionEntity },
			response: { status: HttpStatus.OK, type: E2eExceptionResponseDto },
			route: { method: RequestMethod.POST, path: "method" },
		},
	})
	public method(@Body() _body: object): { isReached: boolean } {
		return { isReached: true };
	}
}

// A host whose 400s are codes only: it answers on its own and keeps nothing of the correlation contract.
@Catch()
class E2eExceptionCodeFilter implements ExceptionFilter {
	public constructor(private readonly adapter: AbstractHttpAdapter) {}

	public catch(exception: unknown, host: ArgumentsHost): void {
		const errors: Array<IValidationError> | undefined = ApiRequestValidationGetErrors(exception);

		seenErrors.value = errors;
		this.adapter.reply(host.getArgByIndex(1), errors ? { code: VALIDATION_CODE } : { code: "OTHER" }, errors ? HttpStatus.BAD_REQUEST : HttpStatus.INTERNAL_SERVER_ERROR);
	}
}

// The recipe in the error-handling guide: translate, normalize, and let Nest answer.
@Catch()
class E2eExceptionRecipeFilter extends BaseExceptionFilter {
	public constructor(private readonly adapterHost: HttpAdapterHost) {
		super(adapterHost.httpAdapter);
	}

	public override catch(exception: unknown, host: ArgumentsHost): void {
		const errors: Array<IValidationError> | undefined = ApiRequestValidationGetErrors(exception);
		const translated: unknown = errors ? new BadRequestException({ code: VALIDATION_CODE, errors: errors.flatMap((error: IValidationError): Array<string> => Object.keys(error.constraints ?? {})) }) : exception;

		super.catch(CorrelationIDNormalizeException(translated, host, this.adapterHost), host);
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
		parts.push(`"k${String(index)}":0`);
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
 * Starts an application with the given filter and, when asked, the correlation interceptor.
 * @param {string} adapterName - Fastify or Express.
 * @param {boolean} hasCorrelation - Whether the correlation interceptor is registered.
 * @param {(host: HttpAdapterHost) => ExceptionFilter} [createFilter] - Builds the global filter.
 * @returns {Promise<INestApplication>} The listening application.
 */
async function startApplication(adapterName: string, hasCorrelation: boolean, createFilter?: (host: HttpAdapterHost) => ExceptionFilter): Promise<INestApplication> {
	const moduleReference = await Test.createTestingModule({
		controllers: [E2eExceptionController],
		imports: [ApiAuthorizationModule.forRoot()],
		providers: hasCorrelation ? [{ provide: APP_INTERCEPTOR, useClass: CorrelationIDResponseBodyInterceptor }] : [],
	}).compile();
	const app: INestApplication = moduleReference.createNestApplication(adapterName === "Express" ? new ExpressAdapter() : new FastifyAdapter(), { logger: false });

	if (createFilter) {
		app.useGlobalFilters(createFilter(app.get(HttpAdapterHost)));
	}

	await app.listen(0, "127.0.0.1");

	return app;
}

/**
 * Sends a JSON request over a real socket and reads the answer.
 * @param {string} url - Absolute URL.
 * @param {string} body - JSON text.
 * @param {string} [correlationId] - Client correlation ID.
 * @returns {Promise<IE2eExceptionResponse>} Status, body and the correlation response header.
 */
async function post(url: string, body: string, correlationId?: string): Promise<IE2eExceptionResponse> {
	const response: Response = await fetch(url, { body, headers: { "content-type": JSON_CONTENT_TYPE, ...(correlationId === undefined ? {} : { "x-correlation-id": correlationId }) }, method: "POST" });

	return { body: (await response.json()) as Record<string, unknown>, correlationId: response.headers.get("x-correlation-id"), status: response.status };
}

describe.each([{ adapterName: "Fastify" }, { adapterName: "Express" }])("ApiRequestValidationException through $adapterName (E2E)", ({ adapterName }: { adapterName: string }) => {
	describe.each([
		{ hasCorrelation: false, name: "thrown directly" },
		{ hasCorrelation: true, name: "wrapped by CorrelationIDResponseBodyInterceptor" },
	])("$name", ({ hasCorrelation }: { hasCorrelation: boolean }) => {
		describe("with a host filter that answers a code", () => {
			let app: INestApplication;
			let base: string;

			beforeAll(async () => {
				app = await startApplication(adapterName, hasCorrelation, (host: HttpAdapterHost): ExceptionFilter => new E2eExceptionCodeFilter(host.httpAdapter));
				base = await app.getUrl();
			});

			beforeEach(() => {
				seenErrors.value = undefined;
			});

			afterAll(async () => {
				await app.close();
			});

			it.each([
				{ route: "ApiMethod", url: "/request-validation/method" },
				{ route: "ApiRouteCustom", url: "/request-validation/custom" },
			])("answers only the code for a body that is too wide on $route", async ({ url }: { url: string }) => {
				const response: IE2eExceptionResponse = await post(`${base}${url}`, `{"payload":${wideObject(1001)}}`);

				expect(response.status).toBe(HttpStatus.BAD_REQUEST);
				expect(response.body).toEqual({ code: VALIDATION_CODE });
				expect(seenErrors.value).toEqual([{ children: [], constraints: { requestBodyMaximumKeys: KEYS_MESSAGE }, property: "payload" }]);
			});

			it("answers only the code for a body that is too deep, and gives the path", async () => {
				const response: IE2eExceptionResponse = await post(`${base}/request-validation/method`, nestedObjects(65));

				expect(response.status).toBe(HttpStatus.BAD_REQUEST);
				expect(response.body).toEqual({ code: VALIDATION_CODE });
				expect(seenErrors.value).toEqual([{ children: [], constraints: { requestBodyMaximumDepth: DEPTH_MESSAGE }, property: Array.from({ length: 64 }, (): string => "a").join(".") }]);
			});
		});

		describe("without a host filter", () => {
			let app: INestApplication;
			let base: string;

			beforeAll(async () => {
				app = await startApplication(adapterName, hasCorrelation);
				base = await app.getUrl();
			});

			afterAll(async () => {
				await app.close();
			});

			it("keeps the default body", async () => {
				const wide: IE2eExceptionResponse = await post(`${base}/request-validation/method`, `{"payload":${wideObject(1001)}}`);
				const deep: IE2eExceptionResponse = await post(`${base}/request-validation/method`, nestedObjects(65));
				const correlation: Record<string, unknown> = hasCorrelation ? { correlationID: expect.any(String), timestamp: expect.any(Number) } : {};

				expect(wide.status).toBe(HttpStatus.BAD_REQUEST);
				expect(wide.body).toEqual({ ...correlation, error: "Bad Request", message: [KEYS_MESSAGE], statusCode: HttpStatus.BAD_REQUEST });
				expect(deep.status).toBe(HttpStatus.BAD_REQUEST);
				expect(deep.body).toEqual({ ...correlation, error: "Bad Request", message: [DEPTH_MESSAGE], statusCode: HttpStatus.BAD_REQUEST });
			});
		});
	});

	describe("with the guide's translating filter and no CorrelationIDResponseBodyExceptionFilter", () => {
		let app: INestApplication;
		let base: string;

		beforeAll(async () => {
			app = await startApplication(adapterName, true, (host: HttpAdapterHost): ExceptionFilter => new E2eExceptionRecipeFilter(host));
			base = await app.getUrl();
		});

		afterAll(async () => {
			await app.close();
		});

		describe.each([
			{ clientId: CLIENT_CORRELATION_ID, name: "a client correlation ID" },
			{ clientId: undefined, name: "a generated correlation ID" },
		])("with $name", ({ clientId }: { clientId?: string }) => {
			it.each([
				{ constraint: "guardRefused", raiser: "a guard", url: "/request-validation/guarded" },
				{ constraint: "requestBodyMaximumKeys", raiser: "the interceptor chain", url: "/request-validation/method" },
			])("answers one key set when $raiser raises it, with the ID of the response header", async ({ constraint, url }: { constraint: string; url: string }) => {
				const response: IE2eExceptionResponse = await post(`${base}${url}`, `{"payload":${wideObject(1001)}}`, clientId);

				expect(response.status).toBe(HttpStatus.BAD_REQUEST);
				// `error` and `message` are what the correlation contract gives a body on this base.
				expect(response.body).toEqual({ code: VALIDATION_CODE, correlationID: response.correlationId, error: "Bad Request", errors: [constraint], message: "Bad Request", statusCode: HttpStatus.BAD_REQUEST, timestamp: expect.any(Number) });
				expect(response.correlationId).toEqual(clientId ?? expect.any(String));
			});
		});

		it("gives the contract to a failure that holds no validation errors", async () => {
			const response: Response = await fetch(`${base}/request-validation/absent`, { headers: { "x-correlation-id": CLIENT_CORRELATION_ID } });

			expect(response.status).toBe(HttpStatus.NOT_FOUND);
			expect(response.headers.get("x-correlation-id")).toBe(CLIENT_CORRELATION_ID);
			expect(await response.json()).toMatchObject({ correlationID: CLIENT_CORRELATION_ID, statusCode: HttpStatus.NOT_FOUND });
		});
	});
});
