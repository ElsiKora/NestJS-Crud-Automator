import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { StartedTestContainer } from "testcontainers";
import type { EntityManager, EntitySubscriberInterface, QueryRunner, TransactionCommitEvent, TransactionStartEvent } from "typeorm";

import { Inject, Injectable, Module } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { MySqlContainer } from "@testcontainers/mysql";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Column, DataSource, Entity, PrimaryGeneratedColumn, Repository } from "typeorm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import {
	ApiAuthorizationModule,
	ApiController,
	ApiControllerObservable,
	ApiFunctionSubscriber,
	ApiFunctionSubscriberBase,
	ApiFunctionTransactionPostCommitException,
	ApiFunctionTransactionScope,
	ApiPropertyDescribe,
	ApiRouteSubscriber,
	ApiRouteSubscriberBase,
	ApiService,
	ApiServiceBase,
	ApiServiceObservable,
	ApiSubscriberModule,
	AuthorizationResolveDefaultPrincipal,
	EApiFunctionTransactionFailureStage,
	EApiFunctionTransactionMode,
	EApiFunctionTransactionOutcome,
	EApiFunctionType,
	EApiPropertyDescribeType,
	EApiPropertyStringType,
	EApiRouteType,
	LoggerUtility,
} from "../../src/index";

const describeText: PropertyDecorator = ApiPropertyDescribe({ description: "text", exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING });

@Entity("after_commit_messages")
class MessageEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ type: EApiPropertyDescribeType.UUID } as never)
	public id!: string;

	@Column({ type: "varchar" })
	@describeText
	public text!: string;
}

interface IPublished {
	id: string;
	isCommitted: boolean;
	text: string;
}

// What the callbacks published, and whether each published row was visible outside its transaction.
const probe: { failText?: string; published: Array<IPublished>; read?: (id: string) => Promise<boolean>; routeRefusals: Array<string> } = { published: [], routeRefusals: [] };

@Injectable()
@ApiServiceObservable()
@ApiService({ entity: MessageEntity, functions: { [EApiFunctionType.CREATE]: { transaction: { mode: EApiFunctionTransactionMode.REQUIRED } } } })
class MessageService extends ApiServiceBase<MessageEntity> {
	@InjectRepository(MessageEntity)
	public readonly repository!: Repository<MessageEntity>;
}

// The chat send of Project Core: the function subscriber publishes the id of the row the transaction inserted once it is committed.
@Injectable()
@ApiFunctionSubscriber({ entity: MessageEntity })
class MessagePublicationSubscriber extends ApiFunctionSubscriberBase<MessageEntity> {
	public async onAfterCreate(context: { result?: MessageEntity }): Promise<undefined> {
		const message: MessageEntity | undefined = context.result;

		if (!message) return undefined;

		ApiFunctionTransactionScope.onAfterCommit(async () => {
			if (message.text === probe.failText) {
				throw new Error(`publication of ${message.text} failed`);
			}

			probe.published.push({ id: message.id, isCommitted: (await probe.read?.(message.id)) ?? false, text: message.text });
		});

		return undefined;
	}
}

// Route subscribers of a generated route run outside the transaction the route owns: before it opens and after it committed.
@Injectable()
@ApiRouteSubscriber({ entity: MessageEntity })
class MessageRouteSubscriber extends ApiRouteSubscriberBase<MessageEntity> {
	public async onAfterCreate(): Promise<undefined> {
		MessageRouteSubscriber.register("after");

		return undefined;
	}

	public async onBeforeCreate(): Promise<undefined> {
		MessageRouteSubscriber.register("before");

		return undefined;
	}

	private static register(stage: string): void {
		try {
			ApiFunctionTransactionScope.onAfterCommit(() => undefined);
			probe.routeRefusals.push(`${stage}: registered`);
		} catch (error) {
			probe.routeRefusals.push(`${stage}: ${(error as Error).message}`);
		}
	}
}

