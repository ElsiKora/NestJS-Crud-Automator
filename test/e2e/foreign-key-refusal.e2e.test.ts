import "reflect-metadata";

import type { ExceptionFilter, INestApplication, NestInterceptor } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import type { TypeOrmModuleOptions } from "@nestjs/typeorm";
import type { StartedMySqlContainer } from "@testcontainers/mysql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedTestContainer } from "testcontainers";
import type { Relation, Repository } from "typeorm";

import { HttpStatus, Inject, Injectable, ValidationPipe } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { MySqlContainer } from "@testcontainers/mysql";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Ajv } from "ajv";
import addFormats from "ajv-formats";
import { GenericContainer, Wait } from "testcontainers";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiPropertyDescribe, ApiService, ApiServiceBase, ApiSubscriberModule, CorrelationIDResponseBodyExceptionFilter, CorrelationIDResponseBodyInterceptor, EApiPropertyDescribeType, EApiPropertyStringType, LoggerUtility } from "../../src/index";

type TDatabase = "mariadb" | "mysql" | "postgres" | "sqlite";

const MARIADB_PASSWORD: string = "secret";
const MYSQL_PORT: number = 3306;

const OWNER_ITEM: string = "owner-item";
const OWNER_NOTE: string = "owner-note";
const OWNER_MISSING: string = "owner-missing";
const ITEM: string = "item-1";
const NOTE: string = "note-1";

const describeText: PropertyDecorator = ApiPropertyDescribe({ description: "text", exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 32, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING });
const describeRelation: PropertyDecorator = ApiPropertyDescribe({ description: "relation", type: EApiPropertyDescribeType.RELATION });

@Entity("fk_owners")
class FkOwnerEntity {
	@describeText
	@PrimaryColumn({ length: 32, type: "varchar" })
	public id!: string;

	@Column({ length: 32, type: "varchar" })
	@describeText
	public name!: string;
}

// The composite foreign key target
@Entity("fk_sites")
class FkSiteEntity {
	@describeText
	@PrimaryColumn({ length: 32, type: "varchar" })
	public regionCode!: string;

	@describeText
	@PrimaryColumn({ length: 32, type: "varchar" })
	public siteCode!: string;

	@Column({ length: 32, type: "varchar" })
	@describeText
	public name!: string;
}

@Entity("fk_items")
class FkItemEntity {
	@describeText
	@PrimaryColumn({ length: 32, type: "varchar" })
	public id!: string;

	@Column({ length: 32, type: "varchar" })
	@describeText
	public name!: string;

	@Column({ length: 32, type: "varchar" })
	@describeText
	public ownerId!: string;

	@describeRelation
	@JoinColumn({ name: "ownerId" })
	@ManyToOne(() => FkOwnerEntity, { nullable: false, onDelete: "RESTRICT" })
	public owner?: Relation<FkOwnerEntity>;

	@Column({ length: 32, type: "varchar" })
	@describeText
	public regionCode!: string;

	@Column({ length: 32, type: "varchar" })
	@describeText
	public siteCode!: string;

	@describeRelation
	@JoinColumn([
		{ name: "regionCode", referencedColumnName: "regionCode" },
		{ name: "siteCode", referencedColumnName: "siteCode" },
	])
	@ManyToOne(() => FkSiteEntity, { nullable: false, onDelete: "RESTRICT" })
	public site?: Relation<FkSiteEntity>;
}

// The entity with an eager relation
@Entity("fk_notes")
class FkNoteEntity {
	@describeText
	@PrimaryColumn({ length: 32, type: "varchar" })
	public id!: string;

	@Column({ length: 32, type: "varchar" })
	@describeText
	public name!: string;

	@Column({ length: 32, type: "varchar" })
	@describeText
	public ownerId!: string;

	@describeRelation
	@JoinColumn({ name: "ownerId" })
	@ManyToOne(() => FkOwnerEntity, { eager: true, nullable: false, onDelete: "RESTRICT" })
	public owner?: Relation<FkOwnerEntity>;
}

const ENTITIES: Array<new () => unknown> = [FkOwnerEntity, FkSiteEntity, FkItemEntity, FkNoteEntity];

@Injectable()
@ApiService({ entity: FkOwnerEntity })
class FkOwnerService extends ApiServiceBase<FkOwnerEntity> {
	@InjectRepository(FkOwnerEntity)
	public readonly repository!: Repository<FkOwnerEntity>;
}

@Injectable()
@ApiService({ entity: FkSiteEntity })
class FkSiteService extends ApiServiceBase<FkSiteEntity> {
	@InjectRepository(FkSiteEntity)
	public readonly repository!: Repository<FkSiteEntity>;
}

