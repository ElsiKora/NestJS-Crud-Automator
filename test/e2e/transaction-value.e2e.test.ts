import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { StartedTestContainer } from "testcontainers";
import type { EntityManager } from "typeorm";

import { AsyncResource } from "node:async_hooks";

import { Inject, Injectable, Module } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { getDataSourceToken, InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Column, DataSource, Entity, PrimaryGeneratedColumn, Repository } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
	ApiAuthorizationModule,
	ApiController,
	ApiControllerObservable,
	ApiFunctionCustom,
	ApiFunctionStep,
	ApiFunctionSubscriber,
	ApiFunctionSubscriberBase,
	ApiFunctionTransactionScope,
	ApiPropertyDescribe,
	ApiRouteSubscriber,
	ApiRouteSubscriberBase,
	ApiService,
	ApiServiceBase,
	ApiServiceObservable,
	ApiSubscriberModule,
	AuthorizationResolveDefaultPrincipal,
	EApiFunctionTransactionMode,
	EApiFunctionType,
	EApiPropertyDescribeType,
	EApiPropertyStringType,
	EApiRouteType,
} from "../../src/index";

const SECOND: string = "second";

// The authority scope of one command, the value Project Core binds to its transaction.
const AUTHORITY: unique symbol = Symbol("authority");

const describeText: PropertyDecorator = ApiPropertyDescribe({ description: "text", exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING });

@Entity("transaction_value_items")
class ValueItemEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ type: EApiPropertyDescribeType.UUID } as never)
	public id!: string;

	@Column({ type: "varchar" })
	@describeText
	public name!: string;
}

@Entity("transaction_value_other_items")
class ValueOtherEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ type: "varchar" })
	public name!: string;
}

interface ISeen {
	at: string;
	manager?: EntityManager;
	value: unknown;
}

// What each entry path saw, and what the current test binds in the generated create.
const probe: { bindInCreate?: string; seen: Array<ISeen> } = { seen: [] };

const see = (at: string, manager?: EntityManager): void => {
	probe.seen.push({ at, manager, value: ApiFunctionTransactionScope.getValue(AUTHORITY) });
};

const valuesAt = (at: string): Array<unknown> => probe.seen.filter((entry: ISeen) => entry.at === at).map((entry: ISeen) => entry.value);

@Injectable()
@ApiServiceObservable()
@ApiService({ entity: ValueItemEntity })
class ValueItemService extends ApiServiceBase<ValueItemEntity> {
	@InjectRepository(ValueItemEntity)
	public readonly repository!: Repository<ValueItemEntity>;

	@ApiFunctionCustom<ValueItemEntity>({ action: "grant", entity: ValueItemEntity, transaction: { mode: EApiFunctionTransactionMode.REQUIRED } })
	public async grant(name: string): Promise<ValueItemEntity> {
		const context = this.getApiFunctionContext<ValueItemEntity>();
		see("custom function", context.repository.manager);
		await this.check();

		return await context.operations.create({ name });
	}

	@ApiFunctionStep<ValueItemEntity>({ entity: ValueItemEntity, transaction: { mode: EApiFunctionTransactionMode.MANDATORY } })
	private async check(): Promise<void> {
		see("mandatory step", this.getApiFunctionStepContext<ValueItemEntity>().repository.manager);
	}
}

@Injectable()
@ApiServiceObservable()
@ApiService({ entity: ValueOtherEntity, functions: { [EApiFunctionType.CREATE]: { transaction: { mode: EApiFunctionTransactionMode.REQUIRED } } } })
class ValueOtherService extends ApiServiceBase<ValueOtherEntity> {
	@InjectRepository(ValueOtherEntity, SECOND)
	public readonly repository!: Repository<ValueOtherEntity>;
}

@Injectable()
@ApiFunctionSubscriber({ entity: ValueItemEntity })
class ValueItemFunctionSubscriber extends ApiFunctionSubscriberBase<ValueItemEntity> {
	public async onAfterCommit(): Promise<void> {
		see("after commit");
	}

	public async onAfterCreate(context: { DATA: { eventManager?: EntityManager } }): Promise<undefined> {
		see("function subscriber", context.DATA.eventManager);

		return undefined;
	}

	public async onAfterRollback(): Promise<void> {
		see("after rollback");
	}

	public async onBeforeCreate(): Promise<undefined> {
		if (probe.bindInCreate !== undefined) {
			ApiFunctionTransactionScope.setValue(AUTHORITY, probe.bindInCreate);
		}

		return undefined;
	}
}

