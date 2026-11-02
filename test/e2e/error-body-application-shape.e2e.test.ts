import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";

import { BadRequestException, Body, Controller, Get, HttpException, HttpStatus, NotFoundException, Post, UseGuards, ValidationPipe } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { IsString } from "class-validator";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { CorrelationIDResponseBodyExceptionFilter, CorrelationIDResponseBodyInterceptor } from "../../src";

const CODES_ONLY_BODY: Record<string, string> = { code: "X" };
const CORRELATION_FIELDS: Record<string, unknown> = { correlationID: expect.any(String), timestamp: expect.any(Number) };

class CodesOnlyGuard {
	public canActivate(): boolean {
		throw new BadRequestException(CODES_ONLY_BODY);
	}
}

class CodesOnlyDto {
	@IsString()
	public name!: string;
}

@Controller("shape")
class ErrorBodyShapeController {
	@Get("array")
	public array(): never {
		throw new HttpException(["first", "second"], HttpStatus.BAD_REQUEST);
	}

	@Post("codes-only/pipe")
	public codesOnlyPipe(@Body() _body: CodesOnlyDto): void {}

	@Get("codes-only/guard")
	@UseGuards(CodesOnlyGuard)
	public codesOnlyGuard(): void {}

	@Get("codes-only/handler")
	public codesOnlyHandler(): never {
		throw new BadRequestException(CODES_ONLY_BODY);
	}

	@Get("http-error/exposed")
	public httpErrorExposed(): never {
		throw Object.assign(new Error("Customer is gone"), { expose: true, statusCode: HttpStatus.NOT_FOUND });
	}

	@Get("http-error/hidden")
	public httpErrorHidden(): never {
		throw Object.assign(new Error("No such customer: cus_123"), { statusCode: HttpStatus.NOT_FOUND });
	}

	@Get("not-found")
	public notFound(): never {
		throw new NotFoundException();
	}

	@Get("string")
	public string(): never {
		throw new HttpException("text", HttpStatus.CONFLICT);
	}

	@Get("unknown")
	public unknown(): never {
		throw new Error("secret");
	}

	@Get("wrong-types")
	public wrongTypes(): never {
		throw new HttpException({ code: "X", error: 5, message: null, statusCode: 999 }, HttpStatus.BAD_REQUEST);
	}
}

const ADAPTERS: Array<[string, () => ExpressAdapter | FastifyAdapter]> = [
	["fastify", () => new FastifyAdapter()],
	["express", () => new ExpressAdapter()],
];

describe.each(ADAPTERS)("error body shape on %s (E2E)", (_adapterName: string, createAdapter: () => ExpressAdapter | FastifyAdapter) => {
	describe.each([
		["without the filter", false],
		["with the filter", true],
	])("%s", (_setupName: string, hasFilter: boolean) => {
		let app: INestApplication;
		let baseUrl: string;

		const answer = async (path: string, method: string = "GET", body?: unknown): Promise<{ body: unknown; status: number }> => {
			const response: Response = await fetch(`${baseUrl}/shape/${path}`, { ...(body === undefined ? {} : { body: JSON.stringify(body), headers: { "content-type": "application/json" } }), method });

			return { body: await response.json(), status: response.status };
		};

		beforeAll(async () => {
			const moduleReference = await Test.createTestingModule({ controllers: [ErrorBodyShapeController] }).compile();

			app = moduleReference.createNestApplication(createAdapter(), { logger: false });
			app.useGlobalPipes(new ValidationPipe({ exceptionFactory: (): BadRequestException => new BadRequestException(CODES_ONLY_BODY) }));
			app.useGlobalInterceptors(new CorrelationIDResponseBodyInterceptor());

			if (hasFilter) {
				app.useGlobalFilters(new CorrelationIDResponseBodyExceptionFilter(app.get(HttpAdapterHost)));
			}

			await app.listen(0, "127.0.0.1");
			baseUrl = (await app.getUrl()).replace("[::1]", "127.0.0.1");
		}, 60_000);

		afterAll(async () => {
			await app?.close();
		});

		it("keeps a codes-only body from a handler", async () => {
			expect(await answer("codes-only/handler")).toEqual({ body: { ...CODES_ONLY_BODY, ...CORRELATION_FIELDS, statusCode: HttpStatus.BAD_REQUEST }, status: HttpStatus.BAD_REQUEST });
		});

		it("keeps a codes-only body from a pipe exception factory", async () => {
			expect(await answer("codes-only/pipe", "POST", {})).toEqual({ body: { ...CODES_ONLY_BODY, ...CORRELATION_FIELDS, statusCode: HttpStatus.BAD_REQUEST }, status: HttpStatus.BAD_REQUEST });
		});

		it("keeps a codes-only body from a guard", async () => {
			// A guard answers before the interceptor, so only the filter adds the contract fields
			expect(await answer("codes-only/guard")).toEqual({ body: hasFilter ? { ...CODES_ONLY_BODY, ...CORRELATION_FIELDS, statusCode: HttpStatus.BAD_REQUEST } : CODES_ONLY_BODY, status: HttpStatus.BAD_REQUEST });
		});

		it("keeps what Nest built for an exception without arguments", async () => {
			expect(await answer("not-found")).toEqual({ body: { ...CORRELATION_FIELDS, message: "Not Found", statusCode: HttpStatus.NOT_FOUND }, status: HttpStatus.NOT_FOUND });
		});

		it("replaces a present field of the wrong type and corrects statusCode", async () => {
			expect(await answer("wrong-types")).toEqual({ body: { ...CORRELATION_FIELDS, code: "X", error: "Bad Request", message: "Bad Request", statusCode: HttpStatus.BAD_REQUEST }, status: HttpStatus.BAD_REQUEST });
		});

		it("turns a string response into message and error", async () => {
			expect(await answer("string")).toEqual({ body: { ...CORRELATION_FIELDS, error: "Conflict", message: "text", statusCode: HttpStatus.CONFLICT }, status: HttpStatus.CONFLICT });
		});

		it("turns an array response into message and error", async () => {
			expect(await answer("array")).toEqual({ body: { ...CORRELATION_FIELDS, error: "Bad Request", message: ["first", "second"], statusCode: HttpStatus.BAD_REQUEST }, status: HttpStatus.BAD_REQUEST });
		});

		it("answers an exposed http-errors value with its message and the status text", async () => {
			expect(await answer("http-error/exposed")).toEqual({ body: { ...CORRELATION_FIELDS, error: "Not Found", message: "Customer is gone", statusCode: HttpStatus.NOT_FOUND }, status: HttpStatus.NOT_FOUND });
		});

		it("answers a hidden http-errors value with the status text in both fields", async () => {
			expect(await answer("http-error/hidden")).toEqual({ body: { ...CORRELATION_FIELDS, error: "Not Found", message: "Not Found", statusCode: HttpStatus.NOT_FOUND }, status: HttpStatus.NOT_FOUND });
		});

		it("answers an unknown failure with the sanitized message and the status text", async () => {
			expect(await answer("unknown")).toEqual({ body: { ...CORRELATION_FIELDS, error: "Internal Server Error", message: "Internal server error", statusCode: HttpStatus.INTERNAL_SERVER_ERROR }, status: HttpStatus.INTERNAL_SERVER_ERROR });
		});
	});
});
