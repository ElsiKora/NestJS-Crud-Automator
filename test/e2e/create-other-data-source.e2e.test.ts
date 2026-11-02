import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { StartedTestContainer } from "testcontainers";
import type { EntityManager } from "typeorm";

import { Inject, Injectable, Module } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { getDataSourceToken, InjectDataSource, InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Column, DataSource, Entity, PrimaryGeneratedColumn, Repository } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiFunctionSubscriber, ApiFunctionSubscriberBase, ApiFunctionTransactionScope, ApiPropertyDescribe, ApiService, ApiServiceBase, ApiServiceObservable, ApiSubscriberModule, AuthorizationResolveDefaultPrincipal, EApiFunctionTransactionMode, EApiFunctionType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

const SECOND: string = "second";

const describeText: PropertyDecorator = ApiPropertyDescribe({ description: "text", exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING });

@Entity("other_source_main_items")
class MainItemEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ type: EApiPropertyDescribeType.UUID } as never)
	public id!: string;

	@Column({ type: "varchar" })
	@describeText
	public name!: string;
}

@Entity("other_source_second_items")
class SecondItemEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ type: "varchar" })
	public name!: string;
}

// What the current test runs inside the create, and what a nested call of the second service runs.
const knob: { afterCreate?: (context: { DATA: { eventManager?: EntityManager } }) => Promise<void>; afterSecondCreate?: () => Promise<void> } = {};

@Injectable()
@ApiServiceObservable()
@ApiService({ entity: MainItemEntity })
class MainItemService extends ApiServiceBase<MainItemEntity> {
	@InjectRepository(MainItemEntity)
	public readonly repository!: Repository<MainItemEntity>;
}

@Injectable()
@ApiService({ entity: MainItemEntity, functions: { [EApiFunctionType.CREATE]: { transaction: { mode: EApiFunctionTransactionMode.REQUIRED } } } })
class RequiredMainItemService extends ApiServiceBase<MainItemEntity> {
	@InjectRepository(MainItemEntity)
	public readonly repository!: Repository<MainItemEntity>;
}

@Injectable()
@ApiServiceObservable()
@ApiService({ entity: SecondItemEntity })
class SecondItemService extends ApiServiceBase<SecondItemEntity> {
	@InjectRepository(SecondItemEntity, SECOND)
	public readonly repository!: Repository<SecondItemEntity>;
}

@Injectable()
@ApiService({ entity: SecondItemEntity, functions: { [EApiFunctionType.CREATE]: { transaction: { mode: EApiFunctionTransactionMode.REQUIRED } } } })
class RequiredSecondItemService extends ApiServiceBase<SecondItemEntity> {
	@InjectRepository(SecondItemEntity, SECOND)
	public readonly repository!: Repository<SecondItemEntity>;
}

@Injectable()
@ApiService({ entity: SecondItemEntity, functions: { [EApiFunctionType.CREATE]: { transaction: { mode: EApiFunctionTransactionMode.MANDATORY } } } })
class MandatorySecondItemService extends ApiServiceBase<SecondItemEntity> {
	@InjectRepository(SecondItemEntity, SECOND)
	public readonly repository!: Repository<SecondItemEntity>;
}

@Injectable()
@ApiFunctionSubscriber({ entity: MainItemEntity })
class MainItemSubscriber extends ApiFunctionSubscriberBase<MainItemEntity> {
	public async onAfterCreate(context: { DATA: { eventManager?: EntityManager } }): Promise<undefined> {
		await knob.afterCreate?.(context);

		return undefined;
	}
}

@Injectable()
@ApiFunctionSubscriber({ entity: SecondItemEntity })
class SecondItemSubscriber extends ApiFunctionSubscriberBase<SecondItemEntity> {
	public async onAfterCreate(): Promise<undefined> {
		await knob.afterSecondCreate?.();

		return undefined;
	}
}

