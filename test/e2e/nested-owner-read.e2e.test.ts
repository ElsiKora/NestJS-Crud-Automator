import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";

import { HttpStatus } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { E2eAppModule, E2eOwnerService, E2eService } from "./app";
import { E2E_OWNER_ID, E2E_OWNER_ID_OTHER } from "./app/constants";

describe("nested-owner generated read contract (E2E)", () => {
	let app: INestApplication | undefined;
	let document: OpenAPIObject;
	let ownerService: E2eOwnerService;
	let service: E2eService;
	let fastify: {
		inject: (options: { method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }>;
	};

	beforeAll(async () => {
		const moduleReference = await Test.createTestingModule({
			imports: [E2eAppModule],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
		ownerService = app.get(E2eOwnerService);
		service = app.get(E2eService);
		fastify = app.getHttpAdapter().getInstance();
	});

	beforeEach(async () => {
		await service.reset();
		await ownerService.reset();
		await ownerService.repository.save([
			{ id: E2E_OWNER_ID, name: "Owner" },
			{ id: E2E_OWNER_ID_OTHER, name: "Other Owner" },
		]);
		await service.repository.save([
			{ count: 5, id: "nested-owned-beta", name: "Beta", ownerId: E2E_OWNER_ID },
			{ count: 5, id: "nested-owned-alpha", name: "Alpha", ownerId: E2E_OWNER_ID },
			{ count: 1, id: "nested-owned-low", name: "Low", ownerId: E2E_OWNER_ID },
			{ count: 100, id: "nested-foreign", name: "Foreign", ownerId: E2E_OWNER_ID_OTHER },
		]);
	});

	afterAll(async () => {
		await app?.close();
	});

	it("scopes generated GET and GET_LIST to the inherited owner parameter", async () => {
		const ownedGet = await fastify.inject({
			method: "GET",
			url: `/nested-owner/${E2E_OWNER_ID}/items/nested-owned-alpha`,
		});
		const foreignGet = await fastify.inject({
			method: "GET",
			url: `/nested-owner/${E2E_OWNER_ID}/items/nested-foreign`,
		});
		const list = await fastify.inject({
			method: "GET",
			url: `/nested-owner/${E2E_OWNER_ID}/items?limit=10&page=1`,
		});

		expect(ownedGet.statusCode).toBe(HttpStatus.OK);
		expect((ownedGet.json() as { id: string }).id).toBe("nested-owned-alpha");
		expect(foreignGet.statusCode).toBe(HttpStatus.NOT_FOUND);
		expect(list.statusCode).toBe(HttpStatus.OK);
		expect((list.json() as { items: Array<{ id: string }> }).items.map(({ id }: { id: string }): string => id)).toEqual(["nested-owned-alpha", "nested-owned-beta", "nested-owned-low"]);
	});

	it("documents inherited owner parameters for generated GET and GET_LIST", () => {
		const getParameters = document.paths["/nested-owner/{ownerId}/items/{id}"]?.get?.parameters ?? [];
		const listParameters = document.paths["/nested-owner/{ownerId}/items"]?.get?.parameters ?? [];
		const parameterNames = (parameters: typeof getParameters): Array<string> => parameters.flatMap((parameter): Array<string> => ("name" in parameter ? [parameter.name] : []));

		expect(parameterNames(getParameters)).toEqual(expect.arrayContaining(["id", "ownerId"]));
		expect(parameterNames(listParameters)).toEqual(expect.arrayContaining(["ownerId"]));
	});
});
