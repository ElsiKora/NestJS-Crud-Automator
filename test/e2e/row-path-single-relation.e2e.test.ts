import "reflect-metadata";

import type { INestApplication, Provider } from "@nestjs/common";
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

import type { TRowPathDriver } from "./row-path/fixture";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../src/index";
import { ROW_PATH_SINGLE_ENTITIES, RowPathSingleModule, SINGLE_TENANT_OTHER, SINGLE_TENANT_PINNED } from "./row-path/single-relation.fixture";

type TPipe = "forbid" | "none" | "plain" | "transform";
type TResponse = { body: string; json: () => unknown; statusCode: number };
type TRow = { id: string; name: string; tenantId: string };

const CHILD_ID: string = "cccccccc-0000-4000-8000-000000000001";
const CONFLICT_REASON: string = "relation must name the same value as the entity's own column";
const KEY_CLEAR_REASON: string = "it cannot be cleared, because its columns are in the primary key";

const PIPES: Record<TPipe, Array<Provider>> = {
	forbid: [{ provide: APP_PIPE, useValue: new ValidationPipe({ forbidNonWhitelisted: true, skipMissingProperties: true, transform: true, whitelist: true }) }],
	none: [],
	plain: [{ provide: APP_PIPE, useValue: new ValidationPipe() }],
	transform: [{ provide: APP_PIPE, useValue: new ValidationPipe({ skipMissingProperties: true, transform: true }) }],
};

