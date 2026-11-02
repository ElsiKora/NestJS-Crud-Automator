import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { EntityManager } from "typeorm";

import { Inject, Injectable, Module } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Column, DataSource, Entity, PrimaryColumn, Repository } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiFunctionSubscriber, ApiFunctionSubscriberBase, ApiPropertyDescribe, ApiService, ApiServiceBase, ApiServiceObservable, ApiSubscriberModule, AuthorizationResolveDefaultPrincipal, EApiDtoType, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

const TABLE: string = "create_same_millisecond_items";

@Entity(TABLE)
class SameMillisecondItemEntity {
	@PrimaryColumn({ default: () => "clock_timestamp()", type: "timestamptz" })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, properties: { [EApiRouteType.CREATE]: { [EApiDtoType.BODY]: { isRequired: false } } }, type: EApiPropertyDescribeType.DATE } as never)
	public at!: Date;

	@Column({ length: 64, type: "varchar" })
	@ApiPropertyDescribe({ description: "label", exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", properties: { [EApiRouteType.CREATE]: { [EApiDtoType.BODY]: { isRequired: true } } }, type: EApiPropertyDescribeType.STRING })
	public label!: string;
}

// Where the current test commits a sibling row in the millisecond of the created key.
const knob: { siblingAfter?: "create" | "get" } = {};
const sources: { main?: DataSource } = {};

/**
 * Commits, on a connection of its own, a row whose key differs from the created key only in its microseconds.
 * @param {EntityManager | undefined} eventManager - Transaction manager of the create, which sees the created row.
 * @param {string} label - Label of the created row.
 * @returns {Promise<void>} Resolves when the sibling is committed.
 */
async function commitSibling(eventManager: EntityManager | undefined, label: string): Promise<void> {
	const [created] = (await eventManager?.query(`SELECT "at"::text AS "at" FROM "${TABLE}" WHERE "label" = $1`, [label])) as Array<{ at: string }>;

	await sources.main?.query(`INSERT INTO "${TABLE}" ("at", "label") VALUES (CASE WHEN extract(microseconds FROM $1::timestamptz)::int % 1000 = 999 THEN $1::timestamptz - interval '1 microsecond' ELSE $1::timestamptz + interval '1 microsecond' END, 'sibling')`, [created?.at]);
}

@Injectable()
@ApiServiceObservable()
@ApiService({ entity: SameMillisecondItemEntity })
class SameMillisecondItemService extends ApiServiceBase<SameMillisecondItemEntity> {
	@InjectRepository(SameMillisecondItemEntity)
	public readonly repository!: Repository<SameMillisecondItemEntity>;
}

@Injectable()
@ApiFunctionSubscriber({ entity: SameMillisecondItemEntity })
class SameMillisecondItemSubscriber extends ApiFunctionSubscriberBase<SameMillisecondItemEntity> {
	public async onAfterCreate(context: { DATA: { eventManager?: EntityManager }; result?: SameMillisecondItemEntity }): Promise<SameMillisecondItemEntity | undefined> {
		if (knob.siblingAfter === "create") {
			await commitSibling(context.DATA.eventManager, "created");
		}

		return context.result;
	}

	public async onBeforeGet(context: { DATA: { eventManager?: EntityManager }; result?: unknown }): Promise<unknown> {
		if (knob.siblingAfter === "get") {
			await commitSibling(context.DATA.eventManager, "created");
		}

		return context.result;
	}
}

@ApiController<SameMillisecondItemEntity>({
	entity: SameMillisecondItemEntity,
	name: "sameMillisecondItem",
	path: "same-millisecond-items",
	routes: {
		[EApiRouteType.CREATE]: {},
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { generation: { isEnabled: false } },
		[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})
class SameMillisecondItemController {
	@Inject(SameMillisecondItemService)
	public readonly service!: SameMillisecondItemService;
}

describe("Generated CREATE whose microsecond key shares its millisecond with another row on PostgreSQL (E2E)", () => {
	let app: INestApplication;
	let container: StartedPostgreSqlContainer;
	let items: Repository<SameMillisecondItemEntity>;

	const post = async (): Promise<{ json: () => { label?: string }; statusCode: number }> =>
		await app
			.getHttpAdapter()
			.getInstance()
			.inject({ method: "POST", payload: { label: "created" }, url: "/same-millisecond-items" });

	beforeAll(async () => {
		container = await new PostgreSqlContainer("postgres:17-alpine").start();

		@Module({
			controllers: [SameMillisecondItemController],
			imports: [TypeOrmModule.forRoot({ dropSchema: true, entities: [SameMillisecondItemEntity], logging: false, synchronize: true, type: "postgres", url: container.getConnectionUri() }), TypeOrmModule.forFeature([SameMillisecondItemEntity]), ApiAuthorizationModule.forRoot({ principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) } } as never), ApiSubscriberModule],
			providers: [SameMillisecondItemService, SameMillisecondItemSubscriber],
		})
		class SameMillisecondModule {}

		const moduleRef = await Test.createTestingModule({ imports: [SameMillisecondModule] }).compile();

		app = moduleRef.createNestApplication(new FastifyAdapter());
		await app.init();
		await app.getHttpAdapter().getInstance().ready();
		const dataSource: DataSource = moduleRef.get(DataSource);
		sources.main = dataSource;
		items = dataSource.getRepository(SameMillisecondItemEntity);
	}, 120_000);

	afterAll(async () => {
		await app?.close();
		await container?.stop();
	});

	beforeEach(async () => {
		await items.clear();
		knob.siblingAfter = undefined;
	});

	it("answers 201 with its own row", async () => {
		const response = await post();

		expect(response.statusCode).toBe(201);
		expect(response.json().label).toBe("created");
	});

	it.each([
		["before the key is checked", "create"],
		["between the key check and the reload", "get"],
	] as const)("answers 500, never the other row, when a row of the same millisecond commits %s", async (_name: string, moment: "create" | "get") => {
		knob.siblingAfter = moment;

		const response = await post();

		expect(response.statusCode).toBe(500);
		expect(await items.find()).toEqual([expect.objectContaining({ label: "sibling" })]);
	});
});