@Injectable()
@ApiService({ entity: FkItemEntity })
class FkItemService extends ApiServiceBase<FkItemEntity> {
	@InjectRepository(FkItemEntity)
	public readonly repository!: Repository<FkItemEntity>;
}

@Injectable()
@ApiService({ entity: FkNoteEntity })
class FkNoteService extends ApiServiceBase<FkNoteEntity> {
	@InjectRepository(FkNoteEntity)
	public readonly repository!: Repository<FkNoteEntity>;
}

@ApiController<FkOwnerEntity>({ entity: FkOwnerEntity, name: "FkOwners", path: "fk-owners", routes: {} })
class FkOwnerController {
	public constructor(@Inject(FkOwnerService) public readonly service: FkOwnerService) {}
}

@ApiController<FkSiteEntity>({ entity: FkSiteEntity, name: "FkSites", path: "fk-sites", routes: {} })
class FkSiteController {
	public constructor(@Inject(FkSiteService) public readonly service: FkSiteService) {}
}

@ApiController<FkItemEntity>({ entity: FkItemEntity, name: "FkItems", path: "fk-items", routes: {} })
class FkItemController {
	public constructor(@Inject(FkItemService) public readonly service: FkItemService) {}
}

@ApiController<FkNoteEntity>({ entity: FkNoteEntity, name: "FkNotes", path: "fk-notes", routes: {} })
class FkNoteController {
	public constructor(@Inject(FkNoteService) public readonly service: FkNoteService) {}
}

interface IRefusalCase {
	body?: Record<string, unknown>;
	// Class name of the refused entity, which the code and the log name
	entityName: string;
	method: "DELETE" | "PATCH" | "POST" | "PUT";
	name: string;
	// The OpenAPI path of the route, with the values of its path parameters
	path: string;
	pathValues?: Record<string, string>;
	status: HttpStatus.BAD_REQUEST | HttpStatus.CONFLICT;
}

// A full body names each required relation, and its own columns name the same row
const itemBody = (ownerId: string, regionCode: string, siteCode: string): Record<string, unknown> => ({ name: "item", owner: ownerId, ownerId, regionCode, site: { regionCode, siteCode }, siteCode });
const noteBody = (ownerId: string): Record<string, unknown> => ({ name: "note", owner: ownerId, ownerId });

const CASES: ReadonlyArray<IRefusalCase> = [
	{ entityName: "FkOwnerEntity", method: "DELETE", name: "DELETE of a row an item still references", path: "/fk-owners/{id}", pathValues: { id: OWNER_ITEM }, status: HttpStatus.CONFLICT },
	{ entityName: "FkOwnerEntity", method: "DELETE", name: "DELETE of a row only an eager relation still references", path: "/fk-owners/{id}", pathValues: { id: OWNER_NOTE }, status: HttpStatus.CONFLICT },
	{ entityName: "FkSiteEntity", method: "DELETE", name: "DELETE of a row a composite foreign key still references", path: "/fk-sites/{regionCode}/{siteCode}", pathValues: { regionCode: "r1", siteCode: "s1" }, status: HttpStatus.CONFLICT },
	{ body: { ...itemBody(OWNER_MISSING, "r1", "s1"), id: "item-new" }, entityName: "FkItemEntity", method: "POST", name: "POST naming a missing row", path: "/fk-items", status: HttpStatus.BAD_REQUEST },
	{ body: itemBody(OWNER_MISSING, "r1", "s1"), entityName: "FkItemEntity", method: "PUT", name: "PUT naming a missing row", path: "/fk-items/{id}", pathValues: { id: ITEM }, status: HttpStatus.BAD_REQUEST },
	{ body: { ownerId: OWNER_MISSING }, entityName: "FkItemEntity", method: "PATCH", name: "PATCH naming a missing row", path: "/fk-items/{id}", pathValues: { id: ITEM }, status: HttpStatus.BAD_REQUEST },
	{ body: { ...itemBody(OWNER_ITEM, "r9", "s9"), id: "item-new" }, entityName: "FkItemEntity", method: "POST", name: "POST naming a missing row through a composite foreign key", path: "/fk-items", status: HttpStatus.BAD_REQUEST },
	{ body: itemBody(OWNER_ITEM, "r9", "s9"), entityName: "FkItemEntity", method: "PUT", name: "PUT naming a missing row through a composite foreign key", path: "/fk-items/{id}", pathValues: { id: ITEM }, status: HttpStatus.BAD_REQUEST },
	{ body: { regionCode: "r9", siteCode: "s9" }, entityName: "FkItemEntity", method: "PATCH", name: "PATCH naming a missing row through a composite foreign key", path: "/fk-items/{id}", pathValues: { id: ITEM }, status: HttpStatus.BAD_REQUEST },
	{ body: { ...noteBody(OWNER_MISSING), id: "note-new" }, entityName: "FkNoteEntity", method: "POST", name: "POST of an entity with an eager relation naming a missing row", path: "/fk-notes", status: HttpStatus.BAD_REQUEST },
	{ body: noteBody(OWNER_MISSING), entityName: "FkNoteEntity", method: "PUT", name: "PUT of an entity with an eager relation naming a missing row", path: "/fk-notes/{id}", pathValues: { id: NOTE }, status: HttpStatus.BAD_REQUEST },
	{ body: { ownerId: OWNER_MISSING }, entityName: "FkNoteEntity", method: "PATCH", name: "PATCH of an entity with an eager relation naming a missing row", path: "/fk-notes/{id}", pathValues: { id: NOTE }, status: HttpStatus.BAD_REQUEST },
];