@Injectable()
@ApiFunctionSubscriber({ entity: ValueOtherEntity })
class ValueOtherFunctionSubscriber extends ApiFunctionSubscriberBase<ValueOtherEntity> {
	public async onAfterCreate(context: { DATA: { eventManager?: EntityManager } }): Promise<undefined> {
		see("other subscriber", context.DATA.eventManager);

		return undefined;
	}
}

@Injectable()
@ApiRouteSubscriber({ entity: ValueItemEntity })
class ValueItemRouteSubscriber extends ApiRouteSubscriberBase<ValueItemEntity> {
	public async onAfterCreate(): Promise<undefined> {
		see("route subscriber");

		return undefined;
	}
}

@ApiControllerObservable()
@ApiController<ValueItemEntity>({
	entity: ValueItemEntity,
	name: "items",
	path: "items",
	routes: {
		[EApiRouteType.CREATE]: {},
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { generation: { isEnabled: false } },
		[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})
class ValueItemController {
	@Inject(ValueItemService)
	public readonly service!: ValueItemService;
}

const SQLITE: object = { database: ":memory:", type: "better-sqlite3" };

interface IMainDriver {
	name: string;
	start: () => Promise<{ container?: StartedTestContainer; options: object }>;
}

// The second DataSource is SQLite in both runs; only the main one changes.
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

describe.each(MAIN_DRIVERS)("Values bound to an Automator transaction on $name (E2E)", (driver: IMainDriver) => {
	let app: INestApplication;
	let container: StartedTestContainer | undefined;
	let items: Repository<ValueItemEntity>;
	let itemService: ValueItemService;
	let main: DataSource;
	let otherService: ValueOtherService;
	let second: DataSource;

	beforeAll(async () => {
		const started = await driver.start();
		container = started.container;

		@Module({
			controllers: [ValueItemController],
			imports: [
				TypeOrmModule.forRoot({ ...started.options, dropSchema: true, entities: [ValueItemEntity], logging: false, synchronize: true } as never),
				TypeOrmModule.forRoot({ ...SQLITE, dropSchema: true, entities: [ValueOtherEntity], logging: false, name: SECOND, synchronize: true } as never),
				TypeOrmModule.forFeature([ValueItemEntity]),
				TypeOrmModule.forFeature([ValueOtherEntity], SECOND),
				ApiAuthorizationModule.forRoot({ principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) } } as never),
				ApiSubscriberModule,
			],
			providers: [ValueItemFunctionSubscriber, ValueItemRouteSubscriber, ValueItemService, ValueOtherFunctionSubscriber, ValueOtherService],
		})
		class TransactionValueModule {}

		const moduleRef = await Test.createTestingModule({ imports: [TransactionValueModule] }).compile();

		app = moduleRef.createNestApplication(new FastifyAdapter());
		await app.init();
		await app.getHttpAdapter().getInstance().ready();
		main = moduleRef.get(DataSource);
		second = moduleRef.get(getDataSourceToken(SECOND));
		items = main.getRepository(ValueItemEntity);
		itemService = moduleRef.get(ValueItemService);
		otherService = moduleRef.get(ValueOtherService);
	}, 180_000);

	afterAll(async () => {
		await app?.close();
		await container?.stop();
	}, 60_000);

	beforeEach(async () => {
		await items.clear();
		await second.getRepository(ValueOtherEntity).clear();
		probe.bindInCreate = undefined;
		probe.seen = [];
	});

	it("shows one value to the scope manager, the decorated operation and its subscribers of one transaction", async () => {
		let owner: EntityManager | undefined;

		await ApiFunctionTransactionScope.runWithDataSource(main, { name: "command" }, async (entityManager: EntityManager) => {
			owner = entityManager;
			ApiFunctionTransactionScope.setValue(AUTHORITY, "authority");
			await itemService.grant("granted");
			await ApiFunctionTransactionScope.runWithDataSource(main, { name: "joined" }, async (joined: EntityManager) => {
				see("joined scope", joined);
			});
			see("scope", entityManager);
		});

		const inside: Array<ISeen> = probe.seen.filter((entry: ISeen) => entry.at !== "after commit");

		expect(inside.map((entry: ISeen) => entry.at)).toEqual(["custom function", "mandatory step", "function subscriber", "joined scope", "scope"]);
		expect(inside.every((entry: ISeen) => entry.value === "authority" && entry.manager === owner)).toBe(true);
		expect(valuesAt("after commit")).toEqual([undefined]);
		expect(ApiFunctionTransactionScope.getValue(AUTHORITY)).toBeUndefined();
		expect(await items.countBy({ name: "granted" })).toBe(1);
	});

	it("keeps a value a function subscriber binds in a route-owned create to that transaction", async () => {
		probe.bindInCreate = "route";

		const response = await app
			.getHttpAdapter()
			.getInstance()
			.inject({ method: "POST", payload: { name: "posted" }, url: "/items" });

		expect(response.statusCode).toBe(201);
		expect(probe.seen.find((entry: ISeen) => entry.at === "function subscriber")?.manager).toBeDefined();
		expect(valuesAt("function subscriber")).toEqual(["route"]);
		expect(valuesAt("after commit")).toEqual([undefined]);
		expect(valuesAt("route subscriber")).toEqual([undefined]);
	});

	it("gives a transaction of another DataSource opened inside the command values of its own", async () => {
		await ApiFunctionTransactionScope.runWithDataSource(main, { name: "command" }, async () => {
			ApiFunctionTransactionScope.setValue(AUTHORITY, "authority");
			await otherService.create({ name: "required" });
			await ApiFunctionTransactionScope.runWithDataSource(second, { name: "other" }, async () => {
				see("other scope");
				ApiFunctionTransactionScope.setValue(AUTHORITY, "other");
				await itemService.grant("back");
				see("other scope");
			});
			see("scope");
		});

		expect(valuesAt("other subscriber")).toEqual([undefined]);
		expect(valuesAt("other scope")).toEqual([undefined, "other"]);
		expect(valuesAt("custom function")).toEqual(["authority"]);
		expect(valuesAt("scope")).toEqual(["authority"]);
	});

	it("gives a later sibling transaction none of the values of the one before", async () => {
		await ApiFunctionTransactionScope.runWithDataSource(main, { name: "first" }, async () => {
			ApiFunctionTransactionScope.setValue(AUTHORITY, "first");
		});
		await ApiFunctionTransactionScope.runWithDataSource(main, { name: "second" }, async () => {
			see("second");
		});

		expect(valuesAt("second")).toEqual([undefined]);
	});

	it("gives two parallel transactions their own value under the same key", { timeout: 20_000 }, async () => {
		const run = async (name: string): Promise<unknown> =>
			await ApiFunctionTransactionScope.runWithDataSource(main, { name }, async () => {
				ApiFunctionTransactionScope.setValue(AUTHORITY, name);
				await itemService.grant(name);
				await new Promise<void>((resolve: () => void) => setTimeout(resolve, 20));

				return ApiFunctionTransactionScope.getValue(AUTHORITY);
			});

		await expect(Promise.all([run("first"), run("second")])).resolves.toEqual(["first", "second"]);
		expect([...valuesAt("custom function")].sort()).toEqual(["first", "second"]);
		expect(await items.count()).toBe(2);
	});

	it("releases the values when the transaction rolls back", async () => {
		let read: (() => unknown) | undefined;
		const error: Error = new Error("command failed");

		await expect(
			ApiFunctionTransactionScope.runWithDataSource(main, { name: "command" }, async () => {
				ApiFunctionTransactionScope.setValue(AUTHORITY, "authority");
				read = AsyncResource.bind(() => ApiFunctionTransactionScope.getValue(AUTHORITY));
				await itemService.grant("rolled back");

				throw error;
			}),
		).rejects.toBe(error);

		expect(valuesAt("function subscriber")).toEqual(["authority"]);
		expect(valuesAt("after rollback")).toEqual([undefined]);
		expect(read?.()).toBeUndefined();
		expect(await items.count()).toBe(0);
	});

	it("puts back the previous value after runWithValue", async () => {
		await ApiFunctionTransactionScope.runWithDataSource(main, { name: "command" }, async () => {
			ApiFunctionTransactionScope.setValue(AUTHORITY, "authority");
			await ApiFunctionTransactionScope.runWithValue(AUTHORITY, "narrowed", async () => await itemService.grant("narrowed"));
			see("scope");
		});

		expect(valuesAt("function subscriber")).toEqual(["narrowed"]);
		expect(valuesAt("scope")).toEqual(["authority"]);
	});

	it("refuses to bind a value outside an Automator transaction", async () => {
		expect(() => ApiFunctionTransactionScope.setValue(AUTHORITY, "authority")).toThrow("ApiFunctionTransactionScope.setValue requires an active Automator transaction");
		await itemService.create({ name: "no transaction" });
		expect(valuesAt("function subscriber")).toEqual([undefined]);
	});
});