@ApiController<MainItemEntity>({
	entity: MainItemEntity,
	name: "main",
	path: "main",
	routes: {
		[EApiRouteType.CREATE]: {},
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { generation: { isEnabled: false } },
		[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})
class MainItemController {
	@Inject(MainItemService)
	public readonly service!: MainItemService;
}

@Injectable()
class SourceHolder {
	public constructor(
		@InjectDataSource() public readonly main: DataSource,
		@InjectDataSource(SECOND) public readonly second: DataSource,
	) {}
}

const SQLITE: object = { database: ":memory:", type: "better-sqlite3" };

interface IMainDriver {
	name: string;
	start: () => Promise<{ container?: StartedTestContainer; options: object }>;
}

// The second DataSource is SQLite. On SQLite the main DataSource has one connection, so only the pooled main shows whether a nested call really joined the create.
const MAIN_DRIVERS: Array<IMainDriver> = [
	{ name: "better-sqlite3", start: async () => ({ options: SQLITE }) },
	{
		name: "postgres",
		start: async () => {
			const container = await new PostgreSqlContainer("postgres:17-alpine").start();

			return { container, options: { database: container.getDatabase(), host: container.getHost(), password: container.getPassword(), port: container.getPort(), type: "postgres", username: container.getUsername() } };
		},
	},
];

describe.each(MAIN_DRIVERS)("Generated CREATE on $name with a subscriber on another DataSource (E2E)", (driver: IMainDriver) => {
	let app: INestApplication;
	let container: StartedTestContainer | undefined;
	let main: DataSource;
	let mainItems: Repository<MainItemEntity>;
	let mainService: MainItemService;
	let second: DataSource;
	let secondItems: Repository<SecondItemEntity>;
	let secondService: SecondItemService;

	const post = async (name: string = "main"): Promise<{ json: () => { message?: string }; statusCode: number }> => await app.getHttpAdapter().getInstance().inject({ method: "POST", payload: { name }, url: "/main" });

	beforeAll(async () => {
		const started = await driver.start();
		container = started.container;

		@Module({
			controllers: [MainItemController],
			imports: [
				TypeOrmModule.forRoot({ ...started.options, dropSchema: true, entities: [MainItemEntity], logging: false, synchronize: true } as never),
				TypeOrmModule.forRoot({ ...SQLITE, dropSchema: true, entities: [SecondItemEntity], logging: false, name: SECOND, synchronize: true } as never),
				TypeOrmModule.forFeature([MainItemEntity]),
				TypeOrmModule.forFeature([SecondItemEntity], SECOND),
				ApiAuthorizationModule.forRoot({ principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) } } as never),
				ApiSubscriberModule,
			],
			providers: [MainItemService, MainItemSubscriber, MandatorySecondItemService, RequiredMainItemService, RequiredSecondItemService, SecondItemService, SecondItemSubscriber, SourceHolder],
		})
		class OtherSourceModule {}

		const moduleRef = await Test.createTestingModule({ imports: [OtherSourceModule] }).compile();

		app = moduleRef.createNestApplication(new FastifyAdapter());
		await app.init();
		await app.getHttpAdapter().getInstance().ready();
		main = moduleRef.get(DataSource);
		second = moduleRef.get(getDataSourceToken(SECOND));
		mainItems = main.getRepository(MainItemEntity);
		secondItems = second.getRepository(SecondItemEntity);
		mainService = moduleRef.get(MainItemService);
		secondService = moduleRef.get(SecondItemService);
	}, 180_000);

	afterAll(async () => {
		await app?.close();
		await container?.stop();
	}, 60_000);

	beforeEach(async () => {
		await mainItems.clear();
		await secondItems.clear();
		knob.afterCreate = undefined;
		knob.afterSecondCreate = undefined;
	});

	describe("a service of another DataSource", () => {
		it("reads on its own connection", async () => {
			const seeded: SecondItemEntity = await secondItems.save({ name: "seed" });
			let found: SecondItemEntity | undefined;
			knob.afterCreate = async () => {
				found = await secondService.get({ where: { id: seeded.id } });
			};

			expect((await post()).statusCode).toBe(201);
			expect(found?.name).toBe("seed");
			expect(await mainItems.count()).toBe(1);
		});

		it("writes on its own connection and does not roll back with the create", async () => {
			knob.afterCreate = async () => {
				await secondService.create({ name: "kept" });

				throw new Error("Failed after the other write");
			};

			expect((await post()).statusCode).toBe(500);
			expect(await mainItems.count()).toBe(0);
			expect(await secondItems.countBy({ name: "kept" })).toBe(1);
		});

		it("opens its own transaction for REQUIRED", async () => {
			const required: RequiredSecondItemService = app.get(RequiredSecondItemService);
			knob.afterCreate = async () => {
				await required.create({ name: "required" });
			};

			expect((await post()).statusCode).toBe(201);
			expect(await secondItems.countBy({ name: "required" })).toBe(1);
		});

		it("does not count the create's transaction for MANDATORY", async () => {
			const mandatory: MandatorySecondItemService = app.get(MandatorySecondItemService);
			knob.afterCreate = async () => {
				await mandatory.create({ name: "mandatory" });
			};

			expect((await post()).statusCode).toBe(500);
			expect(await mainItems.count()).toBe(0);
			expect(await secondItems.count()).toBe(0);
		});

		it("joins the create again when it calls back into the first DataSource", { timeout: 20_000 }, async () => {
			let nested: EntityManager | undefined;
			let outer: EntityManager | undefined;
			knob.afterSecondCreate = async () => {
				knob.afterCreate = async (context) => {
					nested = context.DATA.eventManager;
				};
				await mainService.create({ name: "nested" });
			};
			knob.afterCreate = async (context) => {
				outer = context.DATA.eventManager;
				await secondService.create({ name: "kept" });

				throw new Error("Failed after the nested writes");
			};

			expect((await post()).statusCode).toBe(500);
			expect(nested).toBe(outer);
			expect(await mainItems.count()).toBe(0);
			expect(await secondItems.countBy({ name: "kept" })).toBe(1);
		});

		it("joins the create again from a REQUIRED call after a hop without a transaction", { timeout: 20_000 }, async () => {
			const required: RequiredMainItemService = app.get(RequiredMainItemService);
			knob.afterSecondCreate = async () => {
				knob.afterCreate = undefined;
				await required.create({ name: "nested" });
			};
			knob.afterCreate = async () => {
				await secondService.create({ name: "kept" });

				throw new Error("Failed after the nested writes");
			};

			expect((await post()).statusCode).toBe(500);
			expect(await mainItems.count()).toBe(0);
			expect(await secondItems.countBy({ name: "kept" })).toBe(1);
		});

		it("joins the create again from a scope after a hop without a transaction", { timeout: 20_000 }, async () => {
			let outer: EntityManager | undefined;
			let scoped: EntityManager | undefined;
			knob.afterSecondCreate = async () => {
				await ApiFunctionTransactionScope.runWithDataSource(main, { name: "back" }, async (entityManager: EntityManager) => {
					scoped = entityManager;
					await entityManager.getRepository(MainItemEntity).save({ name: "scoped" });
				});
			};
			knob.afterCreate = async (context) => {
				knob.afterCreate = undefined;
				outer = context.DATA.eventManager;
				await secondService.create({ name: "kept" });

				throw new Error("Failed after the nested writes");
			};

			expect((await post()).statusCode).toBe(500);
			expect(scoped).toBe(outer);
			expect(await mainItems.count()).toBe(0);
		});

		it("leaves the transaction of the create in place afterwards", async () => {
			let manager: EntityManager | undefined;
			knob.afterCreate = async (context) => {
				knob.afterCreate = undefined;
				await secondItems.count();
				await secondService.create({ name: "kept" });
				manager = context.DATA.eventManager;
				await mainService.create({ name: "after" });
			};

			expect((await post()).statusCode).toBe(201);
			expect(manager?.dataSource).toBe(main);
			expect(await mainItems.countBy({ name: "after" })).toBe(1);
		});
	});

	describe("a transaction scope a subscriber opens", () => {
		it("runs on its own connection for another DataSource", async () => {
			let manager: EntityManager | undefined;
			knob.afterCreate = async () => {
				await ApiFunctionTransactionScope.runWithDataSource(second, { name: "other" }, async (entityManager: EntityManager) => {
					manager = entityManager;
					await entityManager.getRepository(SecondItemEntity).save({ name: "scoped" });
				});
			};

			expect((await post()).statusCode).toBe(201);
			expect(manager?.dataSource).toBe(second);
			expect(await secondItems.countBy({ name: "scoped" })).toBe(1);
		});

		it("does not roll back with the create on another DataSource", async () => {
			knob.afterCreate = async () => {
				await ApiFunctionTransactionScope.runWithDataSource(second, { name: "other" }, async (entityManager: EntityManager) => {
					await entityManager.getRepository(SecondItemEntity).save({ name: "scoped" });
				});

				throw new Error("Failed after the scope");
			};

			expect((await post()).statusCode).toBe(500);
			expect(await mainItems.count()).toBe(0);
			expect(await secondItems.countBy({ name: "scoped" })).toBe(1);
		});

		it("joins the create on the same DataSource", async () => {
			let joined: EntityManager | undefined;
			let scoped: EntityManager | undefined;
			knob.afterCreate = async (context) => {
				joined = context.DATA.eventManager;
				await ApiFunctionTransactionScope.runWithDataSource(main, { name: "same" }, async (entityManager: EntityManager) => {
					scoped = entityManager;
					await entityManager.getRepository(MainItemEntity).save({ name: "scoped" });
				});
			};

			expect((await post()).statusCode).toBe(201);
			expect(scoped).toBe(joined);
			expect(await mainItems.countBy({ name: "scoped" })).toBe(1);
		});

		it("rolls back with the create on the same DataSource", async () => {
			knob.afterCreate = async () => {
				await ApiFunctionTransactionScope.runWithDataSource(main, { name: "same" }, async (entityManager: EntityManager) => {
					await entityManager.getRepository(MainItemEntity).save({ name: "scoped" });
				});

				throw new Error("Failed after the scope");
			};

			expect((await post()).statusCode).toBe(500);
			expect(await mainItems.count()).toBe(0);
		});

		it("refuses an observation it cannot settle on the same DataSource", async () => {
			let message: string | undefined;
			knob.afterCreate = async () => {
				try {
					await ApiFunctionTransactionScope.runWithDataSource(main, { name: "same", observation: { onSettled: () => undefined, selectors: [] } }, async () => undefined);
				} catch (error) {
					message = (error as Error).message;
				}
			};

			expect((await post()).statusCode).toBe(201);
			expect(message).toContain("observation");
		});
	});
});