describe.each<TRowPathDriver>(["postgres", "sqlite"])("a relation over one column of the entity's own column on %s (E2E)", (driver: TRowPathDriver) => {
	let container: StartedPostgreSqlContainer | undefined;

	beforeAll(async () => {
		container = driver === "postgres" ? await new PostgreSqlContainer("postgres:17-alpine").start() : undefined;
	});

	afterAll(async () => {
		await container?.stop();
	});

	describe.each<TPipe>(["none", "plain", "transform", "forbid"])("with the %s pipe", (pipe: TPipe) => {
		let app: INestApplication;
		let dataSource: DataSource;
		let fastify: { inject: (options: object) => Promise<TResponse> };

		const send = async (method: string, url: string, payload?: object): Promise<TResponse> => await fastify.inject({ headers: payload ? { "content-type": "application/json" } : {}, method, payload, url });

		const rows = async (table: string): Promise<Array<TRow>> => (await dataSource.query(`SELECT "id", "name", "tenantId" FROM ${table} ORDER BY "name"`)) as Array<TRow>;

		// The plain pipe requires every required property, so a body that leaves the own column to the relation never reaches the route there.
		const liftStatus = (created: number): number => (pipe === "plain" ? 400 : created);

		beforeAll(async () => {
			const reference = await Test.createTestingModule({
				imports: [ApiAuthorizationModule.forRoot({}), ApiSubscriberModule, TypeOrmModule.forRoot(container ? { dropSchema: true, entities: ROW_PATH_SINGLE_ENTITIES, synchronize: true, type: "postgres", url: container.getConnectionUri() } : { database: ":memory:", entities: ROW_PATH_SINGLE_ENTITIES, synchronize: true, type: "better-sqlite3" }), RowPathSingleModule],
				providers: PIPES[pipe],
			}).compile();

			app = reference.createNestApplication(new FastifyAdapter());
			await app.init();
			fastify = app.getHttpAdapter().getInstance() as { inject: (options: object) => Promise<TResponse> };
			dataSource = app.get<DataSource>(getDataSourceToken());
		});

		afterAll(async () => {
			await app?.close();
		});

		beforeEach(async () => {
			await dataSource.query("DELETE FROM row_path_single_children");
			await dataSource.query("DELETE FROM row_path_single_key_children");
			await dataSource.query("DELETE FROM row_path_single_tenants");
			await dataSource.query(`INSERT INTO row_path_single_tenants ("id", "name") VALUES ('${SINGLE_TENANT_PINNED}', 'pinned'), ('${SINGLE_TENANT_OTHER}', 'other')`);
			await dataSource.query(`INSERT INTO row_path_single_children ("id", "name", "tenantId") VALUES ('${CHILD_ID}', 'seeded', '${SINGLE_TENANT_PINNED}')`);
			await dataSource.query(`INSERT INTO row_path_single_key_children ("id", "name", "tenantId") VALUES ('${CHILD_ID}', 'seeded', '${SINGLE_TENANT_PINNED}')`);
		});

		const seeded: Array<TRow> = [{ id: CHILD_ID, name: "seeded", tenantId: SINGLE_TENANT_PINNED }];

		const expectRefusal = (response: TResponse, reason?: string): void => {
			expect(response.statusCode).toBe(400);

			if (pipe === "none" && reason) {
				expect(response.json()).toMatchObject({ details: { propertyName: "tenant", reason }, message: "PARAMETERS_NOT_VALID" });
			}
		};

		describe("CREATE where a transformer pins the own column", () => {
			it.each([[{ name: "made", tenant: { id: SINGLE_TENANT_OTHER } }], [{ name: "made", tenant: SINGLE_TENANT_OTHER }], [{ name: "made", tenant: SINGLE_TENANT_OTHER, tenantId: SINGLE_TENANT_PINNED }]])("POST /single-pinned with %j answers 400 and adds no row", async (payload: object) => {
				expectRefusal(await send("POST", "/single-pinned", payload), CONFLICT_REASON);
				expect(await rows("row_path_single_children")).toEqual(seeded);
			});

			it.each([[{ name: "made", tenant: { id: SINGLE_TENANT_OTHER } }], [{ name: "made", tenant: SINGLE_TENANT_OTHER }]])("POST /single-key-pinned with %j answers 400 and adds no row", async (payload: object) => {
				expectRefusal(await send("POST", "/single-key-pinned", payload), CONFLICT_REASON);
				expect(await rows("row_path_single_key_children")).toEqual(seeded);
			});

			it("POST /single-pinned with the pinned tenant writes it and echoes it", async () => {
				const response: TResponse = await send("POST", "/single-pinned", { name: "made", tenant: SINGLE_TENANT_PINNED, tenantId: SINGLE_TENANT_PINNED });

				expect(response.statusCode).toBe(201);
				expect(response.json()).toMatchObject({ name: "made", tenantId: SINGLE_TENANT_PINNED });
				expect((await rows("row_path_single_children")).map(({ name, tenantId }: TRow) => [name, tenantId])).toEqual([
					["made", SINGLE_TENANT_PINNED],
					["seeded", SINGLE_TENANT_PINNED],
				]);
			});

			it("POST /single-key-pinned with the pinned tenant writes the key and echoes it", async () => {
				const response: TResponse = await send("POST", "/single-key-pinned", { name: "made", tenant: SINGLE_TENANT_PINNED });

				expect(response.statusCode).toBe(201);
				expect(response.json()).toMatchObject({ name: "made", tenantId: SINGLE_TENANT_PINNED });
				expect((await rows("row_path_single_key_children")).map(({ name, tenantId }: TRow) => [name, tenantId])).toEqual([
					["made", SINGLE_TENANT_PINNED],
					["seeded", SINGLE_TENANT_PINNED],
				]);
			});
		});

		describe("CREATE without a transformer", () => {
			it("POST /single-plain with only the relation writes its value into the own column and echoes it", async () => {
				const response: TResponse = await send("POST", "/single-plain", { name: "made", tenant: SINGLE_TENANT_OTHER });

				expect(response.statusCode).toBe(liftStatus(201));

				if (response.statusCode === 201) {
					expect(response.json()).toMatchObject({ name: "made", tenantId: SINGLE_TENANT_OTHER });
					expect((await rows("row_path_single_children")).map(({ name, tenantId }: TRow) => [name, tenantId])).toEqual([
						["made", SINGLE_TENANT_OTHER],
						["seeded", SINGLE_TENANT_PINNED],
					]);
				} else {
					expect(await rows("row_path_single_children")).toEqual(seeded);
				}
			});

			it("POST /single-plain with the same value in both writes it", async () => {
				const response: TResponse = await send("POST", "/single-plain", { name: "made", tenant: SINGLE_TENANT_OTHER, tenantId: SINGLE_TENANT_OTHER });

				expect(response.statusCode).toBe(201);
				expect(response.json()).toMatchObject({ tenantId: SINGLE_TENANT_OTHER });
				expect((await rows("row_path_single_children"))[0]).toMatchObject({ name: "made", tenantId: SINGLE_TENANT_OTHER });
			});

			it("POST /single-plain with different values answers 400 and adds no row", async () => {
				expectRefusal(await send("POST", "/single-plain", { name: "made", tenant: SINGLE_TENANT_OTHER, tenantId: SINGLE_TENANT_PINNED }), CONFLICT_REASON);
				expect(await rows("row_path_single_children")).toEqual(seeded);
			});

			it("POST /single-key-plain with only the relation writes the key from it and echoes the row", async () => {
				const response: TResponse = await send("POST", "/single-key-plain", { name: "made", tenant: SINGLE_TENANT_OTHER });

				expect(response.statusCode).toBe(201);
				expect(response.json()).toMatchObject({ name: "made", tenantId: SINGLE_TENANT_OTHER });
				expect((await rows("row_path_single_key_children")).map(({ name, tenantId }: TRow) => [name, tenantId])).toEqual([
					["made", SINGLE_TENANT_OTHER],
					["seeded", SINGLE_TENANT_PINNED],
				]);
			});

			it.each([
				["/single-key-plain", { name: "made", tenant: null }],
				["/single-key-pinned", { name: "made", tenant: null, tenantId: SINGLE_TENANT_PINNED }],
			])("POST %s with %j answers 400, because a key column cannot be cleared, and adds no row", async (path: string, payload: object) => {
				expectRefusal(await send("POST", path, payload), KEY_CLEAR_REASON);
				expect(await rows("row_path_single_key_children")).toEqual(seeded);
			});
		});

		describe("PATCH and PUT", () => {
			it.each([
				["PATCH", { tenant: SINGLE_TENANT_OTHER }],
				["PATCH", { tenant: { id: SINGLE_TENANT_OTHER } }],
				["PUT", { name: "moved", tenant: SINGLE_TENANT_OTHER, tenantId: SINGLE_TENANT_PINNED }],
			])("%s /single-pinned with %j answers 400 and changes no row", async (method: string, payload: object) => {
				expectRefusal(await send(method, `/single-pinned/${CHILD_ID}`, payload), CONFLICT_REASON);
				expect(await rows("row_path_single_children")).toEqual(seeded);
			});

			it.each([
				["PATCH", { name: "kept", tenant: SINGLE_TENANT_PINNED }],
				["PUT", { name: "kept", tenant: SINGLE_TENANT_PINNED, tenantId: SINGLE_TENANT_PINNED }],
			])("%s /single-pinned with the pinned tenant answers 200", async (method: string, payload: object) => {
				const response: TResponse = await send(method, `/single-pinned/${CHILD_ID}`, payload);

				expect(response.statusCode).toBe(200);
				expect(response.json()).toMatchObject({ name: "kept", tenantId: SINGLE_TENANT_PINNED });
				expect(await rows("row_path_single_children")).toEqual([{ id: CHILD_ID, name: "kept", tenantId: SINGLE_TENANT_PINNED }]);
			});

			it.each([
				["PATCH", { name: "moved", tenant: SINGLE_TENANT_OTHER }, 200],
				["PUT", { name: "moved", tenant: SINGLE_TENANT_OTHER, tenantId: SINGLE_TENANT_OTHER }, 200],
			])("%s /single-plain with %j moves the row to that tenant in both columns", async (method: string, payload: object, status: number) => {
				const response: TResponse = await send(method, `/single-plain/${CHILD_ID}`, payload);

				expect(response.statusCode).toBe(status);
				expect(response.json()).toMatchObject({ name: "moved", tenantId: SINGLE_TENANT_OTHER });
				expect(await rows("row_path_single_children")).toEqual([{ id: CHILD_ID, name: "moved", tenantId: SINGLE_TENANT_OTHER }]);
			});

			it.each([["PATCH"], ["PUT"]])("%s /single-plain with different values answers 400 and changes no row", async (method: string) => {
				expectRefusal(await send(method, `/single-plain/${CHILD_ID}`, { name: "moved", tenant: SINGLE_TENANT_OTHER, tenantId: SINGLE_TENANT_PINNED }), CONFLICT_REASON);
				expect(await rows("row_path_single_children")).toEqual(seeded);
			});

			it.each([
				["PATCH", "/single-key-plain", { tenant: SINGLE_TENANT_OTHER }],
				["PUT", "/single-key-plain", { name: "moved", tenant: SINGLE_TENANT_OTHER }],
				["PATCH", "/single-key-pinned", { tenant: SINGLE_TENANT_OTHER }],
				["PUT", "/single-key-pinned", { name: "moved", tenant: SINGLE_TENANT_OTHER }],
				["PATCH", "/single-key-plain", { tenant: null }],
			])("%s %s with %j answers 400, because the path names the key, and changes no row", async (method: string, path: string, payload: object) => {
				expect((await send(method, `${path}/${CHILD_ID}/${SINGLE_TENANT_PINNED}`, payload)).statusCode).toBe(400);
				expect(await rows("row_path_single_key_children")).toEqual(seeded);
			});

			it.each([["PATCH"], ["PUT"]])("%s /single-key-pinned keeps the key of the row", async (method: string) => {
				const response: TResponse = await send(method, `/single-key-pinned/${CHILD_ID}/${SINGLE_TENANT_PINNED}`, { name: "kept" });

				expect(response.statusCode).toBe(200);
				expect(response.json()).toMatchObject({ id: CHILD_ID, name: "kept", tenantId: SINGLE_TENANT_PINNED });
				expect(await rows("row_path_single_key_children")).toEqual([{ id: CHILD_ID, name: "kept", tenantId: SINGLE_TENANT_PINNED }]);
			});
		});

		describe("request relation loading", () => {
			it.each([
				["POST", "/single-loaded", { name: "made", tenant: "T9", tenantId: "T9" }],
				["PATCH", `/single-loaded/${CHILD_ID}`, { tenant: "T9", tenantId: "T9" }],
			])("%s %s with a tenant that does not exist answers 404 and writes nothing", async (method: string, url: string, payload: object) => {
				const response: TResponse = await send(method, url, payload);

				expect(response.statusCode).toBe(404);
				expect(response.json()).toMatchObject({ message: "ROWPATHSINGLETENANTENTITY_NOT_FOUND" });
				expect(await rows("row_path_single_children")).toEqual(seeded);
			});

			it("POST /single-loaded with an existing tenant, as the relation alone, writes it and echoes it", async () => {
				const response: TResponse = await send("POST", "/single-loaded", { name: "made", tenant: SINGLE_TENANT_OTHER });

				expect(response.statusCode).toBe(liftStatus(201));

				if (response.statusCode === 201) {
					expect(response.json()).toMatchObject({ name: "made", tenantId: SINGLE_TENANT_OTHER });
					expect((await rows("row_path_single_children"))[0]).toMatchObject({ name: "made", tenantId: SINGLE_TENANT_OTHER });
				}
			});

			it("PATCH /single-loaded moves the row to an existing tenant", async () => {
				const response: TResponse = await send("PATCH", `/single-loaded/${CHILD_ID}`, { tenant: SINGLE_TENANT_OTHER });

				expect(response.statusCode).toBe(200);
				expect(await rows("row_path_single_children")).toEqual([{ id: CHILD_ID, name: "seeded", tenantId: SINGLE_TENANT_OTHER }]);
			});
		});

		it("CREATE under pathScope runs its path validators before any write", async () => {
			expect((await send("POST", `/tenant/${SINGLE_TENANT_PINNED}/single`, { name: "made" })).statusCode).toBe(422);
			expect(await rows("row_path_single_children")).toEqual(seeded);
		});

		it.runIf(pipe === "none")("publishes the relation as the referenced column and declares the path validator status", () => {
			const document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
			const schemas = document.components?.schemas as Record<string, { properties?: Record<string, Record<string, unknown>>; required?: Array<string> }>;
			const paths = document.paths as Record<string, Record<string, { responses: Record<string, unknown> }>>;

			for (const name of ["RowPathSinglePlainCreateBodyDTO", "RowPathSinglePlainPartialUpdateBodyDTO", "RowPathSinglePlainUpdateBodyDTO", "RowPathSingleKeyPlainCreateBodyDTO"]) {
				expect(schemas[name]?.properties?.tenant).toMatchObject({ maxLength: 64, minLength: 1, pattern: "^.+$", type: "string" });
				expect(schemas[name]?.properties?.tenant?.format).not.toBe("uuid");
			}

			expect(schemas.RowPathSingleKeyPlainPartialUpdateBodyDTO?.properties?.tenant).toBeUndefined();
			expect(schemas.RowPathSingleKeyPlainUpdateBodyDTO?.properties?.tenant).toBeUndefined();

			for (const method of ["post", "get"]) {
				expect(Object.keys(paths["/tenant/{tenantId}/single"]?.[method]?.responses ?? {})).toEqual(expect.arrayContaining(["400", "422"]));
			}

			for (const method of ["patch", "put", "delete"]) {
				expect(Object.keys(paths["/tenant/{tenantId}/single/{id}"]?.[method]?.responses ?? {})).toEqual(expect.arrayContaining(["400", "422"]));
			}
		});
	});
});
