import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";

import { Body, ClassSerializerInterceptor, Controller, HttpCode, HttpStatus, Post, RequestMethod, UseInterceptors, ValidationPipe } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { Exclude, Expose } from "class-transformer";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiControllerObservable, ApiPropertyString, ApiRouteCustom, EApiPropertyStringType } from "../../src/index";

class E2eExposeOrderEntity {}

const NAME_OPTIONS = { description: "displayName", entity: E2eExposeOrderEntity, exampleValue: "first", format: EApiPropertyStringType.STRING, isRequired: true, maxLength: 10, minLength: 1, pattern: "/^.+$/" } as const;

class E2eExposeAboveDto {
	@Expose({ name: "display_name" })
	@ApiPropertyString(NAME_OPTIONS)
	public displayName!: string;
}

class E2eExposeBelowDto {
	@ApiPropertyString(NAME_OPTIONS)
	@Expose({ name: "display_name" })
	public displayName!: string;
}

@Controller("expose-order")
@UseInterceptors(ClassSerializerInterceptor)
class E2eExposeOrderController {
	@HttpCode(HttpStatus.OK)
	@Post("above")
	public above(@Body() body: E2eExposeAboveDto): E2eExposeAboveDto {
		return body;
	}

	@HttpCode(HttpStatus.OK)
	@Post("below")
	public below(@Body() body: E2eExposeBelowDto): E2eExposeBelowDto {
		return body;
	}
}

class E2eExposeExcludedResponseDto {
	@ApiPropertyString({ ...NAME_OPTIONS, isRequired: undefined, isResponse: true })
	@Exclude()
	public hidden?: string;

	@ApiPropertyString({ ...NAME_OPTIONS, isRequired: undefined, isResponse: true })
	public plain?: string;
}

class E2eExposeNotExposedResponseDto {
	@ApiPropertyString({ ...NAME_OPTIONS, isExpose: false, isRequired: undefined, isResponse: true })
	public hidden?: string;

	@ApiPropertyString({ ...NAME_OPTIONS, isRequired: undefined, isResponse: true })
	public plain?: string;
}

class E2eExposeExcludedRequestDto {
	@ApiPropertyString({ ...NAME_OPTIONS, isRequired: false })
	@Exclude()
	public hidden?: string;

	@ApiPropertyString(NAME_OPTIONS)
	public plain!: string;
}

class E2eExposeNamedResponseDto {
	@ApiPropertyString({ ...NAME_OPTIONS, isRequired: undefined, isResponse: true })
	@Expose({ name: "display_name" })
	public displayName?: string;
}

class E2eExposeResponseOnlyExcludeDto {
	@ApiPropertyString(NAME_OPTIONS)
	@Exclude({ toPlainOnly: true })
	@Expose({ name: "display_name" })
	public displayName!: string;

	@ApiPropertyString(NAME_OPTIONS)
	public plain!: string;
}

@ApiControllerObservable()
@Controller("expose-exclude")
class E2eExposeExcludeController {
	@ApiRouteCustom<E2eExposeOrderEntity>({ resource: { action: "exposeExclude.excluded", entity: E2eExposeOrderEntity }, response: { serialization: { isEnabled: true }, status: HttpStatus.OK, type: E2eExposeExcludedResponseDto }, route: { method: RequestMethod.GET, path: "excluded" } })
	public excluded(): unknown {
		return { hidden: "secret", plain: "open" };
	}

	@ApiRouteCustom<E2eExposeOrderEntity>({ resource: { action: "exposeExclude.notExposed", entity: E2eExposeOrderEntity }, response: { serialization: { isEnabled: true }, status: HttpStatus.OK, type: E2eExposeNotExposedResponseDto }, route: { method: RequestMethod.GET, path: "not-exposed" } })
	public notExposed(): unknown {
		return { hidden: "secret", plain: "open" };
	}

	@ApiRouteCustom<E2eExposeOrderEntity>({ resource: { action: "exposeExclude.namedSource", entity: E2eExposeOrderEntity }, response: { serialization: { isEnabled: true }, status: HttpStatus.OK, type: E2eExposeNamedResponseDto }, route: { method: RequestMethod.GET, path: "named/exposed-key" } })
	public namedFromExposedKey(): unknown {
		return { display_name: "first" };
	}

