import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { TypeOrmModuleOptions } from "@nestjs/typeorm";
import type { StartedMySqlContainer } from "@testcontainers/mysql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedTestContainer } from "testcontainers";
import type { Repository } from "typeorm";
import type { IApiAuthorizationPrincipal, IApiPolicyAttachment, IApiPolicyDocumentRecord, IApiPolicyStatement } from "../../src/index";
import type { IE2eIamTargetFixture, IE2eIamTargetRow, TE2eIamTargetDatabase } from "./iam-resource-targeting";

import { HttpStatus } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MySqlContainer } from "@testcontainers/mysql";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { GenericContainer, Wait } from "testcontainers";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, AUTHORIZATION_IAM_SCOPE_CONSTANT, AuthorizationResolveDefaultPrincipal, EApiAuthorizationPrincipalType, EApiPolicyEffect, EApiPolicySourceType } from "../../src/index";
import { E2E_IAM_TARGET_USER, E2eIamTargetBuild, E2eIamTargetGuard } from "./iam-resource-targeting";

interface IDocument {
	id: string;
	namespace: string;
	statements: ReadonlyArray<unknown>;
}

interface IResponse {
	json: () => unknown;
	statusCode: number;
}

const MARIADB_PASSWORD: string = "iam-target";
const MYSQL_PORT: number = 3306;
const PAGE: string = "limit=50&page=1";
const PRINCIPAL: IApiAuthorizationPrincipal = AuthorizationResolveDefaultPrincipal(E2E_IAM_TARGET_USER);
const REFUSED: Array<number> = [HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND];
// The limits a stored document is held to, at save and at load.
const MAX_STATEMENTS: number = 256;
const MAX_DOCUMENT_LENGTH: number = 131_072;

const startMariaDb = async (): Promise<StartedTestContainer> =>
	await new GenericContainer("mariadb:11")
		.withEnvironment({ MARIADB_DATABASE: "iam", MARIADB_ROOT_PASSWORD: MARIADB_PASSWORD })
		.withExposedPorts(MYSQL_PORT)
		// The image first runs a temporary server on port 0 to initialize the database.
		.withWaitStrategy(Wait.forLogMessage(/port: 3306\s/u))
		.withStartupTimeout(240_000)
		.start();

const allowAll = (namespace: string): IApiPolicyStatement => ({ Action: [`${namespace}:*`], Effect: EApiPolicyEffect.ALLOW, Resource: ["*"] });
const denyResource = (namespace: string, resource: string): Array<IApiPolicyStatement> => [allowAll(namespace), { Action: [`${namespace}:*`], Effect: EApiPolicyEffect.DENY, Resource: [resource] }];
const allowTenant = (namespace: string, index: number): IApiPolicyStatement => ({ Action: [`${namespace}:*`], Condition: { StringEquals: { "resource.tenant": `v${index}` } }, Effect: EApiPolicyEffect.ALLOW, Resource: ["*"] });
const range = (count: number): Array<number> => Array.from({ length: count }, (_: unknown, index: number): number => index);