@ApiControllerObservable()
@ApiController<MessageEntity>({
	entity: MessageEntity,
	name: "messages",
	path: "messages",
	routes: {
		[EApiRouteType.CREATE]: {},
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { generation: { isEnabled: false } },
		[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})
class MessageController {
	@Inject(MessageService)
	public readonly service!: MessageService;
}

// A TypeORM transaction subscriber that throws once when armed, after TypeORM already changed the transaction depth.
class ThrowingTransactionSubscriber implements EntitySubscriberInterface {
	public throwAfterCommit: boolean = false;

	public throwAfterStart: boolean = false;

	public afterTransactionCommit(_event: TransactionCommitEvent): void {
		if (!this.throwAfterCommit) return;
		this.throwAfterCommit = false;

		throw new Error("transaction subscriber failed after commit");
	}

	public afterTransactionStart(_event: TransactionStartEvent): void {
		if (!this.throwAfterStart) return;
		this.throwAfterStart = false;

		throw new Error("transaction subscriber failed after start");
	}
}

interface IDriver {
	name: string;
	start: () => Promise<{ container?: StartedTestContainer; options: object }>;
}

const DRIVERS: Array<IDriver> = [
	{ name: "better-sqlite3", start: async () => ({ options: { database: ":memory:", type: "better-sqlite3" } }) },
	{
		name: "postgres",
		start: async () => {
			const container = await new PostgreSqlContainer("postgres:17-alpine").start();

			return { container, options: { database: container.getDatabase(), host: container.getHost(), password: container.getPassword(), port: container.getPort(), type: "postgres", username: container.getUsername() } };
		},
	},
	{
		name: "mysql",
		start: async () => {
			const container = await new MySqlContainer("mysql:8.4").start();

			return { container, options: { database: container.getDatabase(), host: container.getHost(), password: container.getUserPassword(), port: container.getPort(), type: "mysql", username: container.getUsername() } };
		},
	},
];

describe.each(DRIVERS)("After-commit callbacks of an Automator transaction on $name (E2E)", (driver: IDriver) => {
	let app: INestApplication;
	let container: StartedTestContainer | undefined;
	let dataSource: DataSource;
	let messages: Repository<MessageEntity>;
	let service: MessageService;
	const transactionSubscriber: ThrowingTransactionSubscriber = new ThrowingTransactionSubscriber();

	const sent = (): Array<string> => probe.published.map((entry: IPublished) => entry.text);

	const send = async (manager: EntityManager, text: string): Promise<MessageEntity> => {
		const message: MessageEntity = await service.create({ text });

		// The row is written through the manager of the transaction, so a rollback of a savepoint undoes it.
		expect(await manager.getRepository(MessageEntity).existsBy({ id: message.id })).toBe(true);

		return message;
	};

	beforeAll(async () => {
		const started = await driver.start();
		container = started.container;

		@Module({
			controllers: [MessageController],
			imports: [TypeOrmModule.forRoot({ ...started.options, dropSchema: true, entities: [MessageEntity], logging: false, synchronize: true } as never), TypeOrmModule.forFeature([MessageEntity]), ApiAuthorizationModule.forRoot({ principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) } } as never), ApiSubscriberModule],
			providers: [MessagePublicationSubscriber, MessageRouteSubscriber, MessageService],
		})
		class AfterCommitModule {}

		const moduleRef = await Test.createTestingModule({ imports: [AfterCommitModule] }).compile();

		app = moduleRef.createNestApplication(new FastifyAdapter());
		await app.init();
		await app.getHttpAdapter().getInstance().ready();
		dataSource = moduleRef.get(DataSource);
		dataSource.subscribers.push(transactionSubscriber);
		messages = dataSource.getRepository(MessageEntity);
		service = moduleRef.get(MessageService);
	}, 180_000);

	afterAll(async () => {
		await app?.close();
		await container?.stop();
	}, 60_000);

	beforeEach(async () => {
		await messages.clear();
		probe.failText = undefined;
		probe.published = [];
		probe.routeRefusals = [];
		// Outside every transaction: a row is visible here only once its transaction committed.
		probe.read = async (id: string): Promise<boolean> => await messages.existsBy({ id });
	});

	afterEach(() => {
		vi.restoreAllMocks();
		transactionSubscriber.throwAfterCommit = false;
		transactionSubscriber.throwAfterStart = false;
	});

	it("publishes the id of the row a route-owned create inserted, after its commit", async () => {
		const response = await app
			.getHttpAdapter()
			.getInstance()
			.inject({ method: "POST", payload: { text: "hello" }, url: "/messages" });

		expect(response.statusCode).toBe(201);
		expect(probe.published).toEqual([{ id: (response.json() as MessageEntity).id, isCommitted: true, text: "hello" }]);
	});

	it("refuses a callback in the route subscribers of a generated route, which run outside the transaction the route owns", async () => {
		const response = await app
			.getHttpAdapter()
			.getInstance()
			.inject({ method: "POST", payload: { text: "routed" }, url: "/messages" });

		expect(response.statusCode).toBe(201);
		expect(probe.routeRefusals).toEqual(["before: [NestJS-Crud-Automator] ApiFunctionTransactionScope.onAfterCommit requires an active Automator transaction", "after: [NestJS-Crud-Automator] ApiFunctionTransactionScope.onAfterCommit requires an active Automator transaction"]);
		expect(sent()).toEqual(["routed"]);
	});

	it("lets a callback open a new transaction once the first one has committed", async () => {
		let followUpId: string | undefined;

		await ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "chat send" }, async (manager: EntityManager) => {
			const message: MessageEntity = await send(manager, "first");

			ApiFunctionTransactionScope.onAfterCommit(async () => {
				const followUp: MessageEntity = await ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "follow-up" }, async (followUpManager: EntityManager) => await send(followUpManager, `reply to ${message.id}`));

				followUpId = followUp.id;
			});
		});

		expect(followUpId).toBeDefined();
		expect(await messages.findOneBy({ id: followUpId })).toMatchObject({ text: expect.stringMatching(/^reply to /u) });
		// The follow-up transaction committed on its own and released its own callback.
		expect(sent()).toEqual(["first", expect.stringMatching(/^reply to /u)]);
	});

	it("publishes after the commit of a named scope in registration order", async () => {
		const ids: Array<string> = await ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "chat send" }, async (manager: EntityManager) => {
			const first: MessageEntity = await send(manager, "first");
			ApiFunctionTransactionScope.onAfterCommit(() => {
				probe.published.push({ id: "-", isCommitted: true, text: "scope" });
			});
			const second: MessageEntity = await send(manager, "second");

			expect(probe.published).toEqual([]);

			return [first.id, second.id];
		});

		expect(sent()).toEqual(["first", "scope", "second"]);
		expect(probe.published.filter((entry: IPublished) => entry.text !== "scope").map((entry: IPublished) => entry.id)).toEqual(ids);
		expect(probe.published.every((entry: IPublished) => entry.isCommitted)).toBe(true);
	});

	it("drops the callbacks when the transaction rolls back", async () => {
		const error: Error = new Error("send failed");

		await expect(
			ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "chat send" }, async (manager: EntityManager) => {
				await send(manager, "rolled back");

				throw error;
			}),
		).rejects.toBe(error);

		expect(probe.published).toEqual([]);
		expect(await messages.count()).toBe(0);
	});

	it("drops the callbacks of a nested savepoint that rolls back and keeps those of the transaction", async () => {
		await ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "chat send" }, async (manager: EntityManager) => {
			await send(manager, "outer");
			await expect(
				manager.transaction(async (nested: EntityManager) => {
					await send(nested, "savepoint");

					throw new Error("savepoint failed");
				}),
			).rejects.toThrow("savepoint failed");
			await send(manager, "after savepoint");
		});

		expect(sent()).toEqual(["outer", "after savepoint"]);
		expect((await messages.find()).map((message: MessageEntity) => message.text).sort()).toEqual(["after savepoint", "outer"]);
	});

	it("joins the callbacks of a released nested savepoint to the transaction, and drops those of a savepoint inside it that rolls back", async () => {
		await ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "chat send" }, async (manager: EntityManager) => {
			await manager.transaction(async (nested: EntityManager) => {
				await send(nested, "released");
				await nested
					.transaction(async (inner: EntityManager) => {
						await send(inner, "inner rolled back");

						throw new Error("inner failed");
					})
					.catch(() => undefined);
			});

			expect(probe.published).toEqual([]);
			await send(manager, "outer");
		});

		expect(sent()).toEqual(["released", "outer"]);
		expect(probe.published.every((entry: IPublished) => entry.isCommitted)).toBe(true);
	});

	it("follows the savepoint TypeORM changed when a TypeORM transaction subscriber throws", async () => {
		await ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "chat send" }, async (manager: EntityManager) => {
			const queryRunner: QueryRunner = manager.queryRunner as QueryRunner;

			// The savepoint opened before the subscriber threw, so the rollback EntityManager.transaction runs then undoes it.
			transactionSubscriber.throwAfterStart = true;
			await expect(manager.transaction(async () => undefined)).rejects.toThrow("transaction subscriber failed after start");

			// The savepoint was released before the subscriber threw, so its callback belongs to the transaction.
			await queryRunner.startTransaction();
			await send(manager, "released before the subscriber threw");
			transactionSubscriber.throwAfterCommit = true;
			await expect(queryRunner.commitTransaction()).rejects.toThrow("transaction subscriber failed after commit");
			await send(manager, "outer");
		});

		expect(sent()).toEqual(["released before the subscriber threw", "outer"]);
		expect(await messages.count()).toBe(2);
	});

	it("keeps the commit when a callback fails, runs the later callbacks, logs bounded evidence and reports a committed post-commit failure", async () => {
		const errorLog = vi.spyOn(LoggerUtility.prototype, "error").mockImplementation((): void => undefined);
		probe.failText = "fails";

		const thrown: unknown = await ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "chat send" }, async (manager: EntityManager) => {
			await send(manager, "fails");
			await send(manager, "later");
		}).catch((error: unknown) => error);

		expect(thrown).toBeInstanceOf(ApiFunctionTransactionPostCommitException);
		expect(thrown).toMatchObject({ hookFailures: [{ stage: EApiFunctionTransactionFailureStage.AFTER_COMMIT, subscriberName: undefined }], outcome: EApiFunctionTransactionOutcome.COMMITTED });
		expect(((thrown as Error).cause as Error).message).toBe("publication of fails failed");
		expect(sent()).toEqual(["later"]);
		expect(await messages.count()).toBe(2);
		expect(errorLog.mock.calls.map((call: Array<unknown>) => call[0])).toEqual([expect.stringMatching(/^After-commit callback 1 of transaction [\da-f-]+ failed: errorType=Error$/u)]);
	});

	it("refuses a callback outside an Automator transaction and puts the query runner's transaction methods back", async () => {
		expect(() => ApiFunctionTransactionScope.onAfterCommit(() => undefined)).toThrow("ApiFunctionTransactionScope.onAfterCommit requires an active Automator transaction");

		await ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "chat send" }, async (manager: EntityManager) => {
			expect(Object.hasOwn(manager.queryRunner as QueryRunner, "startTransaction")).toBe(true);
			await send(manager, "first");
		});
		await ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "chat send" }, async (manager: EntityManager) => {
			await send(manager, "second");
		});

		const queryRunner: QueryRunner = dataSource.createQueryRunner();

		try {
			expect(Object.hasOwn(queryRunner, "startTransaction")).toBe(false);
			expect(Object.hasOwn(queryRunner, "commitTransaction")).toBe(false);
			expect(Object.hasOwn(queryRunner, "rollbackTransaction")).toBe(false);
		} finally {
			if (driver.name !== "better-sqlite3") await queryRunner.release();
		}

		expect(sent()).toEqual(["first", "second"]);
	});
});
