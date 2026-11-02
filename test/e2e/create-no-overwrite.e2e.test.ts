import "reflect-metadata";

import type { ExecutionContext, INestApplication } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { StartedTestContainer } from "testcontainers";

import { Inject, Injectable, Module } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { GenericContainer, Wait } from "testcontainers";
import { Column, DataSource, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn, Repository } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiAuthorizationPolicy, ApiAuthorizationPolicyBase, ApiController, ApiControllerSecurable, ApiPropertyDescribe, ApiService, ApiServiceBase, ApiSubscriberModule, AuthorizationResolveDefaultPrincipal, EApiAuthenticationType, EApiAuthorizationMode, EApiDtoType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

const IN_SCOPE: string = "tenant-1";
const OUT_OF_SCOPE: string = "tenant-2";
const RACE_ROUNDS: number = 4;
const RACE_SIZE: number = 8;
const MYSQL_PORT: number = 3306;
const MYSQL_DATABASE: string = "no_overwrite";
const MYSQL_PASSWORD: string = "no-overwrite";

const describeString: (description: string) => PropertyDecorator = (description: string): PropertyDecorator =>
	ApiPropertyDescribe({
		description,
		exampleValue: "value",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		properties: { [EApiRouteType.CREATE]: { [EApiDtoType.BODY]: { isRequired: false } } },
		type: EApiPropertyDescribeType.STRING,
	});

@Entity("no_overwrite_owners")
class OwnerEntity {
	@PrimaryColumn({ length: 64, type: "varchar" })
	public id!: string;

	@Column({ length: 64, type: "varchar" })
	public name!: string;

	@Column({ length: 64, type: "varchar" })
	public tenantId!: string;
}

@Entity("no_overwrite_items")
class ItemEntity {
	@OneToMany(() => ChildEntity, (child: ChildEntity) => child.parent, { cascade: true })
	public children?: Array<ChildEntity>;

	@PrimaryColumn({ length: 64, type: "varchar" })
	@describeString("id")
	public id!: string;

	@Column({ length: 64, type: "varchar" })
	@describeString("name")
	public name!: string;

	@JoinColumn({ name: "ownerId" })
	@ManyToOne(() => OwnerEntity, { cascade: true, nullable: true })
	public owner?: null | OwnerEntity;

	@Column({ length: 64, type: "varchar" })
	@describeString("tenantId")
	public tenantId!: string;
}

@Entity("no_overwrite_children")
class ChildEntity {
	@PrimaryColumn({ length: 64, type: "varchar" })
	public id!: string;

	@Column({ length: 64, type: "varchar" })
	public name!: string;

	@JoinColumn({ name: "parentId" })
	@ManyToOne(() => ItemEntity, (item: ItemEntity) => item.children, { nullable: true })
	public parent?: ItemEntity | null;

	@Column({ length: 64, type: "varchar" })
	public tenantId!: string;
}

@Entity("no_overwrite_memberships")
class MembershipEntity {
	@PrimaryColumn({ length: 64, type: "varchar" })
	@describeString("code")
	public code!: string;

	@Column({ length: 64, type: "varchar" })
	@describeString("role")
	public role!: string;

	@PrimaryColumn({ length: 64, type: "varchar" })
	@describeString("tenantId")
	public tenantId!: string;
}

@Injectable()
@ApiService({ entity: ItemEntity })
class ItemService extends ApiServiceBase<ItemEntity> {
	@InjectRepository(ItemEntity)
	public readonly repository!: Repository<ItemEntity>;
}

@Injectable()
@ApiService({ entity: MembershipEntity })
class MembershipService extends ApiServiceBase<MembershipEntity> {
	@InjectRepository(MembershipEntity)
	public readonly repository!: Repository<MembershipEntity>;
}

@Injectable()
@ApiAuthorizationPolicy({ entity: ItemEntity })
class ItemPolicy extends ApiAuthorizationPolicyBase<ItemEntity> {
	public onBeforeCreate() {
		return this.allow({ scope: () => ({ where: { tenantId: IN_SCOPE } }) });
	}
}

@Injectable()
class NoOverwriteAuthGuard implements IAuthGuard {
	public canActivate(context: ExecutionContext): boolean {
		context.switchToHttp().getRequest<{ user?: unknown }>().user = { id: "user-1", tenantId: IN_SCOPE };

		return true;
	}

