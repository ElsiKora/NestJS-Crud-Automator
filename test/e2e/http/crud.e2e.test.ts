import "reflect-metadata";

import { HttpStatus, type INestApplication } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiAuthorizationCacheInvalidationService, AUTHORIZATION_POLICY_REGISTRY_TOKEN, CorrelationIDResponseBodyInterceptor, EApiFunctionTransactionOwnerKind, EApiFunctionTransactionTraceType, EApiFunctionType, EApiRouteType, type IApiAuthorizationPolicyRegistry } from "../../../src/index";
import { E2E_OWNER_ID, E2E_OWNER_ID_OTHER } from "../app/constants";
import { E2eAppModule, E2eCustomRouteSubscriber, E2eEntity, E2eFunctionSubscriber, E2eOwnerService, E2ePolicySubscriber, E2eRouteSubscriber, E2eService } from "../app";

describe("CRUD routes (E2E)", () => {
	let app: INestApplication;
	let cacheInvalidationService: ApiAuthorizationCacheInvalidationService;
	let policyRegistry: IApiAuthorizationPolicyRegistry;
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
	const wildcardPermissionHeaders = (overrides: Record<string, string> = {}) => ({
		"user-agent": "e2e-agent",
		"x-user-id": E2E_OWNER_ID,
		"x-user-permissions": "admin.item.*",
		...overrides,
	});
	const customPrincipalHeaders = (permissions: string, overrides: Record<string, string> = {}) => ({
		"user-agent": "e2e-agent",
		"x-auth-shape": "custom",
		"x-policy-transform": "true",
		"x-user-id": "custom-user",
		"x-user-operator-id": E2E_OWNER_ID,
		"x-user-permissions": permissions,
		...overrides,
	});
	const withSignature = (signature: string) => ({ ...adminHeaders, "x-signature": signature });
	const createItem = async (payload: Record<string, unknown>, headers: Record<string, string> = adminHeaders) =>
		fastify.inject({
			headers,
			method: "POST",
			payload,
			url: "/items",
		});
	const createCustomResponseItem = async (payload: Record<string, unknown>, headers: Record<string, string> = adminHeaders) =>
		fastify.inject({
			headers,
			method: "POST",
			payload,
			url: "/custom-response-items",
		});
	const getCustomItemResponseList = async (headers: Record<string, string> = adminHeaders) =>
		fastify.inject({
			headers,
			method: "GET",
			url: "/custom-item-response-items?limit=10&page=1&orderBy=id&orderDirection=ASC",
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

		cacheInvalidationService = app.get(ApiAuthorizationCacheInvalidationService);
		policyRegistry = app.get(AUTHORIZATION_POLICY_REGISTRY_TOKEN);
		service = app.get(E2eService);
		ownerService = app.get(E2eOwnerService);
		fastify = app.getHttpAdapter().getInstance();
	});

	beforeEach(async () => {
		await service.reset();
		await ownerService.reset();
		await ownerService.repository.save({ id: E2E_OWNER_ID, name: "Owner" });
		E2eFunctionSubscriber.reset();
		E2eCustomRouteSubscriber.reset();
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

	it("loads one decorated current entity before a database-backed update", async () => {
		await service.repository.save({ count: 1, id: "current-entity-1", name: "Original", ownerId: E2E_OWNER_ID });
		E2eFunctionSubscriber.reset();
		const decoratedGetQueries: Array<string> = [];
		const persistenceQueries: Array<string> = [];
		const originalFindOne = service.repository.findOne.bind(service.repository);
		const originalLogQuery = service.dataSource.logger.logQuery.bind(service.dataSource.logger);
		let isDecoratedGetActive: boolean = false;
		const findOneSpy = vi.spyOn(service.repository, "findOne").mockImplementation(async (properties) => {
			isDecoratedGetActive = true;

			try {
				return await originalFindOne(properties);
			} finally {
				isDecoratedGetActive = false;
			}
		});
		const querySpy = vi.spyOn(service.dataSource.logger, "logQuery").mockImplementation((query, parameters, queryRunner) => {
			(isDecoratedGetActive ? decoratedGetQueries : persistenceQueries).push(query);
			originalLogQuery(query, parameters, queryRunner);
		});

		try {
			const updated = await service.update({ id: "current-entity-1" }, { name: "Updated" });
			const decoratedGetSelects: Array<string> = decoratedGetQueries.filter((query) => query.trimStart().startsWith("SELECT") && query.includes('"e2e_entities"'));

			expect(findOneSpy).toHaveBeenCalledTimes(1);
			expect(findOneSpy).toHaveBeenCalledWith({ where: { id: "current-entity-1" } });
			expect(decoratedGetSelects).toHaveLength(1);
			expect(persistenceQueries.some((query) => query.trimStart().startsWith("UPDATE") && query.includes('"e2e_entities"'))).toBe(true);
			expect(E2eFunctionSubscriber.events).toEqual(["function:before:get", "function:after:get", "function:before:update", "function:after:update"]);
			expect(E2eFunctionSubscriber.currentEntities).toHaveLength(1);
			expect(E2eFunctionSubscriber.currentEntities[0]).toMatchObject({ count: 1, id: "current-entity-1", name: "Original" });
			expect(Object.isFrozen(E2eFunctionSubscriber.currentEntities[0])).toBe(true);
			expect(updated.name).toBe("fn-Updated");
		} finally {
			findOneSpy.mockRestore();
			querySpy.mockRestore();
		}

		expect((await service.repository.findOne({ where: { id: "current-entity-1" } }))?.name).toBe("fn-Updated");
	});

	it("keeps update-before closed when the decorated current-entity lookup misses", async () => {
		await expect(service.update({ id: "current-entity-missing" }, { name: "Missing" })).rejects.toMatchObject({ status: HttpStatus.NOT_FOUND });

		expect(E2eFunctionSubscriber.events).toEqual(["function:before:get", "function:after_error:get", "function:after_error:update"]);
		expect(E2eFunctionSubscriber.currentEntities).toHaveLength(0);
	});

	it("loads currentEntity through the active manager so uncommitted writes are visible", async () => {
		await service.repository.save({ count: 1, id: "current-entity-transaction", name: "Original", ownerId: E2E_OWNER_ID });
		E2eFunctionSubscriber.reset();

		await service.updateAfterUncommittedChange("current-entity-transaction", "Uncommitted");

		expect(E2eFunctionSubscriber.currentEntities).toHaveLength(1);
		expect(E2eFunctionSubscriber.currentEntities[0]).toMatchObject({ count: 1, id: "current-entity-transaction", name: "Uncommitted" });
		expect(E2eFunctionSubscriber.events).toEqual(["function:before:custom.update.current-entity", "function:before:custom.update.current-entity:transaction", "function:before:get", "function:after:get", "function:before:update", "function:after:update", "function:after:custom.update.current-entity", "function:after:commit"]);
		expect(await service.repository.findOne({ where: { id: "current-entity-transaction" } })).toMatchObject({ count: 2, name: "Uncommitted" });
	});

	it("uses custom response DTO for create runtime serialization", async () => {
		const createResponse = await createCustomResponseItem({
			count: 1,
			id: "custom-create-1",
			name: "CustomCreate",
			ownerId: E2E_OWNER_ID,
		});

		expect(createResponse.statusCode).toBe(201);
		expect(createResponse.json()).toEqual({
			displayName: "route-fn-CustomCreate",
			owner: E2E_OWNER_ID,
			resourceId: "custom-create-1",
		});
	});

	it("uses custom response DTO for get runtime serialization", async () => {
		await service.repository.save({
			count: 1,
			id: "custom-get-1",
			name: "CustomGet",
			ownerId: E2E_OWNER_ID,
		});

		const getResponse = await fastify.inject({
			headers: adminHeaders,
			method: "GET",
			url: "/custom-response-items/custom-get-1",
		});

		expect(getResponse.statusCode).toBe(200);
		expect(getResponse.json()).toEqual({
			displayName: "route-CustomGet",
			owner: E2E_OWNER_ID,
			resourceId: "custom-get-1",
		});
	});

	it("uses custom response DTO for partial-update runtime serialization", async () => {
		await service.repository.save({
			count: 1,
			id: "custom-patch-1",
			name: "BeforePatch",
			ownerId: E2E_OWNER_ID,
		});

		const patchResponse = await fastify.inject({
			headers: adminHeaders,
			method: "PATCH",
			payload: { name: "AfterPatch" },
			url: "/custom-response-items/custom-patch-1",
		});

		expect(patchResponse.statusCode).toBe(200);
		expect(patchResponse.json()).toEqual({
			displayName: "route-fn-AfterPatch",
			resourceId: "custom-patch-1",
		});
	});

	it("uses custom wrapper response DTO for get-list runtime serialization", async () => {
		await service.repository.save([
			{
				count: 1,
				id: "custom-list-1",
				name: "CustomListOne",
				ownerId: E2E_OWNER_ID,
			},
			{
				count: 2,
				id: "custom-list-2",
				name: "CustomListTwo",
				ownerId: E2E_OWNER_ID,
			},
		]);

		const listResponse = await fastify.inject({
			headers: adminHeaders,
			method: "GET",
			url: "/custom-response-items?limit=10&page=1&orderBy=id&orderDirection=ASC",
		});

		expect(listResponse.statusCode).toBe(200);
		expect(listResponse.json()).toEqual({
			entries: [
				{
					displayName: "CustomListOne",
					owner: E2E_OWNER_ID,
					resourceId: "custom-list-1",
				},
				{
					displayName: "CustomListTwo",
					owner: E2E_OWNER_ID,
					resourceId: "custom-list-2",
				},
			],
			page: 1,
			pageCount: 1,
			totalItems: 2,
			visibleCount: 2,
		});
	});

	it("uses custom item response DTO with generated get-list wrapper", async () => {
		await service.repository.save([
			{
				count: 1,
				id: "custom-item-list-1",
				name: "CustomItemListOne",
				ownerId: E2E_OWNER_ID,
			},
			{
				count: 2,
				id: "custom-item-list-2",
				name: "CustomItemListTwo",
				ownerId: E2E_OWNER_ID,
			},
		]);

		const listResponse = await getCustomItemResponseList();

		expect(listResponse.statusCode).toBe(200);
		expect(listResponse.json()).toEqual({
			count: 2,
			currentPage: 1,
			items: [
				{
					displayName: "CustomItemListOne",
					owner: E2E_OWNER_ID,
					resourceId: "custom-item-list-1",
				},
				{
					displayName: "CustomItemListTwo",
					owner: E2E_OWNER_ID,
					resourceId: "custom-item-list-2",
				},
			],
			totalCount: 2,
			totalPages: 1,
		});
		expect(listResponse.json().items[0]).not.toHaveProperty("count");
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

	it("uses configured transactions for generated create routes", async () => {
		const createResponse = await fastify.inject({
			headers: adminHeaders,
			method: "POST",
			payload: { id: "generated-transaction", name: "GeneratedTransaction", count: 1, ownerId: E2E_OWNER_ID },
			url: "/generated-transaction-items",
		});

		expect(createResponse.statusCode).toBe(201);
		expect(E2eFunctionSubscriber.events).toContain("function:before:create:transaction");
		expect(E2eFunctionSubscriber.events).toContain("function:after:commit");
		expect(E2eFunctionSubscriber.transactionContexts.at(-1)?.DATA.transaction.owner).toEqual({
			entityName: E2eEntity.name,
			kind: EApiFunctionTransactionOwnerKind.ROUTE,
			methodName: "create",
			routeType: EApiRouteType.CREATE,
		});
		expect(E2eFunctionSubscriber.transactionContexts.at(-1)?.DATA.events.map((event) => event.functionType)).toEqual([EApiFunctionType.CREATE, EApiFunctionType.GET]);
		expect(await service.repository.findOne({ where: { id: "generated-transaction" } })).toMatchObject({
			id: "generated-transaction",
			name: "fn-GeneratedTransaction",
		});
	});

	it("uses declared ApiMethod actions for custom securable routes", async () => {
		await createItem({ id: "item-promote", name: "Promote", count: 1 });

		const promoteResponse = await fastify.inject({
			headers: {
				"x-user-id": E2E_OWNER_ID,
				"x-user-permission": "admin.item.update",
			},
			method: "POST",
			url: "/items/promote/item-promote",
		});

		expect(promoteResponse.statusCode).toBe(200);
		expect(E2ePolicySubscriber.events).toContain("policy:before:update.promote");
		expect(E2ePolicySubscriber.events).not.toContain("policy:before:update");

		E2ePolicySubscriber.reset();

		const deniedResponse = await fastify.inject({
			headers: {
				"x-user-id": E2E_OWNER_ID,
				"x-user-permission": "admin.item.promote",
			},
			method: "POST",
			url: "/items/promote/item-promote",
		});

		expect(deniedResponse.statusCode).toBe(403);
		expect(E2ePolicySubscriber.events).toContain("policy:before:update.promote");
		expect(E2ePolicySubscriber.events).not.toContain("policy:before:update");
	});

	it("resolves principal fields and applies policy transforms", async () => {
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
		expect(emailBody.policyPrincipalId).toBe("subject@example.com");
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
		expect(uuidBody.policyPrincipalId).toBe("uuid-123");
		expect(uuidBody.policyPermissions).toEqual(["perm-a", "perm-b"]);
	});

	it("allows wildcard permission-based access without admin role", async () => {
		await createItem({ id: "item-permission", name: "PermissionBased", count: 1 });

		const getResponse = await fastify.inject({
			headers: wildcardPermissionHeaders({
				"x-policy-transform": "true",
				"x-signature": "item-permission",
			}),
			method: "GET",
			url: "/items/item-permission",
		});

		expect(getResponse.statusCode).toBe(200);
		expect(getResponse.json().policyPermissions).toEqual(["admin.item.*"]);

		const listResponse = await fastify.inject({
			headers: wildcardPermissionHeaders(),
			method: "GET",
			url: "/items?limit=10&page=1",
		});

		expect(listResponse.statusCode).toBe(200);
		expect(listResponse.json().items).toHaveLength(1);
	});

	it("uses the configured custom principal resolver during HTTP authorization", async () => {
		await createItem({ id: "item-custom-subject", name: "CustomSubject", count: 1 });

		const getResponse = await fastify.inject({
			headers: customPrincipalHeaders("admin.item.read", {
				"x-signature": "item-custom-subject",
			}),
			method: "GET",
			url: "/items/item-custom-subject",
		});

		expect(getResponse.statusCode).toBe(200);
		expect(getResponse.json().policyPermissions).toEqual(["admin.item.read"]);
		expect(getResponse.json().policyPrincipalId).toBe("custom-user");
	});

	it("uses request body metadata in create authorization policies", async () => {
		const deniedResponse = await createItem(
			{
				count: 1,
				id: "item-create-owner-mismatch",
				name: "payload-aware-denied-create",
				ownerId: E2E_OWNER_ID_OTHER,
			},
			adminHeaders,
		);

		expect(deniedResponse.statusCode).toBe(403);
	});

	it("uses route parameters in get authorization policies", async () => {
		await createItem({ id: "payload-denied-get", name: "DeniedGet", count: 1 });

		const getResponse = await fastify.inject({
			headers: withSignature("payload-denied-get"),
			method: "GET",
			url: "/items/payload-denied-get",
		});

		expect(getResponse.statusCode).toBe(403);
	});

	it("uses query metadata in get-list authorization policies", async () => {
		await createItem({ id: "payload-query-item", name: "QueryDenied", count: 1 });

		const listResponse = await fastify.inject({
			headers: adminHeaders,
			method: "GET",
			url: "/items?forcePolicyDeny=true&limit=10&page=1",
		});

		expect(listResponse.statusCode).toBe(403);
	});

	it("uses body and route parameters in partial-update authorization policies", async () => {
		await createItem({ id: "payload-aware-denied", name: "BeforePatch", count: 1 });

		const patchResponse = await fastify.inject({
			headers: adminHeaders,
			method: "PATCH",
			payload: { name: "PayloadDenied" },
			url: "/items/payload-aware-denied",
		});

		expect(patchResponse.statusCode).toBe(403);
	});

	it("applies explicit permission denies before matching allows", async () => {
		await createItem({ id: "item-blocked-update", name: "BlockedUpdate", count: 1 });

		const deniedResponse = await fastify.inject({
			headers: {
				...adminHeaders,
				"x-policy-block-update": "true",
				"x-user-permission": "admin.item.update",
			},
			method: "PUT",
			payload: { name: "ShouldNotPersist" },
			url: "/items/item-blocked-update",
		});

		expect(deniedResponse.statusCode).toBe(403);
	});

	it("applies explicit payload-aware denies before matching allows", async () => {
		await createItem({ id: "item-platform-admin-denied", name: "RoleAssignment", count: 1 });

		const deniedResponse = await fastify.inject({
			headers: {
				...adminHeaders,
				"x-user-permission": "admin.item.update",
			},
			method: "PUT",
			payload: {
				authorizedEntity: {
					role: "platform-admin",
				},
				name: "ShouldNotPersist",
			},
			url: "/items/item-platform-admin-denied",
		});

		expect(deniedResponse.statusCode).toBe(403);
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

	it("applies strict typed GET_LIST filters, relation paths, and ordering", async () => {
		await createItem({ count: 1, id: "typed-1", name: "Shared" });
		await createItem({ count: 5, id: "typed-2", name: "Shared" });

		const listResponse = await fastify.inject({
			headers: adminHeaders,
			method: "GET",
			url: "/typed-items?limit=10&page=1&name[operator]=eq&name[value]=fn-Shared&count[operator]=gt&count[value]=0&owner.name[operator]=eq&owner.name[value]=Owner&orderBy=count&orderDirection=DESC",
		});

		expect(listResponse.statusCode).toBe(200);
		expect(listResponse.json().items.map((item: { id: string }) => item.id)).toEqual(["typed-2", "typed-1"]);
	});

	it("compiles case-insensitive typed membership predicates", async () => {
		await createItem({ count: 1, id: "typed-inl-1", name: "Alpha" });
		await createItem({ count: 2, id: "typed-inl-2", name: "Beta" });

		const response = await fastify.inject({
			headers: adminHeaders,
			method: "GET",
			url: "/typed-items?limit=10&page=1&name[operator]=inl&name[values]=fn-alpha&name[values]=fn-beta",
		});

		expect(response.statusCode).toBe(HttpStatus.OK);
		expect(
			response
				.json()
				.items.map((item: { id: string }) => item.id)
				.toSorted(),
		).toEqual(["typed-inl-1", "typed-inl-2"]);
	});

	it("returns FILTER_REQUIRED when a required typed filter is absent", async () => {
		const response = await fastify.inject({
			headers: adminHeaders,
			method: "GET",
			url: "/typed-items?limit=10&page=1",
		});

		expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
		expect(JSON.stringify(response.json())).toContain("FILTER_REQUIRED");
	});

	it("parses typed filters after route-before subscribers", async () => {
		await createItem({ count: 2, id: "typed-subscriber", name: "Injected" });

		const response = await fastify.inject({
			headers: adminHeaders,
			method: "GET",
			url: "/typed-items?limit=10&page=1&routeBeforeName=fn-Injected",
		});

		expect(response.statusCode).toBe(HttpStatus.OK);
		expect(response.json().items.map((item: { id: string }) => item.id)).toEqual(["typed-subscriber"]);
	});

	it("AND-merges typed client filters with authorization scope", async () => {
		await ownerService.repository.save({ id: E2E_OWNER_ID_OTHER, name: "Other Owner" });
		await service.repository.save([
			{
				count: 5,
				id: "typed-own-keep",
				name: "Keep",
				ownerId: E2E_OWNER_ID,
			},
			{
				count: 6,
				id: "typed-own-target",
				name: "Target",
				ownerId: E2E_OWNER_ID,
			},
			{
				count: 7,
				id: "typed-other-target",
				name: "Target",
				ownerId: E2E_OWNER_ID_OTHER,
			},
		]);

		const response = await fastify.inject({
			headers: adminHeaders,
			method: "GET",
			url: "/typed-items?limit=10&page=1&name[operator]=eq&name[value]=Target",
		});

		expect(response.statusCode).toBe(HttpStatus.OK);
		expect(response.json().items.map((item: { id: string }) => item.id)).toEqual(["typed-own-target"]);
	});

	it("AND-merges typed defaults with scope and lets a client group replace its field default", async () => {
		await ownerService.repository.save({ id: E2E_OWNER_ID_OTHER, name: "Other Owner" });
		await service.repository.save([
			{
				count: 5,
				id: "typed-default-own",
				name: "Own",
				ownerId: E2E_OWNER_ID,
			},
			{
				count: 7,
				id: "typed-default-other",
				name: "Other",
				ownerId: E2E_OWNER_ID_OTHER,
			},
			{
				count: 5,
				id: "typed-default-other-client",
				name: "Other Client Match",
				ownerId: E2E_OWNER_ID_OTHER,
			},
		]);

		const defaultResponse = await fastify.inject({
			headers: adminHeaders,
			method: "GET",
			url: "/default-typed-items?limit=10&page=1",
		});
		const clientResponse = await fastify.inject({
			headers: adminHeaders,
			method: "GET",
			url: "/default-typed-items?limit=10&page=1&count[operator]=eq&count[value]=5",
		});

		expect(defaultResponse.statusCode).toBe(HttpStatus.OK);
		expect(defaultResponse.json().items).toEqual([]);
		expect(clientResponse.statusCode).toBe(HttpStatus.OK);
		expect(clientResponse.json().items.map((item: { id: string }) => item.id)).toEqual(["typed-default-own"]);
	});

	it.each([
		["code[operator]=eq&code[value]=code-a&name[operator]=eq&name[value]=fn-Alpha", "INVALID_FILTER"],
		["owner.name.extra[operator]=eq&owner.name.extra[value]=Owner&name[operator]=eq&name[value]=fn-Alpha", "INVALID_FILTER"],
		["tags.id[operator]=eq&tags.id[value]=tag-1&name[operator]=eq&name[value]=fn-Alpha", "INVALID_FILTER"],
		["name[operatr]=eq&name[value]=fn-Alpha", "INVALID_FILTER"],
		["name[operator]=eq&name[value][extra]=fn-Alpha", "INVALID_FILTER"],
		["name[operator]=gt&name[value]=fn-Alpha", "INVALID_FILTER"],
		["count[operator]=between&count[values]=1&count[values]=2&count[values]=3&name[operator]=eq&name[value]=fn-Alpha", "INVALID_FILTER"],
		["count[operator]=eq&count[value]=1.5&name[operator]=eq&name[value]=fn-Alpha", "INVALID_FILTER"],
		["name[operator]=eq&name[value]=fn-Alpha&orderBy=owner.name&orderDirection=ASC", "INVALID_ORDER"],
	])("rejects invalid typed query contract input: %s", async (query, errorCode) => {
		const response = await fastify.inject({
			headers: adminHeaders,
			method: "GET",
			url: `/typed-items?limit=10&page=1&${query}`,
		});

		expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
		expect(JSON.stringify(response.json())).toContain(errorCode);
	});

	it("rejects membership filters above the configured cardinality cap", async () => {
		const values: string = Array.from({ length: 101 }, (_value: unknown, index: number): string => `name[values]=name-${String(index)}`).join("&");
		const response = await fastify.inject({
			headers: adminHeaders,
			method: "GET",
			url: `/typed-items?limit=10&page=1&name[operator]=inl&${values}`,
		});

		expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
		expect(JSON.stringify(response.json())).toContain("INVALID_FILTER");
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

	it("filters by explicit relation properties", async () => {
		await seedFilterItems();
		await ownerService.repository.save({ id: E2E_OWNER_ID_OTHER, name: "Other Owner" });
		await service.repository.save({
			count: 7,
			id: "filter-other-owner",
			name: "OtherOwner",
			ownerId: E2E_OWNER_ID_OTHER,
		});

		const unscopedAdminHeaders = {
			...adminHeaders,
			"x-user-permissions": "admin.item.unscoped",
		};

		const idMatchResponse = await fastify.inject({
			headers: unscopedAdminHeaders,
			method: "GET",
			url: `/items?limit=1&page=1&owner.id[operator]=eq&owner.id[value]=${E2E_OWNER_ID}`,
		});

		expect(idMatchResponse.statusCode).toBe(200);
		expect(idMatchResponse.json().items).toHaveLength(1);
		expect(idMatchResponse.json().totalCount).toBe(3);

		const idMissResponse = await fastify.inject({
			headers: unscopedAdminHeaders,
			method: "GET",
			url: `/items?limit=1&page=1&owner.id[operator]=eq&owner.id[value]=${E2E_OWNER_ID_OTHER}`,
		});

		expect(idMissResponse.statusCode).toBe(200);
		expect(idMissResponse.json().items).toHaveLength(1);
		expect(idMissResponse.json().items[0]?.id).toBe("filter-other-owner");
		expect(idMissResponse.json().totalCount).toBe(1);

		const nameMatchResponse = await fastify.inject({
			headers: unscopedAdminHeaders,
			method: "GET",
			url: "/items?limit=1&page=1&owner.name[operator]=eq&owner.name[value]=Owner",
		});

		expect(nameMatchResponse.statusCode).toBe(200);
		expect(nameMatchResponse.json().items).toHaveLength(1);
		expect(nameMatchResponse.json().totalCount).toBe(3);

		const nameMissResponse = await fastify.inject({
			headers: unscopedAdminHeaders,
			method: "GET",
			url: "/items?limit=1&page=1&owner.name[operator]=eq&owner.name[value]=Other%20Owner",
		});

		expect(nameMissResponse.statusCode).toBe(200);
		expect(nameMissResponse.json().items).toHaveLength(1);
		expect(nameMissResponse.json().items[0]?.id).toBe("filter-other-owner");
		expect(nameMissResponse.json().totalCount).toBe(1);

		const legacyRelationResponse = await fastify.inject({
			headers: unscopedAdminHeaders,
			method: "GET",
			url: `/items?limit=10&page=1&owner[operator]=eq&owner[value]=${E2E_OWNER_ID_OTHER}`,
		});

		expect(legacyRelationResponse.statusCode).toBe(200);
		expect(
			legacyRelationResponse
				.json()
				.items.map((item: { id: string }) => item.id)
				.sort(),
		).toEqual(["filter-1", "filter-2", "filter-3", "filter-other-owner"]);
		expect(legacyRelationResponse.json().totalCount).toBe(4);

		const invalidRelationResponse = await fastify.inject({
			headers: unscopedAdminHeaders,
			method: "GET",
			url: "/items?limit=10&page=1&owner.missing[operator]=eq&owner.missing[value]=Owner",
		});

		expect(invalidRelationResponse.statusCode).toBe(200);
		expect(
			invalidRelationResponse
				.json()
				.items.map((item: { id: string }) => item.id)
				.sort(),
		).toEqual(["filter-1", "filter-2", "filter-3", "filter-other-owner"]);
		expect(invalidRelationResponse.json().totalCount).toBe(4);

		const deeperRelationResponse = await fastify.inject({
			headers: unscopedAdminHeaders,
			method: "GET",
			url: "/items?limit=10&page=1&owner.name..deep[operator]=eq&owner.name..deep[value]=Owner",
		});

		expect(deeperRelationResponse.statusCode).toBe(200);
		expect(
			deeperRelationResponse
				.json()
				.items.map((item: { id: string }) => item.id)
				.sort(),
		).toEqual(["filter-1", "filter-2", "filter-3", "filter-other-owner"]);
		expect(deeperRelationResponse.json().totalCount).toBe(4);
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
		expect(E2eRouteSubscriber.events).toContain("route:before_error:getList");
		expect(E2eRouteSubscriber.events).not.toContain("route:after_error:getList");
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

	it("preserves free-form object fields in generated responses", async () => {
		const createResponse = await createItem({ id: "item-freeform-response", name: "Freeform", count: 1 });

		expect(createResponse.statusCode).toBe(201);
		expect(createResponse.json().authorizedEntity).toMatchObject({
			id: E2E_OWNER_ID,
		});
	});

	it("serializes nested manual object DTOs in generated responses", async () => {
		const document = {
			Statement: [
				{
					Effect: "Allow",
					Principal: {
						AWS: "arn:aws:iam::123456789012:root",
					},
				},
			],
			Version: "2012-10-17",
		};
		const createResponse = await createItem({
			count: 1,
			document,
			id: "item-manual-document",
			name: "ManualDocument",
		});

		expect(createResponse.statusCode).toBe(201);
		expect(createResponse.json().document).toEqual(document);

		const getResponse = await fastify.inject({
			headers: withSignature("item-manual-document"),
			method: "GET",
			url: "/items/item-manual-document",
		});

		expect(getResponse.statusCode).toBe(200);
		expect(getResponse.json().document).toEqual(document);
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

	it("reloads update response relations", async () => {
		await service.repository.save({
			count: 1,
			id: "item-update-relation",
			name: "UpdateRelation",
			ownerId: E2E_OWNER_ID,
		});

		const updateResponse = await fastify.inject({
			headers: adminHeaders,
			method: "PUT",
			payload: { count: 2, name: "UpdatedRelation" },
			url: "/items/item-update-relation",
		});

		expect(updateResponse.statusCode).toBe(200);
		expect(updateResponse.json().owner).toEqual({ id: E2E_OWNER_ID });
		const saved = await service.repository.findOne({
			relations: { owner: true },
			where: { id: "item-update-relation" },
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

	it("returns an empty array when getMany finds nothing", async () => {
		const manyResponse = await fastify.inject({
			headers: adminHeaders,
			method: "GET",
			url: "/function/many?ids=missing",
		});

		expect(manyResponse.statusCode).toBe(200);
		expect(manyResponse.json()).toEqual([]);
		expect(E2eFunctionSubscriber.events).toEqual(expect.arrayContaining(["function:before:getMany", "function:after:getMany"]));
		expect(E2eFunctionSubscriber.events).not.toContain("function:after_error:getMany");
	});

	it("executes ApiRouteCustom through the full request, response, subscriber, and serialization pipeline", async () => {
		const response = await fastify.inject({
			headers: adminHeaders,
			method: "POST",
			payload: { count: 3, id: "custom-route-1", name: "Original" },
			url: "/custom-route/echo/original-param?code=original-query",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
			code: "query-transformed",
			count: 3,
			id: "param-transformed",
			name: "custom-after-body-transformed",
			responseSignature: "sig-1",
		});
		expect(response.json()).not.toHaveProperty("hidden");
		expect(E2eCustomRouteSubscriber.events).toEqual(expect.arrayContaining(["custom-route:before:custom.echo", "custom-route:after:custom.echo"]));
	});

	it("executes discriminated ApiRouteCustom request and response DTOs", async () => {
		const response = await fastify.inject({
			headers: adminHeaders,
			method: "POST",
			payload: { channel: "email", email: "user@example.com" },
			url: "/custom-route/discriminated-registration",
		});

		expect(response.statusCode).toBe(201);
		expect(response.json()).toEqual({
			bodyClass: "E2eCustomRouteDiscriminatedEmailBodyDto",
			mode: "verification",
			verificationToken: "user@example.com",
		});
		expect(response.json()).not.toHaveProperty("hidden");
		expect(response.json()).not.toHaveProperty("sessionToken");
	});

	it("rejects discriminated ApiRouteCustom bodies with missing or invalid discriminators", async () => {
		const missingResponse = await fastify.inject({
			headers: adminHeaders,
			method: "POST",
			payload: { email: "user@example.com" },
			url: "/custom-route/discriminated-registration",
		});
		const invalidResponse = await fastify.inject({
			headers: adminHeaders,
			method: "POST",
			payload: { channel: "phone", email: "user@example.com" },
			url: "/custom-route/discriminated-registration",
		});

		expect(missingResponse.statusCode).toBe(400);
		expect(invalidResponse.statusCode).toBe(400);
		expect(Array.isArray(missingResponse.json().message)).toBe(true);
		expect(invalidResponse.json().message).toEqual([expect.stringContaining("channel has invalid discriminator value 'phone'")]);
	});

	it("runs validation for the selected discriminated ApiRouteCustom body variant", async () => {
		const response = await fastify.inject({
			headers: adminHeaders,
			method: "POST",
			payload: { channel: "email", email: 123 },
			url: "/custom-route/discriminated-registration",
		});

		expect(response.statusCode).toBe(400);
		expect(response.json().message).toEqual([expect.stringContaining("email must be a string")]);
	});

	it("honors shouldKeepDiscriminatorProperty for discriminated ApiRouteCustom bodies", async () => {
		const response = await fastify.inject({
			headers: adminHeaders,
			method: "POST",
			payload: { channel: "token", token: "one-click" },
			url: "/custom-route/discriminated-strip",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
			bodyClass: "E2eCustomRouteDiscriminatedStrippedBodyDto",
			token: "one-click",
		});
		expect(response.json()).not.toHaveProperty("channel");
	});

	it("fires custom route before_error hooks when request target validation fails", async () => {
		const response = await fastify.inject({
			headers: adminHeaders,
			method: "POST",
			payload: { count: 0, id: "custom-route-invalid", name: "Invalid" },
			url: "/custom-route/echo/original-param?code=original-query",
		});

		expect(response.statusCode).toBe(400);
		expect(E2eCustomRouteSubscriber.events).toContain("custom-route:before_error:custom.echo");
	});

	it("fires custom route after_error hooks when the handler fails", async () => {
		const response = await fastify.inject({
			headers: adminHeaders,
			method: "POST",
			payload: { count: 1, id: "throw-custom", name: "Throw" },
			url: "/custom-route/echo/original-param?code=original-query",
		});

		expect(response.statusCode).toBe(500);
		expect(E2eCustomRouteSubscriber.events).toContain("custom-route:after_error:custom.echo");
	});

	it("projects custom route relation responses using the configured reference shape", async () => {
		const createResponse = await createItem({ count: 1, id: "custom-route-relation", name: "Relation" });

		expect(createResponse.statusCode).toBe(201);

		const response = await fastify.inject({
			headers: adminHeaders,
			method: "GET",
			url: "/custom-route/relation/custom-route-relation",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json().owner).toBe(E2E_OWNER_ID);
	});

	it("hydrates custom route request relations before the handler runs", async () => {
		const response = await fastify.inject({
			headers: adminHeaders,
			method: "POST",
			payload: {
				owner: E2E_OWNER_ID,
			},
			url: "/custom-route/request-relation",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
			owner: E2E_OWNER_ID,
		});
	});

	it("loads and projects custom route array relation responses", async () => {
		await createItem({ count: 1, id: "custom-route-array-1", name: "RelationArrayOne" });
		await createItem({ count: 2, id: "custom-route-array-2", name: "RelationArrayTwo" });

		const response = await fastify.inject({
			headers: adminHeaders,
			method: "GET",
			url: "/custom-route/relations",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: "custom-route-array-1",
					owner: E2E_OWNER_ID,
				}),
				expect.objectContaining({
					id: "custom-route-array-2",
					owner: E2E_OWNER_ID,
				}),
			]),
		);
	});

	it("runs ApiFunctionCustom REQUIRED mode in a transaction through HTTP", async () => {
		const response = await fastify.inject({
			method: "POST",
			payload: { count: 1, id: "custom-required-1", name: "Required", ownerId: E2E_OWNER_ID },
			url: "/function/custom-required",
		});

		expect(response.statusCode).toBe(201);
		expect(response.json().name).toBe("custom-after-fn-custom-Required");
		expect(E2eFunctionSubscriber.events).toEqual(expect.arrayContaining(["function:before:custom.required", "function:before:custom.required:transaction", "function:after:custom.required", "function:before:create:transaction", "function:after:commit"]));
		expect(E2eFunctionSubscriber.transactionContexts).toHaveLength(1);
		expect(E2eFunctionSubscriber.transactionContexts[0]?.DATA.transaction.owner).toEqual({
			action: "custom.required",
			entityName: E2eEntity.name,
			functionType: EApiFunctionType.CUSTOM,
			kind: EApiFunctionTransactionOwnerKind.FUNCTION,
			methodName: "createWithCustomRequired",
		});
		expect(E2eFunctionSubscriber.transactionContexts[0]?.DATA.events).toHaveLength(2);
		expect(E2eFunctionSubscriber.transactionContexts[0]?.DATA.matchedEvents).toHaveLength(2);
		expect((await service.repository.findOne({ where: { id: "custom-required-1" } }))?.name).toBe("fn-custom-Required");
	});

	it("runs built-in ApiFunction REQUIRED mode in a transaction through HTTP", async () => {
		const response = await fastify.inject({
			method: "POST",
			payload: { count: 1, id: "builtin-required-1", name: "Required", ownerId: E2E_OWNER_ID },
			url: "/function/builtin-required",
		});

		expect(response.statusCode).toBe(201);
		expect(E2eFunctionSubscriber.events).toEqual(expect.arrayContaining(["function:before:create:transaction", "function:after:create", "function:after:commit"]));
		expect((await service.repository.findOne({ where: { id: "builtin-required-1" } }))?.name).toBe("fn-Required");
	});

	it("runs ApiFunctionCustom SUPPORTS mode without opening a transaction when none is active", async () => {
		const response = await fastify.inject({
			method: "POST",
			payload: { count: 1, id: "custom-supports-1", name: "Supports", ownerId: E2E_OWNER_ID },
			url: "/function/custom-supports",
		});

		expect(response.statusCode).toBe(201);
		expect(response.json().name).toBe("custom-after-fn-custom-Supports");
		expect(E2eFunctionSubscriber.events).toEqual(expect.arrayContaining(["function:before:custom.supports", "function:after:custom.supports"]));
		expect(E2eFunctionSubscriber.events).not.toContain("function:before:custom.supports:transaction");
		expect(E2eFunctionSubscriber.events).not.toContain("function:after:commit");
		expect(E2eFunctionSubscriber.transactionContexts).toHaveLength(0);
	});

	it("runs ApiFunctionStep inside an ApiFunctionCustom transaction through HTTP", async () => {
		const response = await fastify.inject({
			method: "POST",
			payload: { count: 1, id: "custom-step-1", name: "Step", ownerId: E2E_OWNER_ID },
			url: "/function/custom-step",
		});

		expect(response.statusCode).toBe(201);
		expect(response.json().name).toBe("custom-after-step-custom-Step");
		expect(E2eFunctionSubscriber.events).toEqual(expect.arrayContaining(["function:before:custom.step", "function:before:custom.step:transaction", "function:after:custom.step"]));
		expect(E2eFunctionSubscriber.events).not.toContain("function:before:step");
		expect(E2eFunctionSubscriber.events).not.toContain("function:after:step");
		expect(E2eFunctionSubscriber.events).not.toContain("function:before_error:step");
		expect(E2eFunctionSubscriber.events).not.toContain("function:after_error:step");
		expect(E2eFunctionSubscriber.events).toContain("function:after:commit");
		expect(E2eFunctionSubscriber.transactionContexts[0]?.DATA.events).toEqual([
			expect.objectContaining({
				action: "custom.step",
				functionType: EApiFunctionType.CUSTOM,
			}),
			expect.objectContaining({
				functionType: EApiFunctionTransactionTraceType.STEP,
				methodName: "createWithMandatoryStep",
			}),
		]);
		expect(E2eFunctionSubscriber.transactionContexts[0]?.DATA.matchedEvents).toHaveLength(1);
		expect(E2eFunctionSubscriber.transactionContexts[0]?.DATA.transaction.owner).toEqual({
			action: "custom.step",
			entityName: E2eEntity.name,
			functionType: EApiFunctionType.CUSTOM,
			kind: EApiFunctionTransactionOwnerKind.FUNCTION,
			methodName: "createWithCustomStep",
		});
		expect((await service.repository.findOne({ where: { id: "custom-step-1" } }))?.name).toBe("step-custom-Step");
	});

	it("rolls back ApiFunctionStep work when the owning custom function fails", async () => {
		const response = await fastify.inject({
			method: "POST",
			payload: { count: 1, id: "custom-step-rollback-1", name: "StepRollback", ownerId: E2E_OWNER_ID },
			url: "/function/custom-step-rollback",
		});

		expect(response.statusCode).toBe(500);
		expect(E2eFunctionSubscriber.events).toEqual(expect.arrayContaining(["function:before:custom.step.rollback", "function:before:custom.step.rollback:transaction", "function:after_error:custom.step.rollback"]));
		expect(E2eFunctionSubscriber.events).not.toContain("function:before:step");
		expect(E2eFunctionSubscriber.events).not.toContain("function:after:step");
		expect(E2eFunctionSubscriber.events).not.toContain("function:before_error:step");
		expect(E2eFunctionSubscriber.events).not.toContain("function:after_error:step");
		expect(E2eFunctionSubscriber.events).toContain("function:after:rollback");
		expect(E2eFunctionSubscriber.events).not.toContain("function:after:commit");
		expect(E2eFunctionSubscriber.transactionContexts[0]?.DATA.events).toEqual([
			expect.objectContaining({
				action: "custom.step.rollback",
				functionType: EApiFunctionType.CUSTOM,
			}),
			expect.objectContaining({
				functionType: EApiFunctionTransactionTraceType.STEP,
				methodName: "createWithFailingMandatoryStep",
			}),
		]);
		expect(E2eFunctionSubscriber.transactionContexts[0]?.DATA.matchedEvents).toHaveLength(1);
		expect(E2eFunctionSubscriber.transactionContexts[0]?.DATA.transaction.owner).toEqual({
			action: "custom.step.rollback",
			entityName: E2eEntity.name,
			functionType: EApiFunctionType.CUSTOM,
			kind: EApiFunctionTransactionOwnerKind.FUNCTION,
			methodName: "createWithFailingCustomStep",
		});
		expect(await service.repository.findOne({ where: { id: "custom-step-rollback-1" } })).toBeNull();
	});

	it("allows ApiFunctionStep to call a generated function without exposing step subscriber metadata", async () => {
		const response = await fastify.inject({
			method: "POST",
			payload: { count: 1, id: "custom-step-generated-1", name: "StepGenerated", ownerId: E2E_OWNER_ID },
			url: "/function/custom-step-generated",
		});

		expect(response.statusCode).toBe(201);
		expect(response.json().name).toBe("custom-after-fn-generated-step-custom-StepGenerated");
		expect(E2eFunctionSubscriber.events).toEqual(["function:before:custom.step.generated", "function:before:custom.step.generated:transaction", "function:priority:before:create", "function:before:create", "function:before:create:transaction", "function:priority:after:create", "function:after:create", "function:after:custom.step.generated", "function:after:commit"]);
		expect(E2eFunctionSubscriber.events).not.toContain("function:before:step");
		expect(E2eFunctionSubscriber.events).not.toContain("function:after:step");
		expect(E2eFunctionSubscriber.events).not.toContain("function:before_error:step");
		expect(E2eFunctionSubscriber.events).not.toContain("function:after_error:step");
		expect((await service.repository.findOne({ where: { id: "custom-step-generated-1" } }))?.name).toBe("fn-generated-step-custom-StepGenerated");
	});

	it("allows ApiFunctionStep to call a nested custom function without exposing step subscriber metadata", async () => {
		const response = await fastify.inject({
			method: "POST",
			payload: { count: 1, id: "custom-step-custom-1", name: "StepCustom", ownerId: E2E_OWNER_ID },
			url: "/function/custom-step-custom",
		});

		expect(response.statusCode).toBe(201);
		expect(response.json().name).toBe("custom-after-custom-after-fn-custom-nested-step-custom-StepCustom");
		expect(E2eFunctionSubscriber.events).toEqual(["function:before:custom.step.custom", "function:before:custom.step.custom:transaction", "function:before:custom.mandatory", "function:before:custom.mandatory:transaction", "function:priority:before:create", "function:before:create", "function:before:create:transaction", "function:priority:after:create", "function:after:create", "function:after:custom.mandatory", "function:after:custom.step.custom", "function:after:commit"]);
		expect(E2eFunctionSubscriber.events).not.toContain("function:before:step");
		expect(E2eFunctionSubscriber.events).not.toContain("function:after:step");
		expect(E2eFunctionSubscriber.events).not.toContain("function:before_error:step");
		expect(E2eFunctionSubscriber.events).not.toContain("function:after_error:step");
		expect((await service.repository.findOne({ where: { id: "custom-step-custom-1" } }))?.name).toBe("fn-custom-nested-step-custom-StepCustom");
	});

	it("runs built-in ApiFunction SUPPORTS mode without opening a transaction when none is active", async () => {
		const response = await fastify.inject({
			method: "POST",
			payload: { count: 1, id: "builtin-supports-1", name: "Supports", ownerId: E2E_OWNER_ID },
			url: "/function/builtin-supports",
		});

		expect(response.statusCode).toBe(201);
		expect(E2eFunctionSubscriber.events).toEqual(expect.arrayContaining(["function:before:create", "function:after:create"]));
		expect(E2eFunctionSubscriber.events).not.toContain("function:before:create:transaction");
	});

	it("fails ApiFunctionCustom MANDATORY mode without an active transaction through HTTP", async () => {
		const response = await fastify.inject({
			method: "POST",
			payload: { count: 1, id: "custom-mandatory-1", name: "Mandatory", ownerId: E2E_OWNER_ID },
			url: "/function/custom-mandatory",
		});

		expect(response.statusCode).toBe(500);
		expect(await service.repository.findOne({ where: { id: "custom-mandatory-1" } })).toBeNull();
		expect(E2eFunctionSubscriber.events).toContain("function:before_error:custom.mandatory");
	});

	it("fires ApiFunctionCustom before_error when a before hook fails through HTTP", async () => {
		const response = await fastify.inject({
			method: "POST",
			payload: { count: 1, id: "custom-before-error", name: "BeforeError", ownerId: E2E_OWNER_ID },
			url: "/function/custom-supports",
		});

		expect(response.statusCode).toBe(500);
		expect(await service.repository.findOne({ where: { id: "custom-before-error" } })).toBeNull();
		expect(E2eFunctionSubscriber.events).toContain("function:before_error:custom.supports");
		expect(E2eFunctionSubscriber.events).not.toContain("function:after_error:custom.supports");
	});

	it("fails built-in ApiFunction MANDATORY mode without an active transaction through HTTP", async () => {
		const response = await fastify.inject({
			method: "POST",
			payload: { count: 1, id: "builtin-mandatory-1", name: "Mandatory", ownerId: E2E_OWNER_ID },
			url: "/function/builtin-mandatory",
		});

		expect(response.statusCode).toBe(500);
		expect(await service.repository.findOne({ where: { id: "builtin-mandatory-1" } })).toBeNull();
	});

	it("fails ApiFunctionCustom NONE mode inside an active transaction through HTTP", async () => {
		const response = await fastify.inject({
			method: "POST",
			payload: { count: 1, id: "custom-none-1", name: "None", ownerId: E2E_OWNER_ID },
			url: "/function/custom-none-inside-transaction",
		});

		expect(response.statusCode).toBe(500);
		expect(await service.repository.findOne({ where: { id: "custom-none-1" } })).toBeNull();
		expect(E2eFunctionSubscriber.events).toContain("function:before_error:custom.none");
	});

	it("fails built-in ApiFunction NONE mode inside an active transaction through HTTP", async () => {
		const response = await fastify.inject({
			method: "POST",
			payload: { count: 1, id: "builtin-none-1", name: "None", ownerId: E2E_OWNER_ID },
			url: "/function/builtin-none-inside-transaction",
		});

		expect(response.statusCode).toBe(500);
		expect(await service.repository.findOne({ where: { id: "builtin-none-1" } })).toBeNull();
	});

	it("exposes authorization cache invalidation through the Nest module", () => {
		const invalidateSpy = vi.spyOn(policyRegistry, "invalidateCache");

		cacheInvalidationService.invalidate(E2eEntity);
		cacheInvalidationService.invalidate();

		expect(invalidateSpy).toHaveBeenNthCalledWith(1, E2eEntity);
		expect(invalidateSpy).toHaveBeenNthCalledWith(2, undefined);
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

	it("rejects object relation references when the route requires scalar references", async () => {
		const createResponse = await fastify.inject({
			headers: adminHeaders,
			method: "POST",
			payload: { count: 1, id: "item-object-relation", name: "ObjectRelation", owner: { id: E2E_OWNER_ID } },
			url: "/items",
		});

		expect(createResponse.statusCode).toBe(400);
		expect(createResponse.json()).toMatchObject({
			error: "Bad Request",
			message: ["owner must be a UUID"],
			statusCode: 400,
		});
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

	it("returns 404 when relation id is invalid", async () => {
		const createResponse = await fastify.inject({
			headers: adminHeaders,
			method: "POST",
			payload: { id: "item-5", name: "BadOwner", owner: E2E_OWNER_ID_OTHER, count: 1 },
			url: "/items",
		});

		expect(createResponse.statusCode).toBe(404);
		expect(createResponse.json()).toMatchObject({
			error: "Not Found",
			message: "E2EOWNERENTITY_NOT_FOUND",
			statusCode: 404,
		});
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
		expect(E2eRouteSubscriber.events).toContain("route:before_error:create");
		expect(E2eRouteSubscriber.events).not.toContain("route:after_error:create");
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
		expect(E2eRouteSubscriber.events).toContain("route:before_error:create");
		expect(E2eRouteSubscriber.events).not.toContain("route:after_error:create");
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
		expect(E2eRouteSubscriber.events).not.toContain("route:after_error:create");
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

		expect(E2eRouteSubscriber.events).toEqual(expect.arrayContaining(["route:before_error:get", "route:before_error:delete", "route:before_error:partialUpdate", "route:before_error:update"]));
		expect(E2eRouteSubscriber.events).not.toEqual(expect.arrayContaining(["route:after_error:get", "route:after_error:delete", "route:after_error:partialUpdate", "route:after_error:update"]));
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