describe.each<{ database: TE2eIamTargetDatabase; databaseName: string }>([
	{ database: "sqlite", databaseName: "SQLite" },
	{ database: "postgres", databaseName: "PostgreSQL 17" },
	{ database: "mysql", databaseName: "MySQL 8.4" },
	{ database: "mariadb", databaseName: "MariaDB 11" },
])("IAM resource patterns target the stored row on $databaseName (E2E)", ({ database }: { database: TE2eIamTargetDatabase; databaseName: string }) => {
	const fixture: IE2eIamTargetFixture = E2eIamTargetBuild(database);
	const { namespaces } = fixture;
	let app: INestApplication | undefined;
	let fastify: { inject: (options: { body?: unknown; method: string; url: string }) => Promise<IResponse> };
	let mariaDbContainer: StartedTestContainer | undefined;
	let mysqlContainer: StartedMySqlContainer | undefined;
	let postgresContainer: StartedPostgreSqlContainer | undefined;
	// The documents of the principal: the identity policy, its boundary, more attachments, and documents the source returns unasked.
	let identity: IDocument = { id: "policy", namespace: namespaces.item, statements: [] };
	let boundary: IDocument | undefined;
	let attached: Array<IDocument> = [];
	let unasked: Array<IDocument> = [];

	const connection = (entities: Array<new () => unknown>): TypeOrmModuleOptions => {
		if (mariaDbContainer) {
			return { database: "iam", dropSchema: true, entities, host: mariaDbContainer.getHost(), password: MARIADB_PASSWORD, port: mariaDbContainer.getMappedPort(MYSQL_PORT), synchronize: true, type: "mysql", username: "root" };
		}

		if (mysqlContainer) {
			return { database: mysqlContainer.getDatabase(), dropSchema: true, entities, host: mysqlContainer.getHost(), password: mysqlContainer.getUserPassword(), port: mysqlContainer.getPort(), synchronize: true, type: "mysql", username: mysqlContainer.getUsername() };
		}

		if (postgresContainer) {
			return { dropSchema: true, entities, synchronize: true, type: "postgres", url: postgresContainer.getConnectionUri() };
		}

		return { database: ":memory:", dropSchema: true, entities, synchronize: true, type: "better-sqlite3" };
	};

	const record = (document: IDocument): IApiPolicyDocumentRecord => ({ document: { Statement: document.statements, Version: "2012-10-17" } as never, id: document.id, namespace: document.namespace, sourceType: EApiPolicySourceType.DATABASE, version: "1" });
	const attachment = (policyId: string): IApiPolicyAttachment => ({ policyId, principalId: PRINCIPAL.id, principalType: EApiAuthorizationPrincipalType.USER });
	const repository = (service: new () => unknown): Repository<IE2eIamTargetRow> => (app!.get(service) as { repository: Repository<IE2eIamTargetRow> }).repository;
	const send = async (method: string, url: string, body?: unknown): Promise<IResponse> => await fastify.inject({ ...(body === undefined ? {} : { body }), method, url });
	const statusOf = async (method: string, url: string, body?: unknown): Promise<number> => (await send(method, url, body)).statusCode;

	const listIds = async (url: string): Promise<Array<string> | number> => {
		const response: IResponse = await send("GET", `${url}?${PAGE}`);

		return response.statusCode === HttpStatus.OK ? (response.json() as { items: Array<{ id: string }> }).items.map((item: { id: string }): string => item.id.trim()).sort() : response.statusCode;
	};

	const use = (namespace: string, statements: ReadonlyArray<unknown>): void => {
		identity = { id: "policy", namespace, statements };
	};

	beforeAll(async () => {
		if (database === "postgres") {
			postgresContainer = await new PostgreSqlContainer("postgres:17-alpine").start();
		}

		if (database === "mysql") {
			mysqlContainer = await new MySqlContainer("mysql:8.4").start();
		}

		if (database === "mariadb") {
			mariaDbContainer = await startMariaDb();
		}

		const moduleReference = await Test.createTestingModule({
			controllers: fixture.controllers,
			imports: [
				TypeOrmModule.forRoot(connection(fixture.entities)),
				TypeOrmModule.forFeature(fixture.entities),
				ApiAuthorizationModule.forRoot({
					iam: {
						attachmentSources: [{ getAttachments: async () => await Promise.resolve({ attachments: [attachment(identity.id), ...attached.map((document: IDocument): IApiPolicyAttachment => attachment(document.id))], boundaries: boundary ? [attachment(boundary.id)] : [] }) }],
						documentSources: [
							{
								getDocumentsByIds: async (ids: ReadonlyArray<string>): Promise<ReadonlyArray<IApiPolicyDocumentRecord>> => {
									const known: Array<IDocument> = [identity, ...(boundary ? [boundary] : []), ...attached];

									return await Promise.resolve([...known.filter((document: IDocument): boolean => ids.includes(document.id)).map(record), ...unasked.map(record)]);
								},
							},
						],
					},
					principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) },
				} as never),
			],
			providers: [...Object.values(fixture.services), E2eIamTargetGuard],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		fastify = app.getHttpAdapter().getInstance() as never;
	}, 300_000);

	beforeEach(async () => {
		boundary = undefined;
		attached = [];
		unasked = [];

		for (const service of [fixture.services.item, fixture.services.fold, fixture.services.char]) {
			await repository(service).clear();
			await repository(service).save([
				{ id: "secret", status: "active", tenant: "t1" },
				{ id: "public", status: "active", tenant: "t2" },
			]);
		}

		await repository(fixture.services.tenant).clear();
		await repository(fixture.services.tenant).save([
			{ id: "x", status: "active", tenant: "t1" },
			{ id: "y", status: "active", tenant: "t2" },
		]);
	});

	afterAll(async () => {
		await app?.close();
		await postgresContainer?.stop();
		await mysqlContainer?.stop();
		await mariaDbContainer?.stop();
	});

	describe("a row route decides a Resource pattern on the stored row, never on the path text", () => {
		// Spellings the database may read as the row `secret`: letter case, an accent, trailing spaces.
		const ITEM_SPELLINGS: Array<string> = ["SECRET", "Secret", "s%C3%A9cret", "SECR%C3%89T", "secret%20"];
		const FOLD_SPELLINGS: Array<string> = ["SECRET", "Secret", "secret%20"];
		const CHAR_SPELLINGS: Array<string> = ["secret%20", "secret%20%20%20", "SECRET"];

		const ROUTES: Array<[string, () => string, () => new () => unknown, Array<string>]> = [
			["a default collation", () => namespaces.item, () => fixture.services.item, ITEM_SPELLINGS],
			["a case-insensitive key", () => namespaces.fold, () => fixture.services.fold, FOLD_SPELLINGS],
			["a char(10) key", () => namespaces.char, () => fixture.services.char, CHAR_SPELLINGS],
		];

		const urlOf = (namespace: string): string => (namespace === namespaces.item ? "/iam-target/items" : namespace === namespaces.fold ? "/iam-target/folds" : "/iam-target/chars");

		describe.each(ROUTES)("on %s", (_name: string, namespaceOf: () => string, serviceOf: () => new () => unknown, spellings: Array<string>) => {
			const expectRowKept = async (): Promise<void> => {
				const stored: IE2eIamTargetRow | null = await repository(serviceOf()).findOneBy({ status: "active", tenant: "t1" });

				expect(stored?.id.trim()).toBe("secret");
			};

			it.each(spellings)("refuses GET, PATCH and DELETE of %s under a Deny of the row, and writes nothing", async (spelling: string) => {
				use(namespaceOf(), denyResource(namespaceOf(), `${namespaceOf()}/secret`));
				const url: string = `${urlOf(namespaceOf())}/${spelling}`;

				expect(REFUSED).toContain(await statusOf("GET", url));
				expect(REFUSED).toContain(await statusOf("PATCH", url, { status: "changed" }));
				await expectRowKept();
				expect(REFUSED).toContain(await statusOf("DELETE", url));
				await expectRowKept();
			});

			it.each(spellings)("refuses GET, PATCH and DELETE of %s outside an Allow NotResource, and writes nothing", async (spelling: string) => {
				use(namespaceOf(), [{ Action: [`${namespaceOf()}:*`], Effect: EApiPolicyEffect.ALLOW, NotResource: [`${namespaceOf()}/secret`] }]);
				const url: string = `${urlOf(namespaceOf())}/${spelling}`;

				expect(REFUSED).toContain(await statusOf("GET", url));
				expect(REFUSED).toContain(await statusOf("PATCH", url, { status: "changed" }));
				await expectRowKept();
				expect(REFUSED).toContain(await statusOf("DELETE", url));
				await expectRowKept();
			});

			it("refuses the exact spelling with 403 under a Deny of the row", async () => {
				use(namespaceOf(), denyResource(namespaceOf(), `${namespaceOf()}/secret`));

				expect(await statusOf("GET", `${urlOf(namespaceOf())}/secret`)).toBe(HttpStatus.FORBIDDEN);
			});
		});

		it("answers a NUL character in the path with 400 before any row is read, and writes nothing", async () => {
			use(namespaces.item, denyResource(namespaces.item, `${namespaces.item}/secret`));

			expect(await statusOf("GET", "/iam-target/items/secret%00")).toBe(HttpStatus.BAD_REQUEST);
			expect(await statusOf("PATCH", "/iam-target/items/secret%00", { status: "changed" })).toBe(HttpStatus.BAD_REQUEST);
			expect(await statusOf("DELETE", "/iam-target/items/secret%00")).toBe(HttpStatus.BAD_REQUEST);
			expect(await repository(fixture.services.item).findOneBy({ status: "active", tenant: "t1" })).toMatchObject({ id: "secret" });
		});

		it("still reads and lists the rows the Deny does not name", async () => {
			use(namespaces.item, denyResource(namespaces.item, `${namespaces.item}/secret`));

			expect(await statusOf("GET", "/iam-target/items/public")).toBe(HttpStatus.OK);
			expect(await listIds("/iam-target/items")).toEqual(["public"]);
		});

		it("reads only the row an Allow names, by the stored row", async () => {
			use(namespaces.item, [{ Action: [`${namespaces.item}:*`], Effect: EApiPolicyEffect.ALLOW, Resource: [`${namespaces.item}/secret`] }]);

			expect(await statusOf("GET", "/iam-target/items/secret")).toBe(HttpStatus.OK);
			expect(REFUSED).toContain(await statusOf("GET", "/iam-target/items/public"));
			expect(await listIds("/iam-target/items")).toEqual(["secret"]);
		});

		it("refuses a nested tenant path spelled another way, on the list and on each row route", async () => {
			use(namespaces.tenant, denyResource(namespaces.tenant, `${namespaces.tenant}/t1/*`));

			const listed: Array<string> | number = await listIds("/iam-target/tenants/T1/items");

			expect(typeof listed === "number" ? listed : listed.includes("x") ? "lists x" : HttpStatus.OK).not.toBe("lists x");
			expect(REFUSED).toContain(await statusOf("GET", "/iam-target/tenants/T1/items/x"));
			expect(REFUSED).toContain(await statusOf("PATCH", "/iam-target/tenants/T1/items/x", { status: "changed" }));
			expect(REFUSED).toContain(await statusOf("DELETE", "/iam-target/tenants/T1/items/x"));
			expect(await repository(fixture.services.tenant).findOneBy({ id: "x" })).toMatchObject({ status: "active", tenant: "t1" });
			expect(await listIds("/iam-target/tenants/t1/items")).toBe(HttpStatus.FORBIDDEN);
			expect(await statusOf("GET", "/iam-target/tenants/t2/items/y")).toBe(HttpStatus.OK);
			expect(await listIds("/iam-target/tenants/t2/items")).toEqual(["y"]);
		});
	});

	describe("a row route reads the stored row whether or not a filterable field maps the placeholder", () => {
		// Spellings the default collation of MySQL and MariaDB reads as the row `secret`; PostgreSQL and SQLite find no row.
		const SPELLINGS: Array<string> = ["SECRET", "s%C3%A9cret", "secret%20"];

		const ROUTES: Array<[string, () => string, string]> = [
			["no field mapping", () => namespaces.unmapped, "/iam-target/unmapped"],
			["a mapping that is not filterable", () => namespaces.unfiltered, "/iam-target/unfiltered"],
		];

		describe.each(ROUTES)("on a varchar key with %s", (_name: string, namespaceOf: () => string, url: string) => {
			const expectRowKept = async (): Promise<void> => {
				expect(await repository(fixture.services.item).findOneBy({ status: "active", tenant: "t1" })).toMatchObject({ id: "secret" });
			};

			it.each(SPELLINGS)("refuses GET, PATCH and DELETE of %s under a Deny of the row, and writes nothing", async (spelling: string) => {
				use(namespaceOf(), denyResource(namespaceOf(), `${namespaceOf()}/secret`));

				expect(REFUSED).toContain(await statusOf("GET", `${url}/${spelling}`));
				expect(REFUSED).toContain(await statusOf("PATCH", `${url}/${spelling}`, { status: "changed" }));
				await expectRowKept();
				expect(REFUSED).toContain(await statusOf("DELETE", `${url}/${spelling}`));
				await expectRowKept();
			});

			it.each(SPELLINGS)("refuses %s under a Deny that names the row by a wildcard", async (spelling: string) => {
				use(namespaceOf(), denyResource(namespaceOf(), `${namespaceOf()}/sec*`));

				expect(REFUSED).toContain(await statusOf("GET", `${url}/${spelling}`));
			});

			it.each(SPELLINGS)("refuses %s outside an Allow NotResource", async (spelling: string) => {
				use(namespaceOf(), [{ Action: [`${namespaceOf()}:*`], Effect: EApiPolicyEffect.ALLOW, NotResource: [`${namespaceOf()}/secret`] }]);

				expect(REFUSED).toContain(await statusOf("GET", `${url}/${spelling}`));
			});

			it("refuses the exact spelling with 403 and reads a row the Deny does not name", async () => {
				use(namespaceOf(), denyResource(namespaceOf(), `${namespaceOf()}/secret`));

				expect(await statusOf("GET", `${url}/secret`)).toBe(HttpStatus.FORBIDDEN);
				expect(await statusOf("GET", `${url}/public`)).toBe(HttpStatus.OK);
			});

			it("reads only the row an Allow names", async () => {
				use(namespaceOf(), [{ Action: [`${namespaceOf()}:*`], Effect: EApiPolicyEffect.ALLOW, Resource: [`${namespaceOf()}/secret`] }]);

				expect(await statusOf("GET", `${url}/secret`)).toBe(HttpStatus.OK);
				expect(REFUSED).toContain(await statusOf("GET", `${url}/public`));
			});

			it("leaves the list closed, as a list scope still reads only a filterable field", async () => {
				use(namespaceOf(), denyResource(namespaceOf(), `${namespaceOf()}/secret`));

				expect(await listIds(url)).toBe(HttpStatus.FORBIDDEN);
			});
		});

		describe("on a placeholder that resolves to no column", () => {
			const namespaceOf = (): string => namespaces.region;
			const rows = (region: string): string => `/iam-target/regions/${region}/items`;

			it("denies every row route and every list under a Deny whose pattern constrains it", async () => {
				use(namespaceOf(), denyResource(namespaceOf(), `${namespaceOf()}/t1/*`));

				expect(await statusOf("GET", `${rows("t1")}/x`)).toBe(HttpStatus.FORBIDDEN);
				expect(await statusOf("GET", `${rows("T1")}/x`)).toBe(HttpStatus.FORBIDDEN);
				expect(await statusOf("PATCH", `${rows("T1")}/x`, { status: "changed" })).toBe(HttpStatus.FORBIDDEN);
				expect(await statusOf("DELETE", `${rows("T1")}/x`)).toBe(HttpStatus.FORBIDDEN);
				expect(await repository(fixture.services.tenant).findOneBy({ id: "x" })).toMatchObject({ status: "active", tenant: "t1" });
				expect(await statusOf("GET", `${rows("t2")}/y`)).toBe(HttpStatus.FORBIDDEN);
				expect(await listIds(rows("t1"))).toBe(HttpStatus.FORBIDDEN);
				expect(await listIds(rows("t2"))).toBe(HttpStatus.FORBIDDEN);
			});

			it("denies under a Deny NotResource whose pattern constrains it", async () => {
				use(namespaceOf(), [allowAll(namespaceOf()), { Action: [`${namespaceOf()}:*`], Effect: EApiPolicyEffect.DENY, NotResource: [`${namespaceOf()}/t1/*`] }]);

				expect(await statusOf("GET", `${rows("t1")}/x`)).toBe(HttpStatus.FORBIDDEN);
				expect(await statusOf("GET", `${rows("t2")}/y`)).toBe(HttpStatus.FORBIDDEN);
			});

			it("grants nothing by an Allow whose pattern constrains it", async () => {
				use(namespaceOf(), [{ Action: [`${namespaceOf()}:*`], Effect: EApiPolicyEffect.ALLOW, Resource: [`${namespaceOf()}/t1/*`] }]);

				expect(REFUSED).toContain(await statusOf("GET", `${rows("t1")}/x`));
				expect(REFUSED).toContain(await statusOf("GET", `${rows("T1")}/x`));
				expect(REFUSED).toContain(await statusOf("PATCH", `${rows("t1")}/x`, { status: "changed" }));
				expect(REFUSED).toContain(await statusOf("GET", `${rows("t2")}/y`));
				expect(await listIds(rows("t1"))).toBe(HttpStatus.FORBIDDEN);
			});

			it("grants nothing by an Allow NotResource whose pattern constrains it", async () => {
				use(namespaceOf(), [{ Action: [`${namespaceOf()}:*`], Effect: EApiPolicyEffect.ALLOW, NotResource: [`${namespaceOf()}/t1/*`] }]);

				expect(REFUSED).toContain(await statusOf("GET", `${rows("t2")}/y`));
				expect(REFUSED).toContain(await statusOf("GET", `${rows("t1")}/x`));
			});

			it.each([
				["only a star over it", (namespace: string): string => `${namespace}/*/i/*`],
				["a star over the whole path", (namespace: string): string => `${namespace}/*`],
			])("leaves %s unaffected", async (_name: string, patternOf: (namespace: string) => string) => {
				use(namespaceOf(), [{ Action: [`${namespaceOf()}:*`], Effect: EApiPolicyEffect.ALLOW, Resource: [patternOf(namespaceOf())] }]);

				expect(await statusOf("GET", `${rows("t1")}/x`)).toBe(HttpStatus.OK);
				expect(await listIds(rows("t1"))).toEqual(["x"]);
			});

			it("still decides the column placeholder beside a star over it", async () => {
				use(namespaceOf(), denyResource(namespaceOf(), `${namespaceOf()}/*/i/x`));

				expect(await statusOf("GET", `${rows("t1")}/x`)).toBe(HttpStatus.FORBIDDEN);
				expect(await statusOf("GET", `${rows("t2")}/y`)).toBe(HttpStatus.OK);
			});
		});
	});

	describe("a Deny Resource applies to the row a create stores", () => {
		const CASES: Array<[string, () => string, () => string, () => string, Record<string, string>, Record<string, string>]> = [
			["an exact id", () => namespaces.item, () => `${namespaces.item}/secret`, () => "/iam-target/items", { id: "secret" }, { id: "other" }],
			["a trailing star", () => namespaces.item, () => `${namespaces.item}/sec*`, () => "/iam-target/items", { id: "secret" }, { id: "other" }],
			["a tenant prefix", () => namespaces.tenantBody, () => `${namespaces.tenantBody}/t9*`, () => "/iam-target/tenant-bodies", { id: "s1", tenant: "t9" }, { id: "s2", tenant: "t8" }],
			["two placeholders", () => namespaces.tenantBody, () => `${namespaces.tenantBody}/t9/i/secret`, () => "/iam-target/tenant-bodies", { id: "secret", tenant: "t9" }, { id: "secret", tenant: "t8" }],
		];

		it.each(CASES)("refuses with 403 and stores nothing for %s, and creates a row it does not name", async (_name: string, namespaceOf: () => string, resourceOf: () => string, urlOf: () => string, denied: Record<string, string>, allowed: Record<string, string>) => {
			use(namespaceOf(), denyResource(namespaceOf(), resourceOf()));
			const tenants: Repository<IE2eIamTargetRow> = repository(fixture.services.tenant);
			const items: Repository<IE2eIamTargetRow> = repository(fixture.services.item);
			const rows: Repository<IE2eIamTargetRow> = namespaceOf() === namespaces.item ? items : tenants;
			await rows.clear();

			expect(await statusOf("POST", urlOf(), denied)).toBe(HttpStatus.FORBIDDEN);
			expect(await rows.findOneBy(denied)).toBeNull();
			expect(await statusOf("POST", urlOf(), allowed)).toBe(HttpStatus.CREATED);
			expect(await rows.findOneBy(allowed)).not.toBeNull();
		});
	});

	describe("a path value that holds a separator names no resource", () => {
		it.each(["t1%2Fevil", "t1%2F..%2Ft2", "t1%2Fi%2Fz"])("refuses a list and a create under the tenant %s that an Allow of t1 would match as text", async (tenant: string) => {
			use(namespaces.tenant, [{ Action: [`${namespaces.tenant}:*`], Effect: EApiPolicyEffect.ALLOW, Resource: [`${namespaces.tenant}/t1/*`] }]);

			expect(await listIds(`/iam-target/tenants/${tenant}/items`)).toBe(HttpStatus.FORBIDDEN);
			expect(await statusOf("POST", `/iam-target/tenants/${tenant}/items`, { id: "z1" })).toBe(HttpStatus.FORBIDDEN);
			expect(await repository(fixture.services.tenant).findOneBy({ id: "z1" })).toBeNull();
		});

		it("still lists and creates under the tenant the Allow names", async () => {
			use(namespaces.tenant, [{ Action: [`${namespaces.tenant}:*`], Effect: EApiPolicyEffect.ALLOW, Resource: [`${namespaces.tenant}/t1/*`] }]);

			expect(await listIds("/iam-target/tenants/t1/items")).toEqual(["x"]);
			expect(await statusOf("POST", "/iam-target/tenants/t1/items", { id: "z2" })).toBe(HttpStatus.CREATED);
			expect(await statusOf("GET", "/iam-target/tenants/t1/items/z2")).toBe(HttpStatus.OK);
			expect(await listIds("/iam-target/tenants/t2/items")).toBe(HttpStatus.FORBIDDEN);
		});

		it("denies a row route whose id holds a separator under a Deny", async () => {
			use(namespaces.tenant, denyResource(namespaces.tenant, `${namespaces.tenant}/t2/*`));
			await repository(fixture.services.tenant).save({ id: "x/i/z", status: "active", tenant: "t1" });

			expect(await statusOf("GET", "/iam-target/tenants/t1/items/x")).toBe(HttpStatus.OK);
			expect(await statusOf("GET", "/iam-target/tenants/t1/items/x%2Fi%2Fz")).toBe(HttpStatus.FORBIDDEN);
			expect(await statusOf("DELETE", "/iam-target/tenants/t1/items/x%2Fi%2Fz")).toBe(HttpStatus.FORBIDDEN);
			expect(await repository(fixture.services.tenant).findOneBy({ id: "x/i/z" })).not.toBeNull();
		});

		it("refuses a key that holds a separator even under an Allow of every resource", async () => {
			use(namespaces.item, [allowAll(namespaces.item)]);
			await repository(fixture.services.item).save({ id: "a/b", status: "active", tenant: "t1" });

			expect(await statusOf("GET", "/iam-target/items/a%2Fb")).toBe(HttpStatus.FORBIDDEN);
			expect(await statusOf("POST", "/iam-target/items", { id: "c/d" })).toBe(HttpStatus.FORBIDDEN);
			expect(await repository(fixture.services.item).findOneBy({ id: "c/d" })).toBeNull();
		});
	});

	describe("documents of other namespaces", () => {
		it("skips a document of another namespace attached to the principal", async () => {
			use(namespaces.item, [allowAll(namespaces.item)]);
			attached = [{ id: "other", namespace: "other:thing", statements: [{ Action: ["other:thing:*"], Effect: "Allow", Resource: ["*"] }] }];

			expect(await listIds("/iam-target/items")).toEqual(["public", "secret"]);
		});

		it("does not validate a document of another namespace, attached or returned unasked", async () => {
			use(namespaces.item, [allowAll(namespaces.item)]);
			attached = [{ id: "other", namespace: "other:thing", statements: [{ Action: ["other:thing:*"], Effect: "Allow", Principal: "*", Resource: ["*"] }] }];
			unasked = [{ id: "stray", namespace: "other:thing", statements: [{ Action: ["other:thing:*"], Effect: "Allow", Principal: "*", Resource: ["*"] }] }];

			expect(await listIds("/iam-target/items")).toEqual(["public", "secret"]);
		});

		it("ignores a document of this namespace that the source returns unasked", async () => {
			use(namespaces.item, [allowAll(namespaces.item)]);
			unasked = [
				{ id: "stray-deny", namespace: namespaces.item, statements: [{ Action: [`${namespaces.item}:*`], Effect: "Deny", Resource: ["*"] }] },
				{ id: "stray-invalid", namespace: namespaces.item, statements: [{ Action: [`${namespaces.item}:*`], Effect: "Allow", Principal: "*", Resource: ["*"] }] },
			];

			expect(await listIds("/iam-target/items")).toEqual(["public", "secret"]);
		});

		it("still answers 500 for an invalid document of this namespace attached to the principal", async () => {
			use(namespaces.item, [allowAll(namespaces.item)]);
			attached = [{ id: "broken", namespace: namespaces.item, statements: [{ Action: [`${namespaces.item}:*`], Effect: "Allow", Principal: "*", Resource: ["*"] }] }];

			expect(await listIds("/iam-target/items")).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
		});

		it("keeps a principal bounded by a boundary of another namespace, which allows nothing here", async () => {
			use(namespaces.item, [allowAll(namespaces.item)]);
			boundary = { id: "boundary", namespace: "other:thing", statements: [{ Action: ["other:thing:*"], Effect: "Allow", Resource: ["*"] }] };

			expect(await listIds("/iam-target/items")).toBe(HttpStatus.FORBIDDEN);
		});
	});

	describe("query and document size", () => {
		const MAX_BRANCHES: number = AUTHORIZATION_IAM_SCOPE_CONSTANT.MAX_WHERE_BRANCHES;

		it("lists under as many Allow branches as the cap", async () => {
			use(
				namespaces.tenantBody,
				range(MAX_BRANCHES).map((index: number): IApiPolicyStatement => allowTenant(namespaces.tenantBody, index)),
			);

			expect(await listIds("/iam-target/tenant-bodies")).toEqual([]);
		});

		it("refuses with 403 more Allow branches than the cap", async () => {
			use(
				namespaces.tenantBody,
				range(MAX_BRANCHES + 1).map((index: number): IApiPolicyStatement => allowTenant(namespaces.tenantBody, index)),
			);

			expect(await listIds("/iam-target/tenant-bodies")).toBe(HttpStatus.FORBIDDEN);
		});

		it("refuses with 403 an identity and a boundary whose product exceeds the cap, with or without a Deny", async () => {
			const statements: Array<IApiPolicyStatement> = range(100).map((index: number): IApiPolicyStatement => allowTenant(namespaces.tenantBody, index));
			use(namespaces.tenantBody, statements);
			boundary = { id: "boundary", namespace: namespaces.tenantBody, statements };

			expect(await listIds("/iam-target/tenant-bodies")).toBe(HttpStatus.FORBIDDEN);

			use(namespaces.tenantBody, [...statements, { Action: [`${namespaces.tenantBody}:*`], Condition: { StringEquals: { "resource.tenant": "t9" } }, Effect: EApiPolicyEffect.DENY, Resource: ["*"] }]);

			expect(await listIds("/iam-target/tenant-bodies")).toBe(HttpStatus.FORBIDDEN);
		});

		it("refuses at load a document with more statements than the limit", async () => {
			use(
				namespaces.item,
				range(MAX_STATEMENTS + 1).map((): IApiPolicyStatement => allowAll(namespaces.item)),
			);

			expect(await listIds("/iam-target/items")).toBe(HttpStatus.INTERNAL_SERVER_ERROR);

			use(
				namespaces.item,
				range(MAX_STATEMENTS).map((): IApiPolicyStatement => allowAll(namespaces.item)),
			);

			expect(await listIds("/iam-target/items")).toEqual(["public", "secret"]);
		});

		it("refuses at load a document larger than the limit", async () => {
			const patternLength: number = 100;
			const count: number = Math.ceil(MAX_DOCUMENT_LENGTH / patternLength) + 1;
			use(namespaces.item, [allowAll(namespaces.item), { Action: [`${namespaces.item}:*`], Effect: EApiPolicyEffect.DENY, Resource: range(count).map((index: number): string => `${namespaces.item}/${String(index).padStart(patternLength, "x")}`) }]);

			expect(await listIds("/iam-target/items")).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
		});
	});
});
