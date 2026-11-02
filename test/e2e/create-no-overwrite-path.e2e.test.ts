import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";

import { Inject, Injectable, Module } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Column, DataSource, Entity, JoinColumn, ManyToOne, PrimaryColumn, Repository } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiPropertyDescribe, ApiService, ApiServiceBase, ApiSubscriberModule, AuthorizationResolveDefaultPrincipal, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

const describeString: PropertyDecorator = ApiPropertyDescribe({ description: "text", exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING });

const disabledRoute = { generation: { isEnabled: false } } as const;

@Entity("create_path_parents")
class CreatePathParentEntity {
	@describeString
	@PrimaryColumn({ length: 64, type: "varchar" })
	public id!: string;

	@describeString
	@Column({ length: 64, type: "varchar" })
	public name!: string;
}

@Entity("create_path_items")
class CreatePathItemEntity {
	@describeString
	@PrimaryColumn({ length: 64, type: "varchar" })
	public id!: string;

	@describeString
	@Column({ length: 64, type: "varchar" })
	public name!: string;

	@JoinColumn({ name: "parentId" })
	@ManyToOne(() => CreatePathParentEntity)
	public parent?: CreatePathParentEntity;

	@describeString
	@Column({ length: 64, type: "varchar" })
	public parentId!: string;
}

// A key of two columns, which a path binding and a row path address together.
@Entity("create_path_rows")
class CreatePathRowEntity {
	@describeString
	@PrimaryColumn({ length: 64, type: "varchar" })
	public id!: string;

	@describeString
	@Column({ length: 64, type: "varchar" })
	public name!: string;

	@describeString
	@PrimaryColumn({ length: 64, type: "varchar" })
	public tenantId!: string;
}

@Injectable()
@ApiService({ entity: CreatePathItemEntity })
class CreatePathItemService extends ApiServiceBase<CreatePathItemEntity> {
	@InjectRepository(CreatePathItemEntity)
	public readonly repository!: Repository<CreatePathItemEntity>;
}

@Injectable()
@ApiService({ entity: CreatePathRowEntity })
class CreatePathRowService extends ApiServiceBase<CreatePathRowEntity> {
	@InjectRepository(CreatePathRowEntity)
	public readonly repository!: Repository<CreatePathRowEntity>;
}