	@ApiRouteCustom<E2eExposeOrderEntity>({ resource: { action: "exposeExclude.namedProperty", entity: E2eExposeOrderEntity }, response: { serialization: { isEnabled: true }, status: HttpStatus.OK, type: E2eExposeNamedResponseDto }, route: { method: RequestMethod.GET, path: "named/property-key" } })
	public namedFromPropertyKey(): unknown {
		return { displayName: "first" };
	}

	@HttpCode(HttpStatus.OK)
	@Post("request")
	public request(@Body() body: E2eExposeExcludedRequestDto): { hidden: string | null; plain: string } {
		return { hidden: body.hidden ?? null, plain: body.plain };
	}

	@HttpCode(HttpStatus.OK)
	@Post("response-only")
	public responseOnly(@Body() body: E2eExposeResponseOnlyExcludeDto): { displayName: string } {
		return { displayName: body.displayName };
	}

	@HttpCode(HttpStatus.OK)
	@Post("response-only/serialized")
	@UseInterceptors(ClassSerializerInterceptor)
	public responseOnlySerialized(@Body() body: E2eExposeResponseOnlyExcludeDto): E2eExposeResponseOnlyExcludeDto {
		return body;
	}
}

describe("@Expose name and decorator order (E2E)", () => {
	let app: INestApplication | undefined;
	let fastify: { inject: (options: { method: string; payload?: unknown; url: string }) => Promise<{ json: () => { message?: unknown }; statusCode: number }> };

	beforeAll(async () => {
		const moduleReference = await Test.createTestingModule({
			controllers: [E2eExposeExcludeController, E2eExposeOrderController],
			imports: [ApiAuthorizationModule.forRoot()],
			providers: [{ provide: APP_PIPE, useValue: new ValidationPipe({ transform: true, whitelist: true }) }],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		fastify = app.getHttpAdapter().getInstance();
	});

	afterAll(async () => {
		await app?.close();
	});

	it.each(["above", "below"])("reads and writes the wire name with @Expose %s the property decorator", async (order: string) => {
		const response = await fastify.inject({ method: "POST", payload: { display_name: "first" }, url: `/expose-order/${order}` });

		expect(response.statusCode).toBe(HttpStatus.OK);
		expect(response.json()).toEqual({ display_name: "first" });
	});

	it.each(["above", "below"])("does not read the property name with @Expose %s the property decorator", async (order: string) => {
		const response = await fastify.inject({ method: "POST", payload: { displayName: "first" }, url: `/expose-order/${order}` });

		expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
		expect(JSON.stringify(response.json().message)).toContain("displayName");
	});

	it("reads the property key from what a custom route handler returns and sends the exposed name without the interceptor", async () => {
		const response = await fastify.inject({ method: "GET", url: "/expose-exclude/named/property-key" });

		expect(response.statusCode).toBe(HttpStatus.OK);
		expect(response.json()).toEqual({ display_name: "first" });
	});

	it("answers an empty body to a custom route handler that returns only the exposed name without the interceptor", async () => {
		const response = await fastify.inject({ method: "GET", url: "/expose-exclude/named/exposed-key" });

		expect(response.statusCode).toBe(HttpStatus.OK);
		expect(response.json()).toEqual({});
	});

	it.each(["excluded", "not-exposed"])("leaves the %s property out of a custom route response without the interceptor", async (path: string) => {
		const response = await fastify.inject({ method: "GET", url: `/expose-exclude/${path}` });

		expect(response.statusCode).toBe(HttpStatus.OK);
		expect(response.json()).toEqual({ plain: "open" });
	});

	it("does not read an excluded property from a request body", async () => {
		const response = await fastify.inject({ method: "POST", payload: { hidden: "secret", plain: "open" }, url: "/expose-exclude/request" });

		expect(response.statusCode).toBe(HttpStatus.OK);
		expect(response.json()).toEqual({ hidden: null, plain: "open" });
	});

	it("reads a response-only exclude from its exposed name in a request body", async () => {
		const response = await fastify.inject({ method: "POST", payload: { display_name: "first", plain: "open" }, url: "/expose-exclude/response-only" });

		expect(response.statusCode).toBe(HttpStatus.OK);
		expect(response.json()).toEqual({ displayName: "first" });
	});

	it("leaves a response-only exclude out of a serialized response", async () => {
		const response = await fastify.inject({ method: "POST", payload: { display_name: "first", plain: "open" }, url: "/expose-exclude/response-only/serialized" });

		expect(response.statusCode).toBe(HttpStatus.OK);
		expect(response.json()).toEqual({ plain: "open" });
	});
});
