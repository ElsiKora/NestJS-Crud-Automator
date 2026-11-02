import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { EntityManager, EntitySubscriberInterface, InsertEvent } from "typeorm";

import { Injectable, Module } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Column, DataSource, Entity, EventSubscriber, JoinColumn, ManyToOne, PrimaryColumn, Repository } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiFunctionTransactionScope, ApiPropertyDescribe, ApiService, ApiServiceBase, ApiSubscriberModule, EApiPropertyDescribeType, EApiPropertyStringType } from "../../src/index";

const ROUNDS: number = 10;

const describeString: PropertyDecorator = ApiPropertyDescribe({ description: "text", exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING });

@Entity("guard_isolation_owners")
class GuardIsolationOwnerEntity {
	@PrimaryColumn({ length: 64, type: "varchar" })
	@describeString
	public id!: string;

	@Column({ length: 64, type: "varchar" })
	@describeString
	public name!: string;
}

@Entity("guard_isolation_items")
class GuardIsolationItemEntity {
	@PrimaryColumn({ length: 64, type: "varchar" })
	@describeString
	public id!: string;

	@Column({ length: 64, type: "varchar" })
	@describeString
	public name!: string;

	@JoinColumn({ name: "ownerId" })
	@ManyToOne(() => GuardIsolationOwnerEntity, { cascade: true, nullable: true })
	@ApiPropertyDescribe({ description: "owner", type: EApiPropertyDescribeType.RELATION })
	public owner?: GuardIsolationOwnerEntity | null;
}

@Entity("guard_isolation_counters")
class GuardIsolationCounterEntity {
	@PrimaryColumn({ length: 64, type: "varchar" })
	public id!: string;

	@Column({ length: 64, type: "varchar" })
	public label!: string;

	@Column({ length: 64, type: "varchar" })
	public note!: string;

	@Column({ default: 0, type: "integer" })
	public value!: number;
}

// The event in which the application subscriber writes the counter row, or none.
let counterWritePhase: "afterInsert" | "beforeInsert" | undefined;

/** An application subscriber that writes another existing row, a counter, while a create inserts an item. */
@EventSubscriber()
class GuardIsolationCounterSubscriber implements EntitySubscriberInterface<GuardIsolationItemEntity> {
	public async afterInsert(event: InsertEvent<GuardIsolationItemEntity>): Promise<void> {
		await this.write(event, "afterInsert");
	}

	public async beforeInsert(event: InsertEvent<GuardIsolationItemEntity>): Promise<void> {
		await this.write(event, "beforeInsert");
	}

	public listenTo(): typeof GuardIsolationItemEntity {
		return GuardIsolationItemEntity;
	}

	private async write(event: InsertEvent<GuardIsolationItemEntity>, phase: "afterInsert" | "beforeInsert"): Promise<void> {
		if (counterWritePhase !== phase) {
			return;
		}

		const counter: GuardIsolationCounterEntity = await event.manager.findOneByOrFail(GuardIsolationCounterEntity, { id: "counter-1" });
		counter.label = `${phase} saved`;
		await event.manager.save(counter);
		await event.manager.update(GuardIsolationCounterEntity, { id: "counter-1" }, { note: `${phase} updated` });
		await event.manager.increment(GuardIsolationCounterEntity, { id: "counter-1" }, "value", 1);
	}
}

@Injectable()
@ApiService({ entity: GuardIsolationItemEntity })
class GuardIsolationItemService extends ApiServiceBase<GuardIsolationItemEntity> {
	@InjectRepository(GuardIsolationItemEntity)
	public readonly repository!: Repository<GuardIsolationItemEntity>;
}

interface IDriver {
	name: string;
	start: () => Promise<{ container?: StartedPostgreSqlContainer; options: object }>;
}

const DRIVERS: Array<IDriver> = [
	// better-sqlite3 hands every save the same query runner, so a marker on it would reach other saves.
	{ name: "better-sqlite3", start: async () => ({ options: { database: ":memory:", type: "better-sqlite3" } }) },
	{
		name: "postgres",
		start: async () => {
			const container: StartedPostgreSqlContainer = await new PostgreSqlContainer("postgres:17-alpine").start();

			return { container, options: { type: "postgres", url: container.getConnectionUri() } };
		},
	},
];

