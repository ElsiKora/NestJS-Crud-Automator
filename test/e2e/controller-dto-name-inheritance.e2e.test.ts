import "reflect-metadata";

import type { INestApplication, Type } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";

import { HttpStatus } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../src/index";
import { E2eDtoNameItemEntity, E2eDtoNameItemService } from "./controller-dto-names";
import { E2eDtoNameAnonymousMixinController, E2eDtoNameChildCrudController, E2eDtoNameLoggedKaController, E2eDtoNameLoggedKbController } from "./controller-dto-names/inheritance";

const RUNTIME_SCHEMA_PREFIXES: Array<string> = vi.hoisted((): Array<string> => []);

vi.mock("@utility/api/controller/get/dto.utility", async (importOriginal: () => Promise<typeof import("@utility/api/controller/get/dto.utility")>) => {
	const original: typeof import("@utility/api/controller/get/dto.utility") = await importOriginal();

	return {
		...original,
		ApiControllerGetResponseDto: (...arguments_: Parameters<typeof original.ApiControllerGetResponseDto>): ReturnType<typeof original.ApiControllerGetResponseDto> => {
			RUNTIME_SCHEMA_PREFIXES.push(arguments_[4]);

			return original.ApiControllerGetResponseDto(...arguments_);
		},
	};
});

interface ISchema {
	$ref?: string;
	properties?: Record<string, ISchema>;
}

interface IInheritanceApp {
	app: INestApplication;
	document: OpenAPIObject;
	inject: (url: string) => Promise<{ fields: Array<string>; statusCode: number }>;
}

/**
 * Starts an application with the given controllers and one stored item.
 * @param {Array<Type<unknown>>} controllers - Controller classes to register.
 * @returns {Promise<IInheritanceApp>} The application, its OpenAPI document and a GET helper.
 */
async function startApp(controllers: Array<Type<unknown>>): Promise<IInheritanceApp> {
	const moduleReference = await Test.createTestingModule({
		controllers,
		imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [E2eDtoNameItemEntity], logging: false, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature([E2eDtoNameItemEntity]), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
		providers: [E2eDtoNameItemService],
	}).compile();
	const app: INestApplication = moduleReference.createNestApplication(new FastifyAdapter());

	await app.init();
	await app.get(E2eDtoNameItemService).repository.save({ id: "item-1", name: "Item", secret: "Secret" });

	const fastify: { inject: (options: { method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }> } = app.getHttpAdapter().getInstance();

	return {
		app,
		document: SwaggerModule.createDocument(app, new DocumentBuilder().build()),
		inject: async (url: string): Promise<{ fields: Array<string>; statusCode: number }> => {
			const response = await fastify.inject({ method: "GET", url });

			return { fields: Object.keys(response.json() as Record<string, unknown>).sort(), statusCode: response.statusCode };
		},
	};
}

/**
 * Resolves the GET response component of a path.
 * @param {OpenAPIObject} document - OpenAPI document.
 * @param {string} path - Documented path.
 * @returns {{ fields: Array<string>; name: string }} The component name and its property names.
 */
function getResponseComponent(document: OpenAPIObject, path: string): { fields: Array<string>; name: string } {
	const reference: string = String((document.paths[path]?.get?.responses[String(HttpStatus.OK)] as { content?: Record<string, { schema?: ISchema }> } | undefined)?.content?.["application/json"]?.schema?.$ref);
	const name: string = reference.replace("#/components/schemas/", "");

	return { fields: Object.keys((document.components?.schemas?.[name] as ISchema | undefined)?.properties ?? {}).sort(), name };
}

describe("generated routes on a controller subclass (E2E)", () => {
	describe("an anonymous mixin over a decorated controller", () => {
		let started: IInheritanceApp | undefined;

		beforeAll(async () => {
			started = await startApp([E2eDtoNameAnonymousMixinController]);
		});

		afterAll(async () => {
			await started?.app.close();
		});

		it("serves the generated GET route with the decorated controller's DTOs", async () => {
			const response: { fields: Array<string>; statusCode: number } = await (started as IInheritanceApp).inject("/mixin/dto-name-items/item-1");

			expect(response.statusCode).toBe(HttpStatus.OK);
			expect(getResponseComponent((started as IInheritanceApp).document, "/mixin/dto-name-items/{id}")).toEqual({ fields: response.fields, name: "E2eDtoNameMixinBaseGetResponseDTO" });
		});
	});

	describe("one named mixin over two decorated controllers", () => {
		let started: IInheritanceApp | undefined;

		beforeAll(async () => {
			started = await startApp([E2eDtoNameLoggedKaController, E2eDtoNameLoggedKbController]);
		});

		afterAll(async () => {
			await started?.app.close();
		});

		it.each([
			["/ka/dto-name-items", "E2eDtoNameKaGetResponseDTO", ["id", "name", "secret"]],
			["/kb/dto-name-items", "E2eDtoNameKbGetResponseDTO", ["id", "name"]],
		])("serves %s with its own decorated controller's DTOs", async (path: string, componentName: string, expectedFields: Array<string>) => {
			const response: { fields: Array<string>; statusCode: number } = await (started as IInheritanceApp).inject(`${path}/item-1`);

			expect(response.statusCode).toBe(HttpStatus.OK);
			expect(response.fields).toEqual(expectedFields);
			expect(getResponseComponent((started as IInheritanceApp).document, `${path}/{id}`)).toEqual({ fields: expectedFields, name: componentName });
		});
	});

	describe("a subclass of a decorated controller", () => {
		let started: IInheritanceApp | undefined;

		beforeAll(async () => {
			started = await startApp([E2eDtoNameChildCrudController]);
		});

		afterAll(async () => {
			await started?.app.close();
		});

		it("serializes the response with the DTO that the document shows, named after the decorated class", async () => {
			RUNTIME_SCHEMA_PREFIXES.length = 0;

			const response: { fields: Array<string>; statusCode: number } = await (started as IInheritanceApp).inject("/base-crud/dto-name-items/item-1");

			expect(response.statusCode).toBe(HttpStatus.OK);
			expect(RUNTIME_SCHEMA_PREFIXES).toEqual(["E2eDtoNameBaseCrud"]);
			expect(getResponseComponent((started as IInheritanceApp).document, "/base-crud/dto-name-items/{id}")).toEqual({ fields: response.fields, name: "E2eDtoNameBaseCrudGetResponseDTO" });
		});
	});
});
