import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { Repository } from "typeorm";

import fastifyMultipart from "@fastify/multipart";
import { Body, Controller, HttpStatus, Inject, Injectable, RequestMethod, ValidationPipe } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { classToPlain, plainToInstance } from "class-transformer";
import { IsObject, IsOptional } from "class-validator";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiMethod, ApiPropertyDescribe, ApiRouteCustom, ApiService, ApiServiceBase, EApiPropertyDescribeType, EApiPropertyStringType } from "../../src/index";

const KEYS_MESSAGE: string = "request body must not hold an object with more than 1000 keys";
const ONE_MEBIBYTE: number = 1_048_576;
const FORM_CONTENT_TYPE: string = "application/x-www-form-urlencoded";

interface IE2eParserResponse {
	body: Record<string, unknown>;
	status: number;
}

class E2eParserResponseDto {}

class E2eParserBodyDto {
	@IsObject()
	@IsOptional()
	public payload?: Record<string, unknown>;
}

@Entity("e2e_body_shape_parser_rows")
class E2eParserEntity {
	@ApiPropertyDescribe({ description: "bodyShapeParserRowId", type: EApiPropertyDescribeType.UUID })
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@ApiPropertyDescribe({ description: "bodyShapeParserRowName", exampleValue: "row", format: EApiPropertyStringType.STRING, maxLength: 10, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	@Column({ type: "varchar" })
	public name!: string;
}

@Injectable()
@ApiService({ entity: E2eParserEntity })
class E2eParserService extends ApiServiceBase<E2eParserEntity> {
	@InjectRepository(E2eParserEntity)
	public readonly repository!: Repository<E2eParserEntity>;
}

@ApiController<E2eParserEntity>({
	entity: E2eParserEntity,
	name: "E2eBodyShapeParserRows",
	path: "body-shape-parser-rows",
	routes: {},
})
class E2eParserRowController {
	public constructor(@Inject(E2eParserService) public readonly service: E2eParserService) {}
}

@Controller("body-shape-parsers")
class E2eParserController {
	@ApiRouteCustom<E2eParserEntity>({
		resource: { action: "bodyShapeParsers.custom", entity: E2eParserEntity },
		response: { serialization: { isEnabled: false }, status: HttpStatus.OK, type: E2eParserResponseDto },
		route: { method: RequestMethod.POST, path: "custom" },
	})
	public custom(@Body() _body: E2eParserBodyDto): { isReached: boolean } {
		return { isReached: true };
	}

	// Composes through the same decorator with no route runtime, so it answers on both adapters.
	@ApiMethod<E2eParserEntity>({
		metadata: {
			documentation: { summary: "Counts the keys of the body" },
			resource: { action: "bodyShapeParsers.method", entity: E2eParserEntity },
			response: { status: HttpStatus.OK, type: E2eParserResponseDto },
			route: { method: RequestMethod.POST, path: "method" },
		},
	})
	public method(@Body() body: object): { keys: number } {
		return { keys: Object.keys(body).length };
	}
}

/**
 * Builds a form body of the given number of keys, with an optional prefix on every field.
 * @param {number} count - Keys in the body.
 * @param {string} prefix - Text in front of each field, such as `payload` to nest them on Express.
 * @returns {string} Form text.
 */
function formBody(count: number, prefix: string = ""): string {
	const parts: Array<string> = [];

	for (let index: number = 0; index < count; index += 1) {
		parts.push(prefix === "" ? `k${String(index)}=0` : `${prefix}[k${String(index)}]=0`);
	}

	return parts.join("&");
}

/**
 * Builds a form body that fills the bytes it is given.
 * @param {number} bytes - Size to fill.
 * @returns {string} Form text just under that size.
 */
function formBodyOfBytes(bytes: number): string {
	const alphabet: string = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	// Three key characters plus `=0&` take six bytes each.
	const count: number = Math.floor(bytes / 6) - 1;
	const parts: Array<string> = [];

	for (let index: number = 0; index < count; index += 1) {
		// eslint-disable-next-line @elsikora/typescript/no-magic-numbers
		parts.push(`${alphabet.charAt(Math.floor(index / 3844) % 62)}${alphabet.charAt(Math.floor(index / 62) % 62)}${alphabet.charAt(index % 62)}=0`);
	}

	return parts.join("&");
}

/**
 * Sends a request over a real socket and reads the answer.
 * @param {string} url - Absolute URL.
 * @param {string | FormData} body - Request body.
 * @param {string} [contentType] - Content type, left to `fetch` for a `FormData` body.
 * @returns {Promise<IE2eParserResponse>} Status and JSON body.
 */
async function post(url: string, body: FormData | string, contentType?: string): Promise<IE2eParserResponse> {
	const response: Response = await fetch(url, { body, headers: contentType === undefined ? {} : { "content-type": contentType }, method: "POST" });

	return { body: (await response.json()) as Record<string, unknown>, status: response.status };
}

/**
 * Builds a multipart body of plain text fields.
 * @param {number} count - Fields in the body.
 * @returns {FormData} Multipart form.
 */
function multipartBody(count: number): FormData {
	const form: FormData = new FormData();

	for (let index: number = 0; index < count; index += 1) {
		form.append(`f${String(index)}`, "v");
	}

	return form;
}

describe.each([{ adapterName: "Fastify" }, { adapterName: "Express" }])("request body shape limits on a form body through $adapterName (E2E)", ({ adapterName }: { adapterName: string }) => {
	const hostPipeTransform: ReturnType<typeof vi.fn> = vi.fn(plainToInstance);
	let app: INestApplication;
	let base: string;

	beforeAll(async () => {
		const moduleReference = await Test.createTestingModule({
			controllers: [E2eParserController, E2eParserRowController],
			imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [E2eParserEntity], logging: false, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature([E2eParserEntity]), ApiAuthorizationModule.forRoot()],
			providers: [{ provide: APP_PIPE, useValue: new ValidationPipe({ transform: true, transformerPackage: { classToPlain, plainToInstance: hostPipeTransform as typeof plainToInstance } }) }, E2eParserService],
		}).compile();

		if (adapterName === "Express") {
			const express: NestExpressApplication = moduleReference.createNestApplication<NestExpressApplication>(new ExpressAdapter(), { bodyParser: false, logger: false });
			// The parser's own default stops at 1000 parameters and 100 KiB, so the rule is only reached past them.
			express.useBodyParser("urlencoded", { extended: true, limit: ONE_MEBIBYTE, parameterLimit: ONE_MEBIBYTE });
			app = express;
		} else {
			app = moduleReference.createNestApplication(new FastifyAdapter(), { logger: false });
		}

		await app.listen(0, "127.0.0.1");
		base = await app.getUrl();
	});

	beforeEach(() => {
		hostPipeTransform.mockClear();
	});

	afterAll(async () => {
		await app.close();
	});

	it("passes a form body of 1000 keys", async () => {
		const response: IE2eParserResponse = await post(`${base}/body-shape-parsers/method`, formBody(1000), FORM_CONTENT_TYPE);

		expect(response.status).toBe(HttpStatus.OK);
		expect(response.body).toEqual({ keys: 1000 });
	});

	it.each([
		{ route: "ApiMethod", url: "/body-shape-parsers/method" },
		{ route: "ApiRouteCustom", url: "/body-shape-parsers/custom" },
		{ route: "generated CREATE", url: "/body-shape-parser-rows" },
	])("refuses a form body of 1001 keys on $route before any transformer", async ({ url }: { url: string }) => {
		const response: IE2eParserResponse = await post(`${base}${url}`, formBody(1001), FORM_CONTENT_TYPE);

		expect(response.status).toBe(HttpStatus.BAD_REQUEST);
		expect(response.body.message).toEqual([KEYS_MESSAGE]);
		expect(hostPipeTransform).not.toHaveBeenCalled();
	});

	it("refuses a wide 1 MiB form body before any transformer", async () => {
		const response: IE2eParserResponse = await post(`${base}/body-shape-parsers/method`, formBodyOfBytes(ONE_MEBIBYTE - 1), FORM_CONTENT_TYPE);

		expect(response.status).toBe(HttpStatus.BAD_REQUEST);
		expect(response.body.message).toEqual([KEYS_MESSAGE]);
		expect(hostPipeTransform).not.toHaveBeenCalled();
	});

	it("counts the keys of an object nested in a form body where the parser builds one", async () => {
		const response: IE2eParserResponse = await post(`${base}/body-shape-parsers/method`, formBody(1001, "payload"), FORM_CONTENT_TYPE);

		// `fast-querystring` is flat, so on Fastify these are 1001 top-level keys. Both answers are the same.
		expect(response.status).toBe(HttpStatus.BAD_REQUEST);
		expect(response.body.message).toEqual([KEYS_MESSAGE]);
	});
});

describe("request body shape limits on a multipart body with attachFieldsToBody (E2E)", () => {
	let app: INestApplication;
	let base: string;

	beforeAll(async () => {
		const moduleReference = await Test.createTestingModule({
			controllers: [E2eParserController],
			imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [E2eParserEntity], logging: false, synchronize: true, type: "better-sqlite3" }), ApiAuthorizationModule.forRoot()],
		}).compile();
		const adapter: FastifyAdapter = new FastifyAdapter();

		// The plugin's own default stops at 1000 parts with a 413, so the rule is only reached past it.
		await adapter.register(fastifyMultipart as unknown as Parameters<FastifyAdapter["register"]>[0], { attachFieldsToBody: true, limits: { fields: 2000, parts: 2000 } });
		app = moduleReference.createNestApplication(adapter, { logger: false });
		await app.listen(0, "127.0.0.1");
		base = await app.getUrl();
	});

	afterAll(async () => {
		await app.close();
	});

	// Every field points back at the body through `fields`, so a walk by path doubles on each level.
	it.each([1, 2, 8, 1000])("passes %i fields whose values point back at the body", async (count: number) => {
		const response: IE2eParserResponse = await post(`${base}/body-shape-parsers/method`, multipartBody(count));

		expect(response.status).toBe(HttpStatus.OK);
		expect(response.body).toEqual({ keys: count });
	});

	it("refuses 1001 fields", async () => {
		const response: IE2eParserResponse = await post(`${base}/body-shape-parsers/method`, multipartBody(1001));

		expect(response.status).toBe(HttpStatus.BAD_REQUEST);
		expect(response.body.message).toEqual([KEYS_MESSAGE]);
	});
});
