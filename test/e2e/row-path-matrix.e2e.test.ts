import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { DataSource } from "typeorm";

import { ValidationPipe } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { getDataSourceToken, TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../src/index";
import { e2eAuthorizationPrincipalResolver } from "./app/principal-resolver";
import { ROW_PATH_MATRIX_CONTROLLERS, ROW_PATH_MATRIX_ENTITIES, ROW_PATH_MATRIX_PROVIDERS, RowPathCursorOrderController, RowPathOptionalController, RowPathOrderController, RowPathOrderFunctionSubscriber, RowPathOrderRouteSubscriber, RowPathTenantOrderController, RowPathWildcardController, rowPathIamAttachmentSource, rowPathIamDocumentSource } from "./row-path/matrix.fixture";

type TResponse = { body: string; json: () => unknown; statusCode: number };

const CUSTOMER_FIRST: string = "cccccccc-0000-4000-8000-000000000001";
const CUSTOMER_SECOND: string = "cccccccc-0000-4000-8000-000000000002";
const ORDER_A: string = "aaaaaaaa-0000-4000-8000-000000000001";
const ORDER_B: string = "aaaaaaaa-0000-4000-8000-000000000002";
const ORDER_SHARED_ID: string = "aaaaaaaa-0000-4000-8000-000000000003";
const OWNER: string = "owner-a";
const OWNER_FOREIGN: string = "owner-b";
const TENANT: string = "bbbbbbbb-0000-4000-8000-000000000001";
const TENANT_FOREIGN: string = "bbbbbbbb-0000-4000-8000-000000000002";

describe.each<"postgres" | "sqlite">(["postgres", "sqlite"])("row path matrix on %s (E2E)", (driver: "postgres" | "sqlite") => {
	let app: INestApplication;
	let container: StartedPostgreSqlContainer | undefined;
	let dataSource: DataSource;
	let fastify: { inject: (options: object) => Promise<TResponse> };

	const send = async (method: string, url: string, payload?: object, ownerId?: string): Promise<TResponse> => await fastify.inject({ headers: { ...(payload && { "content-type": "application/json" }), ...(ownerId && { "x-owner-id": ownerId }) }, method, payload, url });

	const storedName = async (tenantId: string, id: string): Promise<string | undefined> => {
		const rows: Array<{ name: string }> = (await dataSource.query(`SELECT "name" FROM row_path_matrix_orders WHERE "tenantId" = '${tenantId}' AND "id" = '${id}'`)) as Array<{ name: string }>;

		return rows[0]?.name;
	};

	beforeAll(async () => {
		container = driver === "postgres" ? await new PostgreSqlContainer("postgres:17-alpine").start() : undefined;

		const reference = await Test.createTestingModule({
			controllers: [...ROW_PATH_MATRIX_CONTROLLERS, ...(container ? [RowPathCursorOrderController] : [])],
			imports: [
				TypeOrmModule.forRoot(container ? { entities: ROW_PATH_MATRIX_ENTITIES, synchronize: true, type: "postgres", url: container.getConnectionUri() } : { database: ":memory:", entities: ROW_PATH_MATRIX_ENTITIES, synchronize: true, type: "better-sqlite3" }),
				TypeOrmModule.forFeature(ROW_PATH_MATRIX_ENTITIES),
				ApiAuthorizationModule.forRoot({ iam: { attachmentSources: [rowPathIamAttachmentSource], documentSources: [rowPathIamDocumentSource] }, principalResolver: e2eAuthorizationPrincipalResolver }),
				ApiSubscriberModule,
			],
			providers: [{ provide: APP_PIPE, useValue: new ValidationPipe({ forbidNonWhitelisted: true, skipMissingProperties: true, transform: true, whitelist: true }) }, ...ROW_PATH_MATRIX_PROVIDERS],
		}).compile();

		app = reference.createNestApplication(new FastifyAdapter());
		await app.init();
		fastify = app.getHttpAdapter().getInstance() as { inject: (options: object) => Promise<TResponse> };
		dataSource = app.get<DataSource>(getDataSourceToken());
	}, 120_000);

	afterAll(async () => {
		await app?.close();
		await container?.stop();
	});

	beforeEach(async () => {
		await dataSource.query("DELETE FROM row_path_matrix_notes");
		await dataSource.query("DELETE FROM row_path_matrix_lines");
		await dataSource.query("DELETE FROM row_path_matrix_assets");
		await dataSource.query("DELETE FROM row_path_matrix_orders");
		await dataSource.query("DELETE FROM row_path_matrix_shapes");
		await dataSource.query("DELETE FROM row_path_matrix_customers");
		await dataSource.query(`INSERT INTO row_path_matrix_customers ("id", "name") VALUES ('${CUSTOMER_FIRST}', 'First'), ('${CUSTOMER_SECOND}', 'Second')`);
		await dataSource.query(`INSERT INTO row_path_matrix_orders ("tenantId", "id", "name", "ownerId", "customerId") VALUES ('${TENANT}', '${ORDER_A}', 'a', '${OWNER}', '${CUSTOMER_FIRST}'), ('${TENANT}', '${ORDER_B}', 'b', '${OWNER_FOREIGN}', NULL), ('${TENANT}', '${ORDER_SHARED_ID}', 'shared-own', '${OWNER}', NULL), ('${TENANT_FOREIGN}', '${ORDER_SHARED_ID}', 'shared-foreign', '${OWNER}', '${CUSTOMER_SECOND}')`);
		await dataSource.query(`INSERT INTO row_path_matrix_lines ("id", "label", "orderTenantId", "orderId") VALUES ('line-1', 'one', '${TENANT}', '${ORDER_A}'), ('line-2', 'two', '${TENANT}', '${ORDER_A}'), ('line-3', 'foreign', '${TENANT_FOREIGN}', '${ORDER_SHARED_ID}')`);
		await dataSource.query(`INSERT INTO row_path_matrix_notes ("id", "text", "orderTenantId", "orderId") VALUES ('note-1', 'own', '${TENANT}', '${ORDER_SHARED_ID}'), ('note-2', 'foreign', '${TENANT_FOREIGN}', '${ORDER_SHARED_ID}')`);
		await dataSource.query(`INSERT INTO row_path_matrix_shapes ("groupId", "id", "kind", "radius", "side") VALUES ('group-1', 'circle', 'CIRCLE', '5', NULL), ('group-1', 'square', 'SQUARE', NULL, '7'), ('group-2', 'circle', 'CIRCLE', '9', NULL)`);
		RowPathOrderFunctionSubscriber.reset();
		RowPathOrderRouteSubscriber.reset();
	});

	describe("eager relations on a composite key", () => {
		it("GET returns the eager to-one and to-many relations of the addressed row", async () => {
			const response: TResponse = await send("GET", `/matrix/order/${TENANT}/${ORDER_A}`);
			const body = response.json() as { customer: { id: string }; lines: Array<{ id: string }> };

			expect(response.statusCode).toBe(200);
			expect(body.customer.id).toBe(CUSTOMER_FIRST);
			expect(body.lines.map(({ id }) => id).toSorted()).toEqual(["line-1", "line-2"]);
		});

		it("PATCH and PUT keep the stored eager relations", async () => {
			expect((await send("PATCH", `/matrix/order/${TENANT}/${ORDER_A}`, { name: "patched" })).statusCode).toBe(200);
			expect((await send("PUT", `/matrix/order/${TENANT}/${ORDER_A}`, { name: "put", ownerId: OWNER })).statusCode).toBe(200);
			expect(await storedName(TENANT, ORDER_A)).toBe("put");

			const lines = (await dataSource.query(`SELECT "id" FROM row_path_matrix_lines WHERE "orderId" = '${ORDER_A}' ORDER BY "id"`)) as Array<{ id: string }>;
			const orders = (await dataSource.query(`SELECT "customerId" FROM row_path_matrix_orders WHERE "id" = '${ORDER_A}'`)) as Array<{ customerId: string }>;

			expect(lines.map(({ id }) => id)).toEqual(["line-1", "line-2"]);
			expect(orders).toEqual([{ customerId: CUSTOMER_FIRST }]);
		});

		it("two tenants sharing an id keep their own rows and children", async () => {
			const own = (await send("GET", `/matrix/order/${TENANT}/${ORDER_SHARED_ID}`)).json() as { lines: Array<unknown>; name: string };
			const foreign = (await send("GET", `/matrix/order/${TENANT_FOREIGN}/${ORDER_SHARED_ID}`)).json() as { lines: Array<{ id: string }>; name: string };

			expect(own.name).toBe("shared-own");
			expect(own.lines).toEqual([]);
			expect(foreign.name).toBe("shared-foreign");
			expect(foreign.lines.map(({ id }) => id)).toEqual(["line-3"]);
		});

		it("DELETE removes only the addressed row", async () => {
			expect((await send("DELETE", `/matrix/order/${TENANT}/${ORDER_SHARED_ID}`)).statusCode).toBe(204);
			expect(await storedName(TENANT, ORDER_SHARED_ID)).toBeUndefined();
			expect(await storedName(TENANT_FOREIGN, ORDER_SHARED_ID)).toBe("shared-foreign");
		});
	});

	describe("a manual PARAMETERS DTO on a default composite key", () => {
		it("answers 400 when the DTO leaves a key column out, and reaches no row", async () => {
			expect((await send("GET", `/matrix/manual-order/${TENANT}/${ORDER_A}`)).statusCode).toBe(400);
		});
	});

	describe("custom column order", () => {
		it("addresses the row by the declared order and refuses the default one", async () => {
			const response: TResponse = await send("GET", `/matrix/order-reversed/${ORDER_SHARED_ID}/${TENANT_FOREIGN}`);

			expect(response.statusCode).toBe(200);
			expect((response.json() as { name: string }).name).toBe("shared-foreign");
			expect((await send("GET", `/matrix/order-reversed/${TENANT_FOREIGN}/${ORDER_SHARED_ID}`)).statusCode).toBe(404);
		});
	});

	describe("pathScope with relations", () => {
		it("GET loads relations.response include for the row of the bound tenant", async () => {
			const response: TResponse = await send("GET", `/matrix/tenant/${TENANT}/order/${ORDER_SHARED_ID}`);
			const body = response.json() as { name: string; notes: Array<{ id: string }> };

			expect(response.statusCode).toBe(200);
			expect(body.name).toBe("shared-own");
			expect(body.notes.map(({ id }) => id)).toEqual(["note-1"]);
		});

		it("GET answers 404 for a row of another tenant", async () => {
			expect((await send("GET", `/matrix/tenant/${TENANT_FOREIGN}/order/${ORDER_A}`)).statusCode).toBe(404);
		});

		it("GET_LIST PAGE lists only the bound tenant with its relations", async () => {
			const response: TResponse = await send("GET", `/matrix/tenant/${TENANT_FOREIGN}/order?limit=10&page=1`);
			const body = response.json() as { items: Array<{ customer: { id: string }; lines: Array<{ id: string }>; name: string; notes: Array<{ id: string }> }>; totalCount: number };

			expect(response.statusCode).toBe(200);
			expect(body.totalCount).toBe(1);
			expect(body.items[0]?.name).toBe("shared-foreign");
			expect(body.items[0]?.customer.id).toBe(CUSTOMER_SECOND);
			expect(body.items[0]?.lines.map(({ id }) => id)).toEqual(["line-3"]);
			expect(body.items[0]?.notes.map(({ id }) => id)).toEqual(["note-2"]);
		});

		it("CREATE takes the tenant from the path and resolves relations.request", async () => {
			const response: TResponse = await send("POST", `/matrix/tenant/${TENANT_FOREIGN}/order`, { customer: CUSTOMER_FIRST, name: "created", ownerId: OWNER });
			const body = response.json() as { id: string; tenantId: string };

			expect(response.statusCode).toBe(201);
			expect(body.tenantId).toBe(TENANT_FOREIGN);
			expect(await storedName(TENANT_FOREIGN, body.id)).toBe("created");

			const orders = (await dataSource.query(`SELECT "customerId" FROM row_path_matrix_orders WHERE "id" = '${body.id}'`)) as Array<{ customerId: string }>;

			expect(orders).toEqual([{ customerId: CUSTOMER_FIRST }]);
		});

		it("the BODY DTO drops the bound field, so a whitelisting pipe refuses it", async () => {
			const response: TResponse = await send("POST", `/matrix/tenant/${TENANT}/order`, { name: "created", ownerId: OWNER, tenantId: TENANT });

			expect(response.statusCode).toBe(400);
			expect(response.body).toContain("tenantId");
		});

		it("PATCH resolves relations.request and writes only the bound row", async () => {
			expect((await send("PATCH", `/matrix/tenant/${TENANT}/order/${ORDER_SHARED_ID}`, { customer: CUSTOMER_FIRST, name: "patched" })).statusCode).toBe(200);
			expect(await storedName(TENANT, ORDER_SHARED_ID)).toBe("patched");
			expect(await storedName(TENANT_FOREIGN, ORDER_SHARED_ID)).toBe("shared-foreign");
		});

		it("PATCH, PUT and DELETE of a row of another tenant answer 404 without a change", async () => {
			expect((await send("PATCH", `/matrix/tenant/${TENANT_FOREIGN}/order/${ORDER_A}`, { name: "x" })).statusCode).toBe(404);
			expect((await send("PUT", `/matrix/tenant/${TENANT_FOREIGN}/order/${ORDER_A}`, { name: "x", ownerId: OWNER })).statusCode).toBe(404);
			expect((await send("DELETE", `/matrix/tenant/${TENANT_FOREIGN}/order/${ORDER_A}`)).statusCode).toBe(404);
			expect(await storedName(TENANT, ORDER_A)).toBe("a");
		});

		it("a malformed row parameter answers 400", async () => {
			expect((await send("GET", `/matrix/tenant/${TENANT}/order/not-a-uuid`)).statusCode).toBe(400);
			expect((await send("PATCH", `/matrix/tenant/${TENANT}/order/not-a-uuid`, { name: "x" })).statusCode).toBe(400);
		});
	});

	describe("GET_LIST CURSOR under pathScope", () => {
		it.runIf(driver === "postgres")("lists only the bound tenant and refuses a cursor of another path", async () => {
			const first: TResponse = await send("GET", `/matrix/tenant/${TENANT}/order-cursor?limit=1`);
			const body = first.json() as { items: Array<{ id: string }>; nextCursor?: string };

			expect(first.statusCode).toBe(200);
			expect(body.items).toHaveLength(1);
			expect(body.nextCursor).toBeTruthy();

			const second = (await send("GET", `/matrix/tenant/${TENANT}/order-cursor?limit=10&after=${encodeURIComponent(String(body.nextCursor))}`)).json() as { items: Array<{ id: string }> };

			expect([...body.items, ...second.items].map(({ id }) => id).toSorted()).toEqual([ORDER_A, ORDER_B, ORDER_SHARED_ID]);
			expect((await send("GET", `/matrix/tenant/${TENANT_FOREIGN}/order-cursor?limit=10&after=${encodeURIComponent(String(body.nextCursor))}`)).statusCode).toBe(400);
		});
	});

	describe("identity on GET", () => {
		it("reads the row by the alias under the bound tenant", async () => {
			const own = await send("GET", `/matrix/alias/${TENANT}/order/${ORDER_SHARED_ID}`);
			const foreign = await send("GET", `/matrix/alias/${TENANT_FOREIGN}/order/${ORDER_SHARED_ID}`);

			expect((own.json() as { name: string }).name).toBe("shared-own");
			expect((foreign.json() as { name: string }).name).toBe("shared-foreign");
			expect((await send("GET", `/matrix/alias/${TENANT_FOREIGN}/order/${ORDER_A}`)).statusCode).toBe(404);
		});
	});

	describe.each([
		["HOOKS with pathScope", "matrix/hooks"],
		["IAM with pathScope", "matrix/iam"],
	])("%s", (_label: string, prefix: string) => {
		it("reads and lists only rows inside both the path and the owner scope", async () => {
			expect((await send("GET", `/${prefix}/${TENANT}/order/${ORDER_A}`, undefined, OWNER)).statusCode).toBe(200);
			expect((await send("GET", `/${prefix}/${TENANT}/order/${ORDER_A}`, undefined, OWNER_FOREIGN)).statusCode).toBe(404);
			expect((await send("GET", `/${prefix}/${TENANT_FOREIGN}/order/${ORDER_A}`, undefined, OWNER)).statusCode).toBe(404);

			const list = (await send("GET", `/${prefix}/${TENANT}/order?limit=10&page=1`, undefined, OWNER)).json() as { items: Array<{ id: string }> };

			expect(list.items.map(({ id }) => id).toSorted()).toEqual([ORDER_A, ORDER_SHARED_ID]);
		});

		it("PATCH, PUT and DELETE outside the owner scope change nothing", async () => {
			expect((await send("PATCH", `/${prefix}/${TENANT}/order/${ORDER_A}`, { name: "x" }, OWNER_FOREIGN)).statusCode).toBe(404);
			expect((await send("PUT", `/${prefix}/${TENANT}/order/${ORDER_A}`, { name: "x", ownerId: OWNER_FOREIGN }, OWNER_FOREIGN)).statusCode).toBe(404);
			expect((await send("DELETE", `/${prefix}/${TENANT}/order/${ORDER_A}`, undefined, OWNER_FOREIGN)).statusCode).toBe(404);
			expect(await storedName(TENANT, ORDER_A)).toBe("a");
		});

		it("PATCH and DELETE inside both scopes reach the addressed row", async () => {
			expect((await send("PATCH", `/${prefix}/${TENANT}/order/${ORDER_SHARED_ID}`, { name: "patched" }, OWNER)).statusCode).toBe(200);
			expect(await storedName(TENANT, ORDER_SHARED_ID)).toBe("patched");
			expect(await storedName(TENANT_FOREIGN, ORDER_SHARED_ID)).toBe("shared-foreign");
			expect((await send("DELETE", `/${prefix}/${TENANT}/order/${ORDER_SHARED_ID}`, undefined, OWNER)).statusCode).toBe(204);
			expect(await storedName(TENANT, ORDER_SHARED_ID)).toBeUndefined();
			expect(await storedName(TENANT_FOREIGN, ORDER_SHARED_ID)).toBe("shared-foreign");
		});
	});

	describe("HOOKS on a default composite key", () => {
		it("applies the owner scope to every route", async () => {
			expect((await send("GET", `/matrix/hooks-order/${TENANT}/${ORDER_A}`, undefined, OWNER)).statusCode).toBe(200);
			expect((await send("GET", `/matrix/hooks-order/${TENANT}/${ORDER_B}`, undefined, OWNER)).statusCode).toBe(404);
			expect((await send("PATCH", `/matrix/hooks-order/${TENANT}/${ORDER_B}`, { name: "x" }, OWNER)).statusCode).toBe(404);
			expect((await send("DELETE", `/matrix/hooks-order/${TENANT}/${ORDER_B}`, undefined, OWNER)).statusCode).toBe(404);
			expect(await storedName(TENANT, ORDER_B)).toBe("b");
		});
	});

	describe("subscribers", () => {
		it("function and route subscribers run on a bound write", async () => {
			expect((await send("PATCH", `/matrix/tenant/${TENANT}/order/${ORDER_A}`, { name: "patched" })).statusCode).toBe(200);
			expect(RowPathOrderRouteSubscriber.events).toEqual(["route:partialUpdate"]);
			expect(RowPathOrderFunctionSubscriber.events).toHaveLength(1);
			expect(RowPathOrderFunctionSubscriber.events[0]).toMatch(/^function:update:/u);

			RowPathOrderFunctionSubscriber.reset();
			RowPathOrderRouteSubscriber.reset();

			expect((await send("DELETE", `/matrix/tenant/${TENANT}/order/${ORDER_A}`)).statusCode).toBe(204);
			expect(RowPathOrderRouteSubscriber.events).toEqual(["route:delete"]);
			expect(RowPathOrderFunctionSubscriber.events[0]).toMatch(/^function:delete:/u);
		});

		it("no write subscriber runs when the path names a row of another tenant", async () => {
			expect((await send("PATCH", `/matrix/tenant/${TENANT_FOREIGN}/order/${ORDER_A}`, { name: "x" })).statusCode).toBe(404);
			expect(RowPathOrderFunctionSubscriber.events).toEqual([]);
		});
	});

	describe.each(["none", "supports", "required", "mandatory"])("transaction mode %s", (mode: string) => {
		const base: string = `/matrix/transaction/${mode}`;

		it("reads and writes the bound row and refuses another tenant", async () => {
			expect((await send("GET", `${base}/${TENANT}/order/${ORDER_SHARED_ID}`)).statusCode).toBe(200);
			expect((await send("PATCH", `${base}/${TENANT}/order/${ORDER_SHARED_ID}`, { name: "patched" })).statusCode).toBe(200);
			expect((await send("PUT", `${base}/${TENANT}/order/${ORDER_SHARED_ID}`, { name: "put", ownerId: OWNER })).statusCode).toBe(200);
			expect(await storedName(TENANT, ORDER_SHARED_ID)).toBe("put");
			expect(await storedName(TENANT_FOREIGN, ORDER_SHARED_ID)).toBe("shared-foreign");
			expect((await send("PATCH", `${base}/${TENANT_FOREIGN}/order/${ORDER_A}`, { name: "x" })).statusCode).toBe(404);
			expect((await send("DELETE", `${base}/${TENANT_FOREIGN}/order/${ORDER_A}`)).statusCode).toBe(404);
			expect(await storedName(TENANT, ORDER_A)).toBe("a");
			expect((await send("DELETE", `${base}/${TENANT}/order/${ORDER_SHARED_ID}`)).statusCode).toBe(204);
			expect(await storedName(TENANT_FOREIGN, ORDER_SHARED_ID)).toBe("shared-foreign");
		});

		it("CREATE takes the tenant from the path", async () => {
			const response: TResponse = await send("POST", `${base}/${TENANT_FOREIGN}/order`, { name: "created", ownerId: OWNER });

			expect(response.statusCode).toBe(201);
			expect((response.json() as { tenantId: string }).tenantId).toBe(TENANT_FOREIGN);
		});
	});

	describe("table inheritance root under pathScope", () => {
		it("GET reads the variant of the bound group", async () => {
			const response: TResponse = await send("GET", "/matrix/group/group-2/shape/circle");

			expect(response.statusCode).toBe(200);
			expect(response.json()).toMatchObject({ groupId: "group-2", id: "circle", kind: "CIRCLE", radius: "9" });
			expect((await send("GET", "/matrix/group/group-2/shape/square")).statusCode).toBe(404);
		});

		it("GET_LIST lists the variants of the bound group only", async () => {
			const body = (await send("GET", "/matrix/group/group-1/shape?limit=10&page=1")).json() as { items: Array<Record<string, unknown>> };

			expect(body.items).toHaveLength(2);
			expect(body.items.map(({ kind }) => kind).toSorted()).toEqual(["CIRCLE", "SQUARE"]);
		});
	});

	describe("custom routes", () => {
		it("run next to generated routes on the same controller", async () => {
			const response: TResponse = await send("GET", `/matrix/tenant/${TENANT}/order/ping`);

			expect(response.statusCode).toBe(200);
			expect(response.json()).toEqual({ tenantId: TENANT });
		});

		it("load response relations for the row the handler returned", async () => {
			const response: TResponse = await send("GET", `/matrix/tenant/${TENANT_FOREIGN}/order/by-name/shared-foreign`);
			const body = response.json() as { name: string; notes: Array<{ id: string }>; tenantId: string };

			expect(response.statusCode).toBe(200);
			expect(body.tenantId).toBe(TENANT_FOREIGN);
			expect(body.name).toBe("shared-foreign");
			expect(body.notes.map(({ id }) => id)).toEqual(["note-2"]);
		});
	});

	describe("controllers with custom routes only", () => {
		it("start with four unbound parameters", async () => {
			const response: TResponse = await send("GET", "/matrix/gateway/eu/z1/r2/s3/status");

			expect(response.statusCode).toBe(200);
			expect(response.json()).toEqual({ rack: "r2", region: "eu", slot: "s3", zone: "z1" });
		});

		it("start with a wildcard parameter", () => {
			expect(RowPathWildcardController).toBeDefined();
		});

		it("start with an optional parameter", () => {
			expect(RowPathOptionalController).toBeDefined();
		});
	});

	describe("body conflict with a bound relation key", () => {
		it("CREATE refuses a relation pointing past the bound join column without echoing it", async () => {
			const response: TResponse = await send("POST", `/matrix/customer/${CUSTOMER_FIRST}/asset`, { name: "asset", owner: { id: CUSTOMER_SECOND } });

			expect(response.statusCode).toBe(400);
			expect(response.body).not.toContain(CUSTOMER_SECOND);
			expect((await dataSource.query("SELECT * FROM row_path_matrix_assets")) as Array<unknown>).toEqual([]);
		});

		it("CREATE takes the bound join column from the path", async () => {
			const response: TResponse = await send("POST", `/matrix/customer/${CUSTOMER_SECOND}/asset`, { name: "asset" });

			expect(response.statusCode).toBe(201);
			expect((response.json() as { ownerId: string }).ownerId).toBe(CUSTOMER_SECOND);
		});
	});

	describe("OpenAPI", () => {
		it("describes every path parameter once and keeps bound fields out of the body", () => {
			const document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
			const names = (path: string, method: string): Array<string> => ((document.paths[path] as Record<string, { parameters: Array<{ in: string; name: string }> }>)[method]?.parameters ?? []).filter((parameter) => parameter.in === "path").map(({ name }) => name);

			expect(names("/matrix/order/{tenantId}/{id}", "get")).toEqual(["tenantId", "id"]);
			expect(names("/matrix/order-reversed/{id}/{tenantId}", "get")).toEqual(["id", "tenantId"]);
			expect(names("/matrix/tenant/{tenantId}/order/{id}", "patch")).toEqual(["tenantId", "id"]);
			expect(names("/matrix/tenant/{tenantId}/order", "post")).toEqual(["tenantId"]);
			expect(names("/matrix/tenant/{tenantId}/order", "get")).toEqual(["tenantId"]);

			const schemas = document.components?.schemas as Record<string, { properties?: Record<string, unknown> }>;

			for (const schemaName of ["RowPathTenantOrderCreateBodyDTO", "RowPathTenantOrderPartialUpdateBodyDTO", "RowPathTenantOrderUpdateBodyDTO"]) {
				expect(schemas[schemaName]?.properties).toHaveProperty("name");
				expect(schemas[schemaName]?.properties).not.toHaveProperty("tenantId");
			}
		});

		it.each([
			["get", "RowPathOrderGetParametersDTO", RowPathOrderController],
			["get", "RowPathTenantOrderGetParametersDTO", RowPathTenantOrderController],
			["getList", "RowPathTenantOrderGetListParametersDTO", RowPathTenantOrderController],
			["partialUpdate", "RowPathTenantOrderPartialUpdateParametersDTO", RowPathTenantOrderController],
			["delete", "RowPathTenantOrderDeleteParametersDTO", RowPathTenantOrderController],
		])("names the PARAMETERS DTO of %s as %s", (methodName: string, expected: string, controller: { prototype: object }) => {
			const parameterTypes: Array<{ name: string }> = Reflect.getMetadata("design:paramtypes", controller.prototype, methodName) as Array<{ name: string }>;

			expect(parameterTypes.map(({ name }) => name)).toContain(expected);
		});
	});
});