// Driver text the body must not carry: table and constraint names, column names and every key value the cases use
const LEAK_PATTERN: RegExp = /fk_|FK_|ownerId|regionCode|siteCode|owner-|item-|note-|r1|s1|r9|s9|referenced from|not present|foreign key constraint/u;

// The schema names each driver gives to the log: SQLite names no constraint, table or column
const LOG_EVIDENCE: Record<TDatabase, RegExp> = {
	mariadb: /errorType=QueryFailedError details=\{"constraint":"FK_[^"]+"(?:,"(?:field|referencedField|referencedTable)":"[^"]+")*\}$/u,
	mysql: /errorType=QueryFailedError details=\{"constraint":"FK_[^"]+"(?:,"(?:field|referencedField|referencedTable)":"[^"]+")*\}$/u,
	postgres: /errorType=QueryFailedError sqlState=23503 details=\{"constraint":"FK_[^"]+","field":"[^"]+","referencedTable":"[^"]+","table":"[^"]+"\}$/u,
	sqlite: /errorType=QueryFailedError details=\{\}$/u,
};

// Key values the cases send or store, which the log must not quote
const LOG_VALUE_PATTERN: RegExp = /owner-|item-|note-|"r1|"s1|r9|s9|"detail"|"value"/u;

interface ISetup {
	createFilters: (application: INestApplication) => Array<ExceptionFilter>;
	createInterceptors: () => Array<NestInterceptor>;
	hasCorrelationFields: boolean;
}

const SETUPS: Array<[string, ISetup]> = [
	["without the correlation interceptor and filter", { createFilters: (): Array<ExceptionFilter> => [], createInterceptors: (): Array<NestInterceptor> => [], hasCorrelationFields: false }],
	["with the correlation interceptor and filter", { createFilters: (application: INestApplication): Array<ExceptionFilter> => [new CorrelationIDResponseBodyExceptionFilter(application.get(HttpAdapterHost))], createInterceptors: (): Array<NestInterceptor> => [new CorrelationIDResponseBodyInterceptor()], hasCorrelationFields: true }],
];

const ADAPTERS: Array<[string, () => ExpressAdapter | FastifyAdapter]> = [
	["Fastify", (): FastifyAdapter => new FastifyAdapter()],
	["Express", (): ExpressAdapter => new ExpressAdapter()],
];

/**
 * Drops OpenAPI `nullable: false`, its default, which Ajv rejects next to a schema combinator.
 * @param {unknown} value - OpenAPI schema fragment.
 * @returns {unknown} The fragment without `nullable: false`.
 */
function withoutNonNullableFlags(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((item: unknown): unknown => withoutNonNullableFlags(item));
	}

	if (value === null || typeof value !== "object") {
		return value;
	}

	return Object.fromEntries(
		Object.entries(value)
			.filter(([key, item]: [string, unknown]): boolean => key !== "nullable" || item !== false)
			.map(([key, item]: [string, unknown]): [string, unknown] => [key, withoutNonNullableFlags(item)]),
	);
}

const startMariaDb = async (): Promise<StartedTestContainer> =>
	await new GenericContainer("mariadb:11")
		.withEnvironment({ MARIADB_DATABASE: "fkrefusal", MARIADB_ROOT_PASSWORD: MARIADB_PASSWORD })
		.withExposedPorts(MYSQL_PORT)
		// The image first runs a temporary server on port 0 to initialize the database.
		.withWaitStrategy(Wait.forLogMessage(/port: 3306\s/u))
		.withStartupTimeout(240_000)
		.start();