	public getAuthenticateOptions(): undefined {
		return undefined;
	}

	public getRequest<T = unknown>(context: ExecutionContext): T {
		return context.switchToHttp().getRequest<T>();
	}

	public handleRequest<T = unknown>(_error: unknown, user: T): T {
		return user;
	}

	public async logIn(): Promise<void> {
		await Promise.resolve();
	}
}

const createOnly = {
	[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
	[EApiRouteType.GET]: { generation: { isEnabled: false } },
	[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
	[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
	[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
};

@ApiControllerSecurable()
@ApiController<ItemEntity>({
	authorization: {
		defaultMode: EApiAuthorizationMode.HOOKS,
		policyNamespace: "no-overwrite:item",
		resourceDefinition: { entity: ItemEntity, fields: [{ isFilterable: true, path: "resource.tenantId", queryPath: "tenantId" }], namespace: "no-overwrite", resourcePath: "no-overwrite/{id}", resourceType: "no-overwrite" },
	},
	entity: ItemEntity,
	name: "no-overwrite-scoped",
	path: "scoped-items",
	routes: { [EApiRouteType.CREATE]: { security: { authentication: { guard: NoOverwriteAuthGuard, type: EApiAuthenticationType.USER } } }, ...createOnly },
})
class ScopedItemController {
	@Inject(ItemService)
	public readonly service!: ItemService;
}

@ApiController<ItemEntity>({ entity: ItemEntity, name: "no-overwrite-open", path: "items", routes: { [EApiRouteType.CREATE]: {}, ...createOnly } })
class OpenItemController {
	@Inject(ItemService)
	public readonly service!: ItemService;
}

@ApiController<MembershipEntity>({ entity: MembershipEntity, name: "no-overwrite-membership", path: "memberships", routes: { [EApiRouteType.CREATE]: {}, ...createOnly } })
class MembershipController {
	@Inject(MembershipService)
	public readonly service!: MembershipService;
}

interface IDriver {
	isRaceCovered: boolean;
	name: string;
	start: () => Promise<{ container?: StartedTestContainer; options: object }>;
}

const DRIVERS: Array<IDriver> = [
	{ isRaceCovered: false, name: "better-sqlite3", start: async () => ({ options: { database: ":memory:", type: "better-sqlite3" } }) },
	{
		isRaceCovered: true,
		name: "postgres",
		start: async () => {
			const container = await new PostgreSqlContainer("postgres:17-alpine").start();

			return { container, options: { database: container.getDatabase(), extra: { max: RACE_SIZE * 2 }, host: container.getHost(), password: container.getPassword(), port: container.getPort(), type: "postgres", username: container.getUsername() } };
		},
	},
	{
		isRaceCovered: true,
		name: "mysql",
		start: async () => {
			const container: StartedTestContainer = await new GenericContainer("mysql:8")
				.withEnvironment({ MYSQL_DATABASE, MYSQL_ROOT_PASSWORD: MYSQL_PASSWORD })
				.withExposedPorts(MYSQL_PORT)
				// The image first runs a temporary server on port 0 to initialize the database.
				.withWaitStrategy(Wait.forLogMessage(/port: 3306\s/u))
				.withStartupTimeout(180_000)
				.start();

			return { container, options: { database: MYSQL_DATABASE, extra: { connectionLimit: RACE_SIZE * 2 }, host: container.getHost(), password: MYSQL_PASSWORD, port: container.getMappedPort(MYSQL_PORT), type: "mysql", username: "root" } };
		},
	},
];

describe.each(DRIVERS)("Generated CREATE never overwrites an existing row on $name (E2E)", (driver: IDriver) => {
	let app: INestApplication;
	let container: StartedTestContainer | undefined;
	let children: Repository<ChildEntity>;
	let items: Repository<ItemEntity>;
	let memberships: Repository<MembershipEntity>;
	let owners: Repository<OwnerEntity>;

	const post = async (path: string, payload: object): Promise<{ body: Record<string, unknown>; status: number }> => {
		const response = await app
			.getHttpAdapter()
			.getInstance()
			.inject({ method: "POST", payload, url: `/${path}` });

		return { body: response.json<Record<string, unknown>>(), status: response.statusCode };
	};

	const readItem = async (id: string): Promise<Record<string, unknown> | null> => {
		const item: ItemEntity | null = await items.findOne({ relations: { owner: true }, where: { id } });

		return item ? { id: item.id, name: item.name, ownerId: item.owner?.id ?? null, tenantId: item.tenantId } : null;
	};

	const readChild = async (id: string): Promise<Record<string, unknown> | null> => {
		const child: ChildEntity | null = await children.findOne({ relations: { parent: true }, where: { id } });

		return child ? { id: child.id, name: child.name, parentId: child.parent?.id ?? null, tenantId: child.tenantId } : null;
	};

	beforeAll(async () => {
		const started = await driver.start();
		container = started.container;

		@Module({
			controllers: [MembershipController, OpenItemController, ScopedItemController],
			imports: [TypeOrmModule.forRoot({ ...started.options, dropSchema: true, entities: [ChildEntity, ItemEntity, MembershipEntity, OwnerEntity], logging: false, synchronize: true } as never), TypeOrmModule.forFeature([ItemEntity, MembershipEntity]), ApiAuthorizationModule.forRoot({ principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) } } as never), ApiSubscriberModule],
			providers: [ItemPolicy, ItemService, MembershipService, NoOverwriteAuthGuard],
		})
		class NoOverwriteModule {}

		const moduleRef = await Test.createTestingModule({ imports: [NoOverwriteModule] }).compile();
		app = moduleRef.createNestApplication(new FastifyAdapter());
		await app.init();
		await app.getHttpAdapter().getInstance().ready();
		const dataSource: DataSource = moduleRef.get(DataSource);
		children = dataSource.getRepository(ChildEntity);
		items = dataSource.getRepository(ItemEntity);
		memberships = dataSource.getRepository(MembershipEntity);
		owners = dataSource.getRepository(OwnerEntity);
	}, 300_000);

	afterAll(async () => {
		await app?.close();
		await container?.stop();
	}, 60_000);

	beforeEach(async () => {
		await children.createQueryBuilder().delete().execute();
		await items.createQueryBuilder().delete().execute();
		await owners.createQueryBuilder().delete().execute();
		await memberships.createQueryBuilder().delete().execute();
		await owners.save({ id: "owner-foreign", name: "Foreign owner", tenantId: OUT_OF_SCOPE });
		await items.save({ id: "item-foreign", name: "Foreign item", owner: { id: "owner-foreign" }, tenantId: OUT_OF_SCOPE });
		await children.save({ id: "child-foreign", name: "Foreign child", parent: { id: "item-foreign" }, tenantId: OUT_OF_SCOPE });
		await memberships.save({ code: "member-1", role: "owner", tenantId: OUT_OF_SCOPE });
	});

	const FOREIGN_ITEM: Record<string, unknown> = { id: "item-foreign", name: "Foreign item", ownerId: "owner-foreign", tenantId: OUT_OF_SCOPE };
	const FOREIGN_OWNER: Record<string, unknown> = { id: "owner-foreign", name: "Foreign owner", tenantId: OUT_OF_SCOPE };
	const FOREIGN_CHILD: Record<string, unknown> = { id: "child-foreign", name: "Foreign child", parentId: "item-foreign", tenantId: OUT_OF_SCOPE };

	const expectUntouched = async (): Promise<void> => {
		expect(await readItem("item-foreign")).toEqual(FOREIGN_ITEM);
		expect(await owners.findOneByOrFail({ id: "owner-foreign" })).toEqual(FOREIGN_OWNER);
		expect(await readChild("child-foreign")).toEqual(FOREIGN_CHILD);
		expect(await items.count()).toBe(1);
		expect(await owners.count()).toBe(1);
		expect(await children.count()).toBe(1);
	};

	describe.each(["items", "scoped-items"])("through %s", (path: string) => {
		it("answers 409 and keeps the row when the body names an existing primary key", async () => {
			const response = await post(path, { id: "item-foreign", name: "Hijacked", tenantId: IN_SCOPE });

			expect.soft(response.status).toBe(409);
			expect(JSON.stringify(response.body)).not.toContain("item-foreign");
			await expectUntouched();
		});

		it("answers 409 and keeps the row when the body repeats an existing row exactly", async () => {
			const response = await post(path, { id: "item-foreign", name: "Foreign item", tenantId: OUT_OF_SCOPE });

			expect.soft(response.status).toBe(409);
			await expectUntouched();
		});

		it("answers 409 and keeps the owner when a cascade would rename an existing related row", async () => {
			const response = await post(path, { id: "item-new", name: "New", owner: { id: "owner-foreign", name: "hacked" }, tenantId: IN_SCOPE });

			expect.soft(response.status).toBe(409);
			await expectUntouched();
		});

		it("answers 409 and keeps the child when the body would take over an existing child row", async () => {
			const response = await post(path, { children: [{ id: "child-foreign" }], id: "item-new", name: "New", tenantId: IN_SCOPE });

			expect.soft(response.status).toBe(409);
			await expectUntouched();
		});

		it("creates a row with a new client key, a referenced owner and new cascaded rows", async () => {
			const response = await post(path, { children: [{ id: "child-new", name: "New child", tenantId: IN_SCOPE }], id: "item-new", name: "New", owner: { id: "owner-foreign" }, tenantId: IN_SCOPE });

			expect(response.status).toBe(201);
			expect(await readItem("item-new")).toEqual({ id: "item-new", name: "New", ownerId: "owner-foreign", tenantId: IN_SCOPE });
			expect(await readChild("child-new")).toEqual({ id: "child-new", name: "New child", parentId: "item-new", tenantId: IN_SCOPE });
			expect(await owners.findOneByOrFail({ id: "owner-foreign" })).toEqual(FOREIGN_OWNER);
			expect(await readItem("item-foreign")).toEqual(FOREIGN_ITEM);
			expect(await readChild("child-foreign")).toEqual(FOREIGN_CHILD);
		});

		it("creates a new owner through the cascade", async () => {
			const response = await post(path, { id: "item-new", name: "New", owner: { id: "owner-new", name: "New owner", tenantId: IN_SCOPE }, tenantId: IN_SCOPE });

			expect(response.status).toBe(201);
			expect(await owners.findOneByOrFail({ id: "owner-new" })).toEqual({ id: "owner-new", name: "New owner", tenantId: IN_SCOPE });
			expect(await readItem("item-new")).toEqual({ id: "item-new", name: "New", ownerId: "owner-new", tenantId: IN_SCOPE });
		});
	});

	it("answers 409 and keeps the row when a composite key already exists", async () => {
		const response = await post("memberships", { code: "member-1", role: "admin", tenantId: OUT_OF_SCOPE });

		expect.soft(response.status).toBe(409);
		expect(await memberships.find()).toEqual([{ code: "member-1", role: "owner", tenantId: OUT_OF_SCOPE }]);
	});

	it("creates a composite key that shares one key part with an existing row", async () => {
		const response = await post("memberships", { code: "member-1", role: "admin", tenantId: IN_SCOPE });

		expect(response.status).toBe(201);
		expect(await memberships.count()).toBe(2);
		expect(await memberships.findOneByOrFail({ code: "member-1", tenantId: OUT_OF_SCOPE })).toEqual({ code: "member-1", role: "owner", tenantId: OUT_OF_SCOPE });
	});

	it.runIf(driver.isRaceCovered)("lets exactly one of the requests racing for one new key create it, and keeps its values", { timeout: 120_000 }, async () => {
		for (let round: number = 0; round < RACE_ROUNDS; round += 1) {
			const id: string = `race-${String(round)}`;

			const answers: Array<{ name: string; status: number }> = await Promise.all(
				Array.from({ length: RACE_SIZE }, async (_value: unknown, index: number): Promise<{ name: string; status: number }> => {
					const name: string = `racer-${String(index)}`;

					return { name, status: (await post("items", { id, name, tenantId: IN_SCOPE })).status };
				}),
			);

			const winners: Array<{ name: string; status: number }> = answers.filter((answer: { status: number }): boolean => answer.status === 201);

			expect(answers.filter((answer: { status: number }): boolean => answer.status !== 201 && answer.status !== 409)).toEqual([]);
			expect(winners).toHaveLength(1);
			expect(await readItem(id)).toEqual({ id, name: winners[0]?.name, ownerId: null, tenantId: IN_SCOPE });
		}
	});
});