@ApiController<CreatePathItemEntity>({
	entity: CreatePathItemEntity,
	name: "create-path-item",
	path: "parents/:parentKey/items",
	pathScope: { parameters: [{ field: "parentId", parameter: "parentKey" }] },
	routes: {
		[EApiRouteType.CREATE]: {},
		[EApiRouteType.DELETE]: disabledRoute,
		[EApiRouteType.GET]: disabledRoute,
		[EApiRouteType.GET_LIST]: disabledRoute,
		[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
		[EApiRouteType.UPDATE]: disabledRoute,
	},
})
class CreatePathItemController {
	@Inject(CreatePathItemService)
	public readonly service!: CreatePathItemService;
}

// The path binds tenantId, so the row path of the key (tenantId, id) is /:id.
@ApiController<CreatePathRowEntity>({
	entity: CreatePathRowEntity,
	name: "create-path-tenant-row",
	path: "tenants/:tenantKey/rows",
	pathScope: { parameters: [{ field: "tenantId", parameter: "tenantKey" }] },
	routes: {
		[EApiRouteType.CREATE]: {},
		[EApiRouteType.DELETE]: disabledRoute,
		[EApiRouteType.GET]: {},
		[EApiRouteType.GET_LIST]: disabledRoute,
		[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
		[EApiRouteType.UPDATE]: disabledRoute,
	},
})
class CreatePathTenantRowController {
	@Inject(CreatePathRowService)
	public readonly service!: CreatePathRowService;
}

// No path binding: the row path names both key columns in the order rowPath gives.
@ApiController<CreatePathRowEntity>({
	entity: CreatePathRowEntity,
	name: "create-path-ordered-row",
	path: "ordered-rows",
	routes: {
		[EApiRouteType.CREATE]: {},
		[EApiRouteType.DELETE]: disabledRoute,
		[EApiRouteType.GET]: {},
		[EApiRouteType.GET_LIST]: disabledRoute,
		[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
		[EApiRouteType.UPDATE]: disabledRoute,
	},
	rowPath: { fields: ["id", "tenantId"] },
})
class CreatePathOrderedRowController {
	@Inject(CreatePathRowService)
	public readonly service!: CreatePathRowService;
}

interface IDriver {
	name: string;
	start: () => Promise<{ container?: StartedPostgreSqlContainer; options: object }>;
}

const DRIVERS: Array<IDriver> = [
	{ name: "better-sqlite3", start: async () => ({ options: { database: ":memory:", type: "better-sqlite3" } }) },
	{
		name: "postgres",
		start: async () => {
			const container: StartedPostgreSqlContainer = await new PostgreSqlContainer("postgres:17-alpine").start();

			return { container, options: { type: "postgres", url: container.getConnectionUri() } };
		},
	},
];

const DUPLICATE_ITEM: Record<string, unknown> = { details: { type: "UNIQUE_VIOLATION" }, error: "Conflict", message: "CREATEPATHITEMENTITY_DUPLICATE_KEY", statusCode: 409 };
const DUPLICATE_ROW: Record<string, unknown> = { ...DUPLICATE_ITEM, message: "CREATEPATHROWENTITY_DUPLICATE_KEY" };

// Item I1 belongs to parent P1 and item I2 to parent P2. Row R1 exists in tenant T1, and row R2 only in tenant T2.
const STORED_ITEMS: Array<Record<string, unknown>> = [
	{ id: "I1", name: "First", parentId: "P1" },
	{ id: "I2", name: "Second", parentId: "P2" },
];

const STORED_ROWS: Array<Record<string, unknown>> = [
	{ id: "R1", name: "First", tenantId: "T1" },
	{ id: "R2", name: "Second", tenantId: "T2" },
];

describe.each(DRIVERS)("A create under a path scope or a row path never overwrites a stored row on $name (E2E)", (driver: IDriver) => {
	let app: INestApplication;
	let container: StartedPostgreSqlContainer | undefined;
	let items: Repository<CreatePathItemEntity>;
	let parents: Repository<CreatePathParentEntity>;
	let rows: Repository<CreatePathRowEntity>;

	const readItems = async (): Promise<Array<Record<string, unknown>>> => (await items.find({ order: { id: "ASC" } })).map((item: CreatePathItemEntity): Record<string, unknown> => ({ id: item.id, name: item.name, parentId: item.parentId }));

	const readRows = async (): Promise<Array<Record<string, unknown>>> => (await rows.find({ order: { tenantId: "ASC", id: "ASC" } })).map((row: CreatePathRowEntity): Record<string, unknown> => ({ id: row.id, name: row.name, tenantId: row.tenantId }));

	const send = async (method: "GET" | "POST", url: string, body?: object): Promise<{ json: () => unknown; statusCode: number }> => await app.getHttpAdapter().getInstance().inject({ method, payload: body, url });

	beforeAll(async () => {
		const started = await driver.start();
		container = started.container;

		@Module({
			controllers: [CreatePathItemController, CreatePathOrderedRowController, CreatePathTenantRowController],
			imports: [TypeOrmModule.forRoot({ ...started.options, dropSchema: true, entities: [CreatePathItemEntity, CreatePathParentEntity, CreatePathRowEntity], logging: false, synchronize: true } as never), TypeOrmModule.forFeature([CreatePathItemEntity, CreatePathRowEntity]), ApiAuthorizationModule.forRoot({ principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) } } as never), ApiSubscriberModule],
			providers: [CreatePathItemService, CreatePathRowService],
		})
		class CreatePathModule {}

		const moduleRef = await Test.createTestingModule({ imports: [CreatePathModule] }).compile();
		app = moduleRef.createNestApplication(new FastifyAdapter());
		await app.init();
		await app.getHttpAdapter().getInstance().ready();
		const dataSource: DataSource = moduleRef.get(DataSource);
		items = dataSource.getRepository(CreatePathItemEntity);
		parents = dataSource.getRepository(CreatePathParentEntity);
		rows = dataSource.getRepository(CreatePathRowEntity);
	}, 300_000);

	afterAll(async () => {
		await app?.close();
		await container?.stop();
	}, 60_000);

	beforeEach(async () => {
		await items.createQueryBuilder().delete().execute();
		await parents.createQueryBuilder().delete().execute();
		await rows.createQueryBuilder().delete().execute();
		await parents.save([
			{ id: "P1", name: "Parent one" },
			{ id: "P2", name: "Parent two" },
		]);
		await items.save([
			{ id: "I1", name: "First", parentId: "P1" },
			{ id: "I2", name: "Second", parentId: "P2" },
		]);
		await rows.save(STORED_ROWS);
	});

	describe("under a parent the path scope binds", () => {
		it.each([
			["only the key of an item of another parent", { id: "I2" }],
			["an item of another parent with the parent column of the path", { id: "I2", name: "Taken", parentId: "P1" }],
			["an item of another parent with the parent relation of the path", { id: "I2", name: "Taken", parent: { id: "P1" } }],
			["an item of the parent of the path", { id: "I1", name: "Taken" }],
		])("answers 409 to a body that names %s", async (_name: string, body: Record<string, unknown>) => {
			const response = await send("POST", "/parents/P1/items", body);

			expect.soft(response.statusCode).toBe(409);
			expect.soft(response.json()).toEqual(DUPLICATE_ITEM);
			expect(await readItems()).toEqual(STORED_ITEMS);
		});

		it("creates a new item under the parent of the path", async () => {
			const response = await send("POST", "/parents/P1/items", { id: "I3", name: "Third" });

			expect.soft(response.statusCode).toBe(201);
			expect(await readItems()).toEqual([...STORED_ITEMS, { id: "I3", name: "Third", parentId: "P1" }]);
		});
	});

	describe("on a key the path scope binds in part, with the row path /:id", () => {
		it("answers 409 to a body that names a row of the tenant of the path", async () => {
			const response = await send("POST", "/tenants/T1/rows", { id: "R1", name: "Taken" });

			expect.soft(response.statusCode).toBe(409);
			expect.soft(response.json()).toEqual(DUPLICATE_ROW);
			expect(await readRows()).toEqual(STORED_ROWS);
			expect((await send("GET", "/tenants/T1/rows/R1")).json()).toMatchObject({ id: "R1", name: "First", tenantId: "T1" });
		});

		it("creates a row of the tenant of the path whose id another tenant holds", async () => {
			const response = await send("POST", "/tenants/T1/rows", { id: "R2", name: "Third" });

			expect.soft(response.statusCode).toBe(201);
			expect(await readRows()).toEqual([STORED_ROWS[0], { id: "R2", name: "Third", tenantId: "T1" }, STORED_ROWS[1]]);
		});
	});

	describe("on a key a rowPath orders, with the row path /:id/:tenantId", () => {
		it("answers 409 to a body that names a stored row", async () => {
			const response = await send("POST", "/ordered-rows", { id: "R1", name: "Taken", tenantId: "T1" });

			expect.soft(response.statusCode).toBe(409);
			expect.soft(response.json()).toEqual(DUPLICATE_ROW);
			expect(await readRows()).toEqual(STORED_ROWS);
			expect((await send("GET", "/ordered-rows/R1/T1")).json()).toMatchObject({ id: "R1", name: "First", tenantId: "T1" });
		});

		it("creates a row whose id another tenant holds", async () => {
			const response = await send("POST", "/ordered-rows", { id: "R2", name: "Third", tenantId: "T1" });

			expect.soft(response.statusCode).toBe(201);
			expect(await readRows()).toEqual([STORED_ROWS[0], { id: "R2", name: "Third", tenantId: "T1" }, STORED_ROWS[1]]);
		});
	});
});
