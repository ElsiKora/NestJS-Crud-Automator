import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";

import { HttpStatus, ValidationPipe } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { E2eAppModule, E2eOwnerService, E2eService } from "./app";
import { E2E_OWNER_ID } from "./app/constants";

describe("typed GET_LIST host ValidationPipe independence (E2E)", () => {
	let app: INestApplication | undefined;
	let ownerService: E2eOwnerService;
	let service: E2eService;
	let fastify: { inject: (options: { headers: Record<string, string>; method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };

	const headers: Record<string, string> = {
		"user-agent": "e2e-agent",
		"x-role": "admin",
		"x-signature": "sig-1",
		"x-timestamp": "1700000000",
		"x-user-id": E2E_OWNER_ID,
	};

	beforeAll(async () => {
		const moduleReference = await Test.createTestingModule({
			imports: [E2eAppModule],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		app.useGlobalPipes(
			new ValidationPipe({
				transform: true,
				whitelist: true,
			}),
		);
		await app.init();
		ownerService = app.get(E2eOwnerService);
		service = app.get(E2eService);
		fastify = app.getHttpAdapter().getInstance();
	});

	beforeEach(async () => {
		await service.reset();
		await ownerService.reset();
		await ownerService.repository.save({ id: E2E_OWNER_ID, name: "Owner" });
		await service.repository.save({
			count: 1,
			id: "pipe-item",
			name: "Pipe",
			ownerId: E2E_OWNER_ID,
		});
	});

	afterAll(async () => {
		await app?.close();
	});

	it("rejects unknown filters even when host whitelist would strip them", async () => {
		const response = await fastify.inject({
			headers,
			method: "GET",
			url: "/typed-items?limit=10&page=1&name[operator]=eq&name[value]=Pipe&code[operator]=eq&code[value]=hidden",
		});

		expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
	});

	it("accepts a valid typed filter through query transformation", async () => {
		const response = await fastify.inject({
			headers,
			method: "GET",
			url: "/typed-items?limit=10&page=1&name[operator]=eq&name[value]=Pipe",
		});

		expect(response.statusCode).toBe(HttpStatus.OK);
		expect((response.json() as { items: Array<{ id: string }> }).items.map((item: { id: string }) => item.id)).toEqual(["pipe-item"]);
	});

	it("accepts one membership value through query transformation", async () => {
		const response = await fastify.inject({
			headers,
			method: "GET",
			url: "/typed-items?limit=10&page=1&name[operator]=inl&name[values]=Pipe",
		});

		expect(response.statusCode).toBe(HttpStatus.OK);
		expect((response.json() as { items: Array<{ id: string }> }).items.map((item: { id: string }) => item.id)).toEqual(["pipe-item"]);
	});

	it("preserves legacy filter DTO validation when only typed order is configured", async () => {
		const response = await fastify.inject({
			headers,
			method: "GET",
			url: "/order-only-typed-items?limit=10&page=1&name[value]=Pipe",
		});

		expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
	});
});