describe.each<{ database: TDatabase; databaseName: string }>([
	{ database: "postgres", databaseName: "PostgreSQL 17" },
	{ database: "mysql", databaseName: "MySQL 8.4" },
	{ database: "mariadb", databaseName: "MariaDB 11" },
	{ database: "sqlite", databaseName: "SQLite" },
])("foreign key refusals of generated routes on $databaseName (E2E)", ({ database }: { database: TDatabase; databaseName: string }) => {
	let mariaDbContainer: StartedTestContainer | undefined;
	let mysqlContainer: StartedMySqlContainer | undefined;
	let postgresContainer: StartedPostgreSqlContainer | undefined;

	const connection = (): TypeOrmModuleOptions => {
		if (mariaDbContainer) {
			return { database: "fkrefusal", dropSchema: true, entities: ENTITIES, host: mariaDbContainer.getHost(), password: MARIADB_PASSWORD, port: mariaDbContainer.getMappedPort(MYSQL_PORT), synchronize: true, type: "mysql", username: "root" };
		}

		if (mysqlContainer) {
			return { database: mysqlContainer.getDatabase(), dropSchema: true, entities: ENTITIES, host: mysqlContainer.getHost(), password: mysqlContainer.getUserPassword(), port: mysqlContainer.getPort(), synchronize: true, type: "mysql", username: mysqlContainer.getUsername() };
		}

		if (postgresContainer) {
			return { dropSchema: true, entities: ENTITIES, synchronize: true, type: "postgres", url: postgresContainer.getConnectionUri() };
		}

		return { database: ":memory:", dropSchema: true, entities: ENTITIES, synchronize: true, type: "better-sqlite3" };
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
	}, 300_000);

	afterAll(async () => {
		await postgresContainer?.stop();
		await mysqlContainer?.stop();
		await mariaDbContainer?.stop();
	});

	describe.each(ADAPTERS)("on %s", (_adapterName: string, createAdapter: () => ExpressAdapter | FastifyAdapter) => {
		describe.each(SETUPS)("%s", (_setupName: string, setup: ISetup) => {
			let app: INestApplication | undefined;
			let ajv: Ajv;
			let baseUrl: string;
			let document: OpenAPIObject;

			const readStored = async (): Promise<unknown> => {
				const owners: Repository<FkOwnerEntity> = app!.get(FkOwnerService).repository;
				const { manager } = owners;

				return {
					items: await manager.find(FkItemEntity, { order: { id: "ASC" } }),
					notes: await manager.find(FkNoteEntity, { loadEagerRelations: false, order: { id: "ASC" } }),
					owners: await manager.find(FkOwnerEntity, { order: { id: "ASC" } }),
					sites: await manager.find(FkSiteEntity, { order: { regionCode: "ASC", siteCode: "ASC" } }),
				};
			};

			const STORED: unknown = {
				items: [{ id: ITEM, name: "item", ownerId: OWNER_ITEM, regionCode: "r1", siteCode: "s1" }],
				notes: [{ id: NOTE, name: "note", ownerId: OWNER_NOTE }],
				owners: [
					{ id: OWNER_ITEM, name: "item owner" },
					{ id: OWNER_NOTE, name: "note owner" },
				],
				sites: [{ name: "site", regionCode: "r1", siteCode: "s1" }],
			};

			beforeAll(async () => {
				const moduleReference = await Test.createTestingModule({
					controllers: [FkOwnerController, FkSiteController, FkItemController, FkNoteController],
					imports: [TypeOrmModule.forRoot(connection()), TypeOrmModule.forFeature(ENTITIES), ApiAuthorizationModule.forRoot({}), ApiSubscriberModule],
					providers: [FkOwnerService, FkSiteService, FkItemService, FkNoteService],
				}).compile();

				app = moduleReference.createNestApplication(createAdapter(), { logger: false });
				app.useGlobalPipes(new ValidationPipe({ transform: true }));
				app.useGlobalInterceptors(...setup.createInterceptors());
				app.useGlobalFilters(...setup.createFilters(app));
				await app.listen(0, "127.0.0.1");
				baseUrl = (await app.getUrl()).replace("[::1]", "127.0.0.1");
				document = SwaggerModule.createDocument(app, new DocumentBuilder().build());

				const { manager } = app.get(FkOwnerService).repository;
				await manager.save(FkOwnerEntity, [
					{ id: OWNER_ITEM, name: "item owner" },
					{ id: OWNER_NOTE, name: "note owner" },
				]);
				await manager.save(FkSiteEntity, { name: "site", regionCode: "r1", siteCode: "s1" });
				await manager.save(FkItemEntity, { id: ITEM, name: "item", ownerId: OWNER_ITEM, regionCode: "r1", siteCode: "s1" });
				await manager.save(FkNoteEntity, { id: NOTE, name: "note", ownerId: OWNER_NOTE });

				ajv = new Ajv({ allErrors: true, discriminator: false, strict: false });
				addFormats(ajv);
				ajv.addFormat("int64", true);
				ajv.addFormat("string", true);
				ajv.addSchema({ components: withoutNonNullableFlags(document.components) }, "openapi");
			}, 120_000);

			afterAll(async () => {
				await app?.close();
			});

			beforeEach(() => {
				if (vi.isMockFunction(LoggerUtility.prototype.verbose)) {
					vi.mocked(LoggerUtility.prototype.verbose).mockClear();
				} else {
					vi.spyOn(LoggerUtility.prototype, "verbose").mockImplementation(() => undefined);
				}
			});

			it("declares a 409 on generated DELETE, POST, PUT and PATCH, and a 400 on each", () => {
				for (const [path, method] of [
					["/fk-owners/{id}", "delete"],
					["/fk-sites/{regionCode}/{siteCode}", "delete"],
					["/fk-items", "post"],
					["/fk-items/{id}", "put"],
					["/fk-items/{id}", "patch"],
				] as const) {
					const responses: Record<string, unknown> | undefined = (document.paths[path] as Record<string, { responses: Record<string, unknown> }> | undefined)?.[method]?.responses;

					expect(Object.keys(responses ?? {}), `${method} ${path}`).toEqual(expect.arrayContaining(["400", "409"]));
				}
			});

			it.each(CASES.map((refusalCase: IRefusalCase): [string, IRefusalCase] => [refusalCase.name, refusalCase]))("%s answers the code-only body the route declares and logs only schema names", async (_name: string, refusalCase: IRefusalCase) => {
				const url: string = Object.entries(refusalCase.pathValues ?? {}).reduce((path: string, [key, value]: [string, string]): string => path.replace(`{${key}}`, encodeURIComponent(value)), refusalCase.path);
				const response: Response = await fetch(`${baseUrl}${url}`, { ...(refusalCase.body === undefined ? {} : { body: JSON.stringify(refusalCase.body), headers: { "content-type": "application/json" } }), method: refusalCase.method });
				const text: string = await response.text();
				const body: Record<string, unknown> = JSON.parse(text) as Record<string, unknown>;
				const { correlationID, timestamp, ...codes }: Record<string, unknown> = body;
				const isConflict: boolean = refusalCase.status === HttpStatus.CONFLICT;

				expect(response.status, text).toBe(refusalCase.status);
				expect(codes).toEqual({ details: { type: "FOREIGN_KEY_VIOLATION" }, error: isConflict ? "Conflict" : "Bad Request", message: `${refusalCase.entityName.toUpperCase()}_${isConflict ? "REFERENCED" : "REFERENCE_NOT_VALID"}`, statusCode: refusalCase.status });
				expect(correlationID !== undefined && timestamp !== undefined).toBe(setup.hasCorrelationFields);
				expect(text.replace(String(correlationID), "")).not.toMatch(LEAK_PATTERN);

				const reference: string | undefined = (document.paths[refusalCase.path] as Record<string, { responses: Record<string, { content?: Record<string, { schema?: { $ref?: string } }> }> }>)[refusalCase.method.toLowerCase()]?.responses[String(refusalCase.status)]?.content?.["application/json"]?.schema?.$ref;

				expect(reference, `${refusalCase.method} ${refusalCase.path} ${String(refusalCase.status)}`).toBeDefined();

				const validate = ajv.getSchema(`openapi${reference ?? ""}`);

				expect(validate?.(body), JSON.stringify(validate?.errors)).toBe(true);

				const logged: Array<string> = vi
					.mocked(LoggerUtility.prototype.verbose)
					.mock.calls.map((call: Array<unknown>): unknown => call[0])
					.filter((line: unknown): line is string => typeof line === "string" && line.startsWith("Foreign key violation"));

				expect(logged).toHaveLength(1);
				expect(logged[0]).toContain(`Foreign key violation (${isConflict ? "still referenced" : "reference not valid"}) for entity ${refusalCase.entityName}: `);
				expect(logged[0]).toMatch(LOG_EVIDENCE[database]);
				expect(logged[0]).not.toMatch(LOG_VALUE_PATTERN);
				expect(await readStored()).toEqual(STORED);
			});
		});
	});
});
