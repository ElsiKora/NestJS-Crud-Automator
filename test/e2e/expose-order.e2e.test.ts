import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";

import { Body, ClassSerializerInterceptor, Controller, HttpCode, HttpStatus, Post, UseInterceptors, ValidationPipe } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { Expose } from "class-transformer";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiPropertyString, EApiPropertyStringType } from "../../src/index";

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

describe("@Expose name and decorator order (E2E)", () => {
	let app: INestApplication | undefined;
	let fastify: { inject: (options: { method: string; payload?: unknown; url: string }) => Promise<{ json: () => { message?: unknown }; statusCode: number }> };

	beforeAll(async () => {
		const moduleReference = await Test.createTestingModule({
			controllers: [E2eExposeOrderController],
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
	});
});
