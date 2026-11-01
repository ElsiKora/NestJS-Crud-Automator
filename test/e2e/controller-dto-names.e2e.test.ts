import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";

import { HttpStatus } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../src/index";
import { E2eDtoNameAdminItemController, E2eDtoNameItemEntity, E2eDtoNameItemService, E2eDtoNamePublicItemController } from "./controller-dto-names";

interface ISchema {
	$ref?: string;
	allOf?: Array<ISchema>;
	items?: ISchema;
	properties?: Record<string, ISchema>;
}

describe("generated DTO names with two controllers on one entity (E2E)", () => {
	let app: INestApplication | undefined;
	let document: OpenAPIObject;
	let fastify: {
		inject: (options: { method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }>;
	};

	const resolveSchema = (schema: ISchema | undefined): ISchema => {
		if (!schema) {
			return {};
		}

		if (schema.$ref) {
			return resolveSchema(document.components?.schemas?.[schema.$ref.replace("#/components/schemas/", "")] as ISchema | undefined);
		}

		if (schema.allOf?.length === 1) {
			return resolveSchema(schema.allOf[0]);
		}

		return schema;
	};

	const getResponseSchema = (path: string): { name: string; schema: ISchema } => {
		const reference: string | undefined = (document.paths[path]?.get?.responses[String(HttpStatus.OK)] as { content?: Record<string, { schema?: ISchema }> } | undefined)?.content?.["application/json"]?.schema?.$ref;

		return { name: String(reference?.replace("#/components/schemas/", "")), schema: resolveSchema({ $ref: reference }) };
	};

	const getPropertyNames = (schema: ISchema): Array<string> => Object.keys(schema.properties ?? {}).sort();

	beforeAll(async () => {
		const moduleReference = await Test.createTestingModule({
			controllers: [E2eDtoNameAdminItemController, E2eDtoNamePublicItemController],
			imports: [
				TypeOrmModule.forRoot({
					database: ":memory:",
					dropSchema: true,
					entities: [E2eDtoNameItemEntity],
					logging: false,
					synchronize: true,
					type: "better-sqlite3",
				}),
				TypeOrmModule.forFeature([E2eDtoNameItemEntity]),
				ApiAuthorizationModule.forRoot(),
				ApiSubscriberModule,
			],
			providers: [E2eDtoNameItemService],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
		fastify = app.getHttpAdapter().getInstance();
		await app.get(E2eDtoNameItemService).repository.save({ id: "item-1", name: "Item", secret: "Secret" });
	});

	afterAll(async () => {
		await app?.close();
	});

	it.each([
		["/admin/dto-name-items/{id}", "/admin/dto-name-items/item-1", ["id", "name", "secret"]],
		["/public/dto-name-items/{id}", "/public/dto-name-items/item-1", ["id", "name"]],
	])("documents the GET response of %s as the shape it sends", async (documentPath: string, url: string, expectedFields: Array<string>) => {
		const response = await fastify.inject({ method: "GET", url });
		const wireFields: Array<string> = Object.keys(response.json() as Record<string, unknown>).sort();

		expect(response.statusCode).toBe(HttpStatus.OK);
		expect(wireFields).toEqual(expectedFields);
		expect(getPropertyNames(getResponseSchema(documentPath).schema)).toEqual(wireFields);
	});

	it.each([
		["/admin/dto-name-items", ["id", "name", "secret"]],
		["/public/dto-name-items", ["id", "name"]],
	])("documents the GET_LIST items of %s as the shape it sends", async (path: string, expectedFields: Array<string>) => {
		const response = await fastify.inject({ method: "GET", url: `${path}?limit=10&page=1` });
		const items: Array<Record<string, unknown>> = (response.json() as { items: Array<Record<string, unknown>> }).items;
		const wireFields: Array<string> = Object.keys(items[0] ?? {}).sort();
		const listSchema: ISchema = getResponseSchema(path).schema;

		expect(response.statusCode).toBe(HttpStatus.OK);
		expect(wireFields).toEqual(expectedFields);
		expect(getPropertyNames(resolveSchema(listSchema.properties?.items?.items))).toEqual(wireFields);
	});

	it("gives each controller its own response component names", () => {
		const names: Array<string> = ["/admin/dto-name-items/{id}", "/public/dto-name-items/{id}", "/admin/dto-name-items", "/public/dto-name-items"].map((path: string): string => getResponseSchema(path).name);

		expect(names).toEqual(["E2eDtoNameAdminItemControllerE2eDtoNameItemEntityGetResponseDTO", "E2eDtoNamePublicItemControllerE2eDtoNameItemEntityGetResponseDTO", "E2eDtoNameAdminItemControllerE2eDtoNameItemEntityGetListResponseItemsDTO", "E2eDtoNamePublicItemControllerE2eDtoNameItemEntityGetListResponseItemsDTO"]);
	});
});