describe.each(DRIVERS)("A create guards only its own save on $name (E2E)", (driver: IDriver) => {
	let app: INestApplication;
	let container: StartedPostgreSqlContainer | undefined;
	let dataSource: DataSource;
	let items: Repository<GuardIsolationItemEntity>;
	let owners: Repository<GuardIsolationOwnerEntity>;
	let counters: Repository<GuardIsolationCounterEntity>;
	let service: GuardIsolationItemService;

	const readRows = async (): Promise<unknown> => ({
		items: await items.find({ order: { id: "ASC" }, relations: { owner: true } }),
		owners: await owners.find({ order: { id: "ASC" } }),
	});

	beforeAll(async () => {
		const started = await driver.start();
		container = started.container;

		@Module({
			imports: [TypeOrmModule.forRoot({ ...started.options, dropSchema: true, entities: [GuardIsolationCounterEntity, GuardIsolationItemEntity, GuardIsolationOwnerEntity], logging: false, subscribers: [GuardIsolationCounterSubscriber], synchronize: true } as never), TypeOrmModule.forFeature([GuardIsolationItemEntity]), ApiSubscriberModule],
			providers: [GuardIsolationItemService],
		})
		class GuardIsolationModule {}

		const moduleRef = await Test.createTestingModule({ imports: [GuardIsolationModule] }).compile();
		app = moduleRef.createNestApplication();
		await app.init();
		dataSource = moduleRef.get(DataSource);
		items = dataSource.getRepository(GuardIsolationItemEntity);
		owners = dataSource.getRepository(GuardIsolationOwnerEntity);
		service = moduleRef.get(GuardIsolationItemService);
		counters = dataSource.getRepository(GuardIsolationCounterEntity);
	}, 300_000);

	afterAll(async () => {
		await app?.close();
		await container?.stop();
	}, 60_000);

	beforeEach(async () => {
		counterWritePhase = undefined;
		await counters.save({ id: "counter-1", label: "start", note: "start", value: 0 });
		await items.createQueryBuilder().delete().execute();
		await owners.createQueryBuilder().delete().execute();
		await owners.save({ id: "owner-1", name: "Owner" });
		await items.save({ id: "item-1", name: "Item", owner: { id: "owner-1" } });
	});

	const otherSaves = (): Array<() => Promise<unknown>> => [async (): Promise<unknown> => await items.save({ id: "item-1", name: "Item changed" }), async (): Promise<unknown> => await owners.save({ id: "owner-1", name: "Owner changed" })];

	const expectOtherSavesWritten = async (): Promise<void> => {
		expect(await readRows()).toEqual({
			items: [
				{ id: "item-1", name: "Item changed", owner: { id: "owner-1", name: "Owner changed" } },
				{ id: "item-new", name: "New", owner: { id: "owner-1", name: "Owner changed" } },
			],
			owners: [{ id: "owner-1", name: "Owner changed" }],
		});
	};

	it.each([
		["the create first", true],
		["the other saves first", false],
	])("leaves updates of other saves that run next to a create alone, with %s", async (_name: string, isCreateFirst: boolean) => {
		for (let round: number = 0; round < ROUNDS; round++) {
			await items.createQueryBuilder().delete().where("id = :id", { id: "item-new" }).execute();
			await owners.save({ id: "owner-1", name: "Owner" });
			await items.save({ id: "item-1", name: "Item" });

			const create = async (): Promise<unknown> => await service.create({ id: "item-new", name: "New", owner: { id: "owner-1" } } as never);
			const calls: Array<() => Promise<unknown>> = isCreateFirst ? [create, ...otherSaves()] : [...otherSaves(), create];
			const results: Array<PromiseSettledResult<unknown>> = await Promise.allSettled(calls.map(async (call: () => Promise<unknown>): Promise<unknown> => await call()));

			expect(results.map((result: PromiseSettledResult<unknown>): string => result.status)).toEqual(["fulfilled", "fulfilled", "fulfilled"]);
			await expectOtherSavesWritten();
		}
	});

	it.each([
		["the create first", true],
		["the other save first", false],
	])("leaves an update in the same transaction alone, with %s", async (_name: string, isCreateFirst: boolean) => {
		await ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "guard-isolation" }, async (entityManager: EntityManager): Promise<void> => {
			const create = async (): Promise<unknown> => await service.create({ id: "item-new", name: "New", owner: { id: "owner-1" } } as never);
			const save = async (): Promise<unknown> => await entityManager.save(GuardIsolationOwnerEntity, { id: "owner-1", name: "Owner changed" });

			await Promise.all(isCreateFirst ? [create(), save()] : [save(), create()]);
			await entityManager.save(GuardIsolationItemEntity, { id: "item-1", name: "Item changed" });
		});

		await expectOtherSavesWritten();
	});

	it("still refuses its own overwrite while other saves run next to it", async () => {
		const results: Array<PromiseSettledResult<unknown>> = await Promise.allSettled([service.create({ id: "item-1", name: "Hijacked" } as never), owners.save({ id: "owner-1", name: "Owner changed" })]);

		expect(results[0]).toMatchObject({ reason: { response: { message: "GUARDISOLATIONITEMENTITY_DUPLICATE_KEY", statusCode: 409 } }, status: "rejected" });
		expect(results[1]?.status).toBe("fulfilled");
		expect(await readRows()).toEqual({ items: [{ id: "item-1", name: "Item", owner: { id: "owner-1", name: "Owner changed" } }], owners: [{ id: "owner-1", name: "Owner changed" }] });
	});

	// A save, update or increment that an application subscriber starts during the create is a save of its own, so the guard leaves it alone.
	it.each([["beforeInsert"], ["afterInsert"]] as const)("lets an application subscriber write another existing row in %s of the created row", async (phase: "afterInsert" | "beforeInsert") => {
		counterWritePhase = phase;

		await expect(service.create({ id: "item-new", name: "New", owner: { id: "owner-1" } } as never)).resolves.toMatchObject({ id: "item-new" });
		expect(await counters.findOneByOrFail({ id: "counter-1" })).toEqual({ id: "counter-1", label: `${phase} saved`, note: `${phase} updated`, value: 1 });
		expect(await readRows()).toEqual({
			items: [
				{ id: "item-1", name: "Item", owner: { id: "owner-1", name: "Owner" } },
				{ id: "item-new", name: "New", owner: { id: "owner-1", name: "Owner" } },
			],
			owners: [{ id: "owner-1", name: "Owner" }],
		});
	});
});
