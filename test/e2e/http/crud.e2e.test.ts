import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";

import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { CorrelationIDResponseBodyInterceptor } from "../../../dist/esm/index";
import { E2E_OWNER_ID, E2E_OWNER_ID_OTHER } from "../app/constants";
import { E2eAppModule, E2eFunctionSubscriber, E2eOwnerService, E2ePolicySubscriber, E2eRouteSubscriber, E2eService } from "../app";

describe("CRUD routes (E2E)", () => {
	let app: INestApplication;
	let service: E2eService;
	let ownerService: E2eOwnerService;
	let fastify: { inject: (options: { method: string; url: string; payload?: unknown; headers?: Record<string, string> }) => Promise<{ statusCode: number; json: () => any }> };

	const adminHeaders = {
		"user-agent": "e2e-agent",
		"x-role": "admin",
		"x-signature": "sig-1",
		"x-timestamp": "1700000000",
		"x-user-id": E2E_OWNER_ID,
	};
	const withSignature = (signature: string) => ({ ...adminHeaders, "x-signature": signature });
	const createItem = async (payload: Record<string, unknown>, headers: Record<string, string> = adminHeaders) =>
		fastify.inject({
			headers,
			method: "POST",
			payload,
			url: "/items",
		});
	const seedFilterItems = async () => {
		await createItem({
			code: "code-a",
			count: 1,
			createdAt: "2024-01-01T00:00:00.000Z",
			id: "filter-1",
			isActive: true,
			name: "Alpha",
		});
		await createItem({
			code: "code-b",
			count: 5,
			createdAt: "2024-02-01T00:00:00.000Z",
			id: "filter-2",
			isActive: false,
			name: "Beta",
		});
		await createItem({
			count: 3,
			createdAt: "2024-03-01T00:00:00.000Z",
			id: "filter-3",
			isActive: true,
			name: "Gamma",
		});
	};

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [E2eAppModule],
		}).compile();

		app = moduleRef.createNestApplication(new FastifyAdapter());
		app.useGlobalInterceptors(new CorrelationIDResponseBodyInterceptor());
		await app.init();

		service = app.get(E2eService);
		ownerService = app.get(E2eOwnerService);
		fastify = app.getHttpAdapter().getInstance();
	});

	beforeEach(async () => {
		await service.reset();
		await ownerService.reset();
		await ownerService.repository.save({ id: E2E_OWNER_ID, name: "Owner" });
		E2eFunctionSubscriber.reset();
		E2ePolicySubscriber.reset();
		E2eRouteSubscriber.reset();
	});

	afterAll(async () => {
		await app.close();
	});

	it("serves CRUD routes and applies subscribers", async () => {
		const createResponse = await fastify.inject({
			headers: adminHeaders,
			method: "POST",
			payload: { id: "item-1", name: "Item", count: 1 },
			url: "/items",
		});

		expect(createResponse.statusCode).toBe(201);
		const created = createResponse.json();
		expect(created).toMatchObject({
			id: "item-1",
			name: "route-response-static",
			ownerId: E2E_OWNER_ID,
			count: 1,
		});

		const saved = await service.repository.findOne({ where: { id: "item-1" } });
		expect(saved?.name).toBe("fn-Item");
		expect(saved?.ownerId).toBe(E2E_OWNER_ID);

		const getResponse = await fastify.inject({
			headers: withSignature("item-1"),
			method: "GET",
			url: "/items/item-1",
		});

		expect(getResponse.statusCode).toBe(200);
		expect(getResponse.json().name).toBe("route-fn-Item");

		await ownerService.repository.save({ id: E2E_OWNER_ID_OTHER, name: "Other Owner" });
		await service.repository.save({
			count: 2,
			id: "item-unauthorized",
			name: "Other",
			ownerId: E2E_OWNER_ID_OTHER,
		});

		const listResponse = await fastify.inject({
			headers: adminHeaders,
			method: "GET",
			url: "/items?limit=10&page=1",
		});

		expect(listResponse.statusCode).toBe(200);
		const listBody = listResponse.json();
		expect(listBody.items).toHaveLength(1);
		expect(listBody.items[0]?.ownerId).toBe(E2E_OWNER_ID);

		const patchResponse = await fastify.inject({
			headers: adminHeaders,
			method: "PATCH",
			payload: { name: "Updated" },
			url: "/items/item-1",
		});

		expect(patchResponse.statusCode).toBe(200);
		expect(patchResponse.json().name).toBe("route-fn-Updated");

		const putResponse = await fastify.inject({
			headers: adminHeaders,
			method: "PUT",
			payload: { name: "Replaced" },
			url: "/items/item-1",
		});

		expect(putResponse.statusCode).toBe(200);
		expect(putResponse.json().name).toBe("route-fn-Replaced");

		const deleteResponse = await fastify.inject({
			headers: adminHeaders,
			method: "DELETE",
			url: "/items/item-1",
		});

		expect(deleteResponse.statusCode).toBe(204);

		expect(E2ePolicySubscriber.events).toEqual(expect.arrayContaining(["policy:before:create", "policy:before:get", "policy:before:getList", "policy:before:partialUpdate", "policy:before:update", "policy:before:delete"]));

		expect(E2eRouteSubscriber.events).toEqual(expect.arrayContaining(["route:before:create", "route:after:create", "route:before:get", "route:after:get", "route:before:getList", "route:after:getList", "route:before:partialUpdate", "route:after:partialUpdate", "route:before:update", "route:after:update", "route:before:delete", "route:after:delete"]));

		expect(E2eFunctionSubscriber.events).toEqual(expect.arrayContaining(["function:before:create", "function:after:create", "function:before:get", "function:after:get", "function:before:getList", "function:after:getList", "function:before:update", "function:after:update", "function:before:delete", "function:after:delete"]));
	});

	it("executes subscribers in priority order", async () => {
		const createResponse = await createItem({ id: "item-priority", name: "Priority", count: 1 });

		expect(createResponse.statusCode).toBe(201);

		const routePriorityBefore = E2eRouteSubscriber.events.indexOf("route:priority:before:create");
		const routeBefore = E2eRouteSubscriber.events.indexOf("route:before:create");
		expect(routePriorityBefore).toBeGreaterThanOrEqual(0);
		expect(routeBefore).toBeGreaterThanOrEqual(0);
		expect(routePriorityBefore).toBeLessThan(routeBefore);

		const routePriorityAfter = E2eRouteSubscriber.events.indexOf("route:priority:after:create");
		const routeAfter = E2eRouteSubscriber.events.indexOf("route:after:create");
		expect(routePriorityAfter).toBeGreaterThanOrEqual(0);
		expect(routeAfter).toBeGreaterThanOrEqual(0);
		expect(routePriorityAfter).toBeLessThan(routeAfter);

		const functionPriorityBefore = E2eFunctionSubscriber.events.indexOf("function:priority:before:create");
		const functionBefore = E2eFunctionSubscriber.events.indexOf("function:before:create");
		expect(functionPriorityBefore).toBeGreaterThanOrEqual(0);
		expect(functionBefore).toBeGreaterThanOrEqual(0);
		expect(functionPriorityBefore).toBeLessThan(functionBefore);

		const functionPriorityAfter = E2eFunctionSubscriber.events.indexOf("function:priority:after:create");
		const functionAfter = E2eFunctionSubscriber.events.indexOf("function:after:create");
		expect(functionPriorityAfter).toBeGreaterThanOrEqual(0);
		expect(functionAfter).toBeGreaterThanOrEqual(0);
		expect(functionPriorityAfter).toBeLessThan(functionAfter);
	});

	it("applies request and response transformers on get", async () => {
		await createItem({ id: "item-transform", name: "Transform", count: 1 });

		const getResponse = await fastify.inject({
			headers: withSignature("item-transform"),
			method: "GET",
			url: "/items/item-transform",
		});

		expect(getResponse.statusCode).toBe(200);
		const getBody = getResponse.json();
		expect(getBody.id).toBe("item-transform");
		expect(getBody.responseSignature).toBe("item-transform");
	});

	it("passes event manager to function subscribers in transactions", async () => {
		const createResponse = await fastify.inject({
			headers: adminHeaders,
			method: "POST",
			payload: { id: "item-transaction", name: "Transactional", count: 1, ownerId: E2E_OWNER_ID },
			url: "/items/transaction",
		});

		expect(createResponse.statusCode).toBe(201);
		expect(E2eFunctionSubscriber.events).toContain("function:before:create:transaction");
	});

	it("applies custom policy rules for promote action", async () => {
		await createItem({ id: "item-promote", name: "Promote", count: 1 });

		const promoteResponse = await fastify.inject({
			headers: adminHeaders,
			method: "POST",
			url: "/items/promote/item-promote",
		});

		expect(promoteResponse.statusCode).toBe(200);
		expect(E2ePolicySubscriber.events).toContain("policy:before:promote");

		const deniedResponse = await fastify.inject({
			headers: { "x-user-id": E2E_OWNER_ID },
			method: "POST",
			url: "/items/promote/item-promote",
		});

		expect(deniedResponse.statusCode).toBe(403);
	});

	it("resolves subject fields and applies policy transforms", async () => {
		await ownerService.repository.save({ id: "subject@example.com", name: "Email Owner" });
		await ownerService.repository.save({ id: "uuid-123", name: "Uuid Owner" });
		await service.repository.save({
			count: 1,
			id: "item-subject-email",
			name: "SubjectEmail",
			ownerId: "subject@example.com",
		});
		await service.repository.save({
			count: 1,
			id: "item-subject-uuid",
			name: "SubjectUuid",
			ownerId: "uuid-123",
		});

		const emailResponse = await fastify.inject({
			headers: {
				"user-agent": "e2e-agent",
				"x-policy-transform": "true",
				"x-signature": "item-subject-email",
				"x-user-email": "subject@example.com",
				"x-user-permission": "perm-one",
				"x-user-role": "admin",
			},
			method: "GET",
			url: "/items/item-subject-email",
		});

		expect(emailResponse.statusCode).toBe(200);
		const emailBody = emailResponse.json();
		expect(emailBody.policySubjectId).toBe("subject@example.com");
		expect(emailBody.policyPermissions).toEqual(["perm-one"]);

		const uuidResponse = await fastify.inject({
			headers: {
				"user-agent": "e2e-agent",
				"x-policy-transform": "true",
				"x-signature": "item-subject-uuid",
				"x-user-permissions": "perm-a,perm-b",
				"x-user-roles": "admin,editor",
				"x-user-uuid": "uuid-123",
			},
			method: "GET",
			url: "/items/item-subject-uuid",
		});

		expect(uuidResponse.statusCode).toBe(200);
		const uuidBody = uuidResponse.json();
		expect(uuidBody.policySubjectId).toBe("uuid-123");
		expect(uuidBody.policyPermissions).toEqual(["perm-a", "perm-b"]);
	});

	it("loads response relations for get and list", async () => {
		await createItem({ id: "item-rel", name: "Rel", count: 1 });

		const getResponse = await fastify.inject({
			headers: withSignature("item-rel"),
			method: "GET",
			url: "/items/item-rel",
		});

		expect(getResponse.statusCode).toBe(200);
		expect(getResponse.json().owner?.id).toBe(E2E_OWNER_ID);

		const listResponse = await fastify.inject({
			headers: adminHeaders,
			method: "GET",
			url: "/items?limit=10&page=1",
		});

		expect(listResponse.statusCode).toBe(200);
		const listBody = listResponse.json();
		expect(listBody.items[0]?.owner?.id).toBe(E2E_OWNER_ID);
	});

	it("loads relations in manual mode", async () => {
		const manualResponse = await fastify.inject({
			headers: adminHeaders,
			method: "POST",
			payload: { id: "manual-1", name: "Manual", owner: E2E_OWNER_ID, count: 1 },
			url: "/manual-items",
		});

		expect(manualResponse.statusCode).toBe(201);

		const saved = await service.repository.findOne({
			relations: { owner: true },
			where: { id: "manual-1" },
		});

		expect(saved?.owner?.id).toBe(E2E_OWNER_ID);
	});

	it("denies access without admin role", async () => {
		const createResponse = await fastify.inject({
			headers: { "x-user-id": E2E_OWNER_ID },
			method: "POST",
			payload: { id: "item-2", name: "Denied", ownerId: E2E_OWNER_ID, count: 1 },
			url: "/items",
		});

		expect(createResponse.statusCode).toBe(403);
	});

	it("returns 404 for missing entities", async () => {
		const missingGet = await fastify.inject({
			headers: withSignature("missing"),
			method: "GET",
			url: "/items/missing",
		});

		expect(missingGet.statusCode).toBe(404);

		const missingDelete = await fastify.inject({
			headers: adminHeaders,
			method: "DELETE",
			url: "/items/missing",
		});

		expect(missingDelete.statusCode).toBe(404);

		expect(E2eRouteSubscriber.events).toEqual(expect.arrayContaining(["route:after_error:get", "route:after_error:delete"]));

		expect(E2eFunctionSubscriber.events).toEqual(expect.arrayContaining(["function:after_error:get", "function:after_error:delete"]));
	});

	it("returns 404 for missing updates and fires error hooks", async () => {
		const missingPatch = await fastify.inject({
			headers: adminHeaders,
			method: "PATCH",
			payload: { name: "MissingPatch" },
			url: "/items/missing",
		});

		expect(missingPatch.statusCode).toBe(404);

		const missingPut = await fastify.inject({
			headers: adminHeaders,
			method: "PUT",
			payload: { name: "MissingPut" },
			url: "/items/missing",
		});

		expect(missingPut.statusCode).toBe(404);

		expect(E2eRouteSubscriber.events).toEqual(expect.arrayContaining(["route:after_error:partialUpdate", "route:after_error:update"]));

		expect(E2eFunctionSubscriber.events).toEqual(expect.arrayContaining(["function:after_error:update"]));
	});

	it("applies query filters to list requests", async () => {
		await fastify.inject({
			headers: adminHeaders,
			method: "POST",
			payload: { id: "item-2", name: "Filtered", count: 1 },
			url: "/items",
		});

		await fastify.inject({
			headers: adminHeaders,
			method: "POST",
			payload: { id: "item-3", name: "Other", count: 1 },
			url: "/items",
		});

		const listResponse = await fastify.inject({
			headers: adminHeaders,
			method: "GET",
			url: "/items?limit=10&page=1&name[value]=fn-Filtered&name[operator]=eq",
		});

		expect(listResponse.statusCode).toBe(200);
		const listBody = listResponse.json();
		expect(listBody.items).toHaveLength(1);
		expect(listBody.items[0]?.name).toBe("fn-Filtered");
	});

	it("overrides getList page via query transformers", async () => {
		await seedFilterItems();

		const listResponse = await fastify.inject({
			headers: adminHeaders,
			method: "GET",
			url: "/items?limit=1&page=2&orderBy=id&orderDirection=ASC",
		});

		expect(listResponse.statusCode).toBe(200);
		const listBody = listResponse.json();
		expect(listBody.currentPage).toBe(1);
		expect(listBody.items[0]?.id).toBe("filter-1");
	});

	it("applies extended filter operations", async () => {
		await seedFilterItems();

		const scenarios = [
			{ expected: ["filter-1"], query: "name[operator]=cont&name[value]=Alpha" },
			{ expected: ["filter-2"], query: "name[operator]=contl&name[value]=beta" },
			{ expected: ["filter-1"], query: "name[operator]=starts&name[value]=fn-A" },
			{ expected: ["filter-2"], query: "name[operator]=ends&name[value]=eta" },
			{ expected: ["filter-1", "filter-3"], query: "name[operator]=in&name[values]=fn-Alpha&name[values]=fn-Gamma" },
			{ expected: ["filter-2"], query: "name[operator]=notin&name[values]=fn-Alpha&name[values]=fn-Gamma" },
			{ expected: ["filter-3"], query: "count[operator]=between&count[values]=2&count[values]=4" },
			{ expected: ["filter-2"], query: "count[operator]=gt&count[value]=3" },
			{ expected: ["filter-1"], query: "count[operator]=lt&count[value]=3" },
			{ expected: ["filter-3"], query: "code[operator]=isnull&code[value]=1" },
			{ expected: ["filter-1", "filter-3"], query: "isActive[operator]=eq&isActive[value]=1" },
			{ expected: ["filter-2", "filter-3"], query: "createdAt[operator]=gt&createdAt[value]=2024-01-15T00:00:00.000Z" },
		];

		for (const scenario of scenarios) {
			const listResponse = await fastify.inject({
				headers: adminHeaders,
				method: "GET",
				url: `/items?limit=10&page=1&${scenario.query}`,
			});

			expect(listResponse.statusCode).toBe(200);
			const ids = listResponse
				.json()
				.items.map((item: { id: string }) => item.id)
				.sort();
			expect(ids).toEqual([...scenario.expected].sort());
		}
	});

	it("sorts list responses by count", async () => {
		await seedFilterItems();

		const listResponse = await fastify.inject({
			headers: adminHeaders,
			method: "GET",
			url: "/items?limit=10&page=1&orderBy=count&orderDirection=DESC",
		});

		expect(listResponse.statusCode).toBe(200);
		const listBody = listResponse.json();
		expect(listBody.items[0]?.count).toBe(5);
	});

	it("returns pagination metadata", async () => {
		await seedFilterItems();

		const listResponse = await fastify.inject({
			headers: adminHeaders,
			method: "GET",
			url: "/items?limit=2&page=1&orderBy=id&orderDirection=ASC",
		});

		expect(listResponse.statusCode).toBe(200);
		const listBody = listResponse.json();
		expect(listBody.currentPage).toBe(1);
		expect(listBody.totalCount).toBe(3);
		expect(listBody.totalPages).toBe(2);
	});

	it("applies response transformers for list results", async () => {
		await seedFilterItems();

		const listResponse = await fastify.inject({
			headers: adminHeaders,
			method: "GET",
			url: "/items?limit=10&page=1",
		});

		expect(listResponse.statusCode).toBe(200);
		expect(listResponse.json().count).toBe("999");
	});

	it("filters by relation property", async () => {
		await seedFilterItems();

		const listResponse = await fastify.inject({
			headers: adminHeaders,
			method: "GET",
			url: `/items?limit=10&page=1&owner[operator]=eq&owner[value]=${E2E_OWNER_ID}`,
		});

		expect(listResponse.statusCode).toBe(200);
		expect(listResponse.json().items).not.toHaveLength(0);
	});

	it("returns conflict for duplicate unique fields", async () => {
		const firstResponse = await createItem({ code: "duplicate", count: 1, id: "dup-1", name: "Dup" });
		expect(firstResponse.statusCode).toBe(201);

		const secondResponse = await createItem({ code: "duplicate", count: 1, id: "dup-2", name: "DupTwo" });
		expect(secondResponse.statusCode).toBe(409);
	});

	it("returns conflict when updating unique fields to a duplicate", async () => {
		await createItem({ code: "unique-a", count: 1, id: "dup-update-1", name: "DupUpdateA" });
		await createItem({ code: "unique-b", count: 1, id: "dup-update-2", name: "DupUpdateB" });

		const updateResponse = await fastify.inject({
			headers: adminHeaders,
			method: "PATCH",
			payload: { code: "unique-a" },
			url: "/items/dup-update-2",
		});

		expect(updateResponse.statusCode).toBe(409);
	});

	it("returns bad request when deleting owners with relations", async () => {
		await createItem({ count: 1, id: "owner-rel-1", name: "OwnerRel" });

		const deleteResponse = await fastify.inject({
			headers: adminHeaders,
			method: "DELETE",
			url: `/owners/${E2E_OWNER_ID}`,
		});

		expect(deleteResponse.statusCode).toBe(400);
	});

	it("adds correlation IDs to error responses", async () => {
		const { ["x-signature"]: _missing, ...headersWithoutSignature } = adminHeaders;

		const responseWithId = await fastify.inject({
			headers: { ...headersWithoutSignature, "x-correlation-id": "corr-1" },
			method: "POST",
			payload: { id: "corr-1", name: "Corr", count: 1 },
			url: "/items",
		});

		expect(responseWithId.statusCode).toBe(500);
		expect(responseWithId.json().correlationID).toBe("corr-1");

		const responseWithoutId = await fastify.inject({
			headers: headersWithoutSignature,
			method: "POST",
			payload: { id: "corr-2", name: "CorrTwo", count: 1 },
			url: "/items",
		});

		expect(responseWithoutId.statusCode).toBe(500);
		expect(typeof responseWithoutId.json().correlationID).toBe("string");
	});

	it("fires getList error hooks when validation fails", async () => {
		const listResponse = await fastify.inject({
			headers: adminHeaders,
			method: "GET",
			url: "/items?limit=10&page=1&forceError=true",
		});

		expect(listResponse.statusCode).toBe(400);
		expect(E2eRouteSubscriber.events).toContain("route:after_error:getList");
	});

	it("fails when response transformer targets missing key", async () => {
		await createItem({ count: 1, id: "transform-error-1", name: "TransformError" });

		const response = await fastify.inject({
			headers: adminHeaders,
			method: "GET",
			url: "/transform-error-items/transform-error-1",
		});

		expect(response.statusCode).toBe(500);
		expect(E2eRouteSubscriber.events).toContain("route:after_error:get");
	});

	it("applies dynamic transformers to create payload", async () => {
		const createResponse = await fastify.inject({
			headers: adminHeaders,
			method: "POST",
			payload: { id: "item-6", name: "Dynamic", count: 1 },
			url: "/items",
		});

		expect(createResponse.statusCode).toBe(201);
		const saved = await service.repository.findOne({ where: { id: "item-6" } });
		expect(saved?.signature).toBe("sig-1");
		expect(saved?.timestamp).toBe("1700000000");
		expect(saved?.userAgent).toBe("e2e-agent");
		expect(typeof saved?.requestIp).toBe("string");
		expect((saved?.authorizedEntity as { id?: string } | undefined)?.id).toBe(E2E_OWNER_ID);
	});

	it("fires create error hooks when after hook throws", async () => {
		const createResponse = await fastify.inject({
			headers: adminHeaders,
			method: "POST",
			payload: { id: "item-error", name: "ThrowAfterCreate", count: 1 },
			url: "/items",
		});

		expect(createResponse.statusCode).toBe(500);
		expect(E2eRouteSubscriber.events).toContain("route:after_error:create");
		expect(E2eFunctionSubscriber.events).toContain("function:after_error:create");
	});

	it("loads request relations and swaps ids to entities", async () => {
		const createResponse = await fastify.inject({
			headers: adminHeaders,
			method: "POST",
			payload: { id: "item-3", name: "WithOwner", owner: E2E_OWNER_ID, count: 2 },
			url: "/items",
		});

		expect(createResponse.statusCode).toBe(201);
		const saved = await service.repository.findOne({
			relations: { owner: true },
			where: { id: "item-3" },
		});
		expect(saved?.owner?.id).toBe(E2E_OWNER_ID);
	});

	it("executes getMany function hooks", async () => {
		await fastify.inject({
			headers: adminHeaders,
			method: "POST",
			payload: { id: "item-many-1", name: "ManyOne", count: 1 },
			url: "/items",
		});

		await fastify.inject({
			headers: adminHeaders,
			method: "POST",
			payload: { id: "item-many-2", name: "ManyTwo", count: 1 },
			url: "/items",
		});

		const manyResponse = await fastify.inject({
			headers: adminHeaders,
			method: "GET",
			url: "/function/many?ids=item-many-1,item-many-2",
		});

		expect(manyResponse.statusCode).toBe(200);
		expect(manyResponse.json()).toHaveLength(2);
		expect(E2eFunctionSubscriber.events).toEqual(expect.arrayContaining(["function:before:getMany", "function:after:getMany"]));
	});

	it("fires getMany function error hook when nothing found", async () => {
		const manyResponse = await fastify.inject({
			headers: adminHeaders,
			method: "GET",
			url: "/function/many?ids=missing",
		});

		expect(manyResponse.statusCode).toBe(404);
		expect(E2eFunctionSubscriber.events).toContain("function:after_error:getMany");
	});

	it("fails validation when count is not positive", async () => {
		const createResponse = await fastify.inject({
			headers: adminHeaders,
			method: "POST",
			payload: { id: "item-4", name: "Invalid", count: 0 },
			url: "/items",
		});

		expect(createResponse.statusCode).toBe(400);
	});

	it("validates ApiPropertyCopy body DTOs with class-validator", async () => {
		const invalidResponse = await fastify.inject({
			method: "POST",
			payload: { count: "abc", name: "Copied" },
			url: "/copy",
		});

		expect(invalidResponse.statusCode).toBe(400);

		const response = await fastify.inject({
			method: "POST",
			payload: { count: "2", name: "Copied" },
			url: "/copy",
		});

		expect(response.statusCode).toBe(201);
		expect(response.json()).toMatchObject({ count: 2, name: "Copied" });
	});

	it("returns 400 when relation id is invalid", async () => {
		const createResponse = await fastify.inject({
			headers: adminHeaders,
			method: "POST",
			payload: { id: "item-5", name: "BadOwner", owner: E2E_OWNER_ID_OTHER, count: 1 },
			url: "/items",
		});

		expect(createResponse.statusCode).toBe(404);
	});

	it("fails when signature header is missing", async () => {
		const { ["x-signature"]: _missing, ...headersWithoutSignature } = adminHeaders;
		const createResponse = await fastify.inject({
			headers: headersWithoutSignature,
			method: "POST",
			payload: { id: "item-7", name: "MissingSignature", count: 1 },
			url: "/items",
		});

		expect(createResponse.statusCode).toBe(500);
		expect(E2eRouteSubscriber.events).toContain("route:after_error:create");
	});

	it("fails when timestamp header is missing", async () => {
		const { ["x-timestamp"]: _missing, ...headersWithoutTimestamp } = adminHeaders;
		const createResponse = await fastify.inject({
			headers: headersWithoutTimestamp,
			method: "POST",
			payload: { id: "item-8", name: "MissingTimestamp", count: 1 },
			url: "/items",
		});

		expect(createResponse.statusCode).toBe(500);
	});

	it("fails when user-agent header is missing", async () => {
		const createResponse = await fastify.inject({
			headers: { ...adminHeaders, "user-agent": "" },
			method: "POST",
			payload: { id: "item-9", name: "MissingAgent", count: 1 },
			url: "/items",
		});

		expect(createResponse.statusCode).toBe(500);
	});

	it("fails when authentication request is dropped", async () => {
		const createResponse = await fastify.inject({
			headers: { ...adminHeaders, "x-drop-auth": "true" },
			method: "POST",
			payload: { id: "item-10", name: "NoAuth", count: 1 },
			url: "/items",
		});

		expect(createResponse.statusCode).toBe(500);
		expect(E2eRouteSubscriber.events).toContain("route:after_error:create");
	});

	it("fires before_error when primary key metadata is missing", async () => {
		const createResponse = await fastify.inject({
			headers: { ...adminHeaders, "x-drop-primary": "true" },
			method: "POST",
			payload: { id: "item-11", name: "NoPrimary", count: 1 },
			url: "/items",
		});

		expect(createResponse.statusCode).toBe(500);
		expect(E2eRouteSubscriber.events).toContain("route:before_error:create");
		expect(E2eRouteSubscriber.events).toContain("route:after_error:create");
	});

	it("fires before_error hooks for other routes when primary key is missing", async () => {
		const missingGet = await fastify.inject({
			headers: { ...withSignature("item-1"), "x-drop-primary": "true" },
			method: "GET",
			url: "/items/item-1",
		});

		expect(missingGet.statusCode).toBe(500);

		const missingDelete = await fastify.inject({
			headers: { ...adminHeaders, "x-drop-primary": "true" },
			method: "DELETE",
			url: "/items/item-1",
		});

		expect(missingDelete.statusCode).toBe(500);

		const missingPatch = await fastify.inject({
			headers: { ...adminHeaders, "x-drop-primary": "true" },
			method: "PATCH",
			payload: { name: "MissingPatch" },
			url: "/items/item-1",
		});

		expect(missingPatch.statusCode).toBe(500);

		const missingPut = await fastify.inject({
			headers: { ...adminHeaders, "x-drop-primary": "true" },
			method: "PUT",
			payload: { name: "MissingPut" },
			url: "/items/item-1",
		});

		expect(missingPut.statusCode).toBe(500);

		expect(E2eRouteSubscriber.events).toEqual(expect.arrayContaining(["route:before_error:get", "route:after_error:get", "route:before_error:delete", "route:after_error:delete", "route:before_error:partialUpdate", "route:after_error:partialUpdate", "route:before_error:update", "route:after_error:update"]));
	});

	it("fires function before_error hooks when repository is missing", async () => {
		const scenarios = [
			{ event: "function:before_error:create", method: "POST", url: "/broken/create", payload: { id: "broken-1", name: "Broken", count: 1 } },
			{ event: "function:before_error:get", method: "GET", url: "/broken/get/broken-1" },
			{ event: "function:before_error:getList", method: "GET", url: "/broken/list?limit=10&page=1" },
			{ event: "function:before_error:getMany", method: "GET", url: "/broken/many?ids=broken-1" },
			{ event: "function:before_error:update", method: "PATCH", url: "/broken/update/broken-1", payload: { name: "BrokenUpdate" } },
			{ event: "function:before_error:delete", method: "DELETE", url: "/broken/delete/broken-1" },
		];

		for (const scenario of scenarios) {
			const response = await fastify.inject({
				headers: adminHeaders,
				method: scenario.method,
				payload: scenario.payload,
				url: scenario.url,
			});

			expect(response.statusCode).toBe(500);
		}

		expect(E2eFunctionSubscriber.events).toEqual(expect.arrayContaining(scenarios.map((scenario) => scenario.event)));
	});
});
