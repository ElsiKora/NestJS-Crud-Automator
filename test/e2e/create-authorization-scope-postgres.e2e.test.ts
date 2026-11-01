import "reflect-metadata";

import type { ExecutionContext, INestApplication, Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { Logger, Repository } from "typeorm";

import { Inject, Injectable, Module } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { InjectRepository, getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Column, CreateDateColumn, DataSource, Entity, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
	ApiAuthorizationModule,
	ApiAuthorizationPolicy,
	ApiAuthorizationPolicyBase,
	ApiController,
	ApiControllerObservable,
	ApiControllerSecurable,
	ApiFunction,
	ApiFunctionSubscriber,
	ApiFunctionSubscriberBase,
	ApiPropertyDescribe,
	ApiRouteSubscriber,
	ApiRouteSubscriberBase,
	ApiService,
	ApiServiceBase,
	ApiServiceObservable,
	ApiSubscriberModule,
	AuthorizationResolveDefaultPrincipal,
	EApiAuthenticationType,
	EApiAuthorizationMode,
	EApiFunctionTransactionMode,
	EApiFunctionType,
	EApiPropertyDateIdentifier,
	EApiPropertyDateType,
	EApiPropertyDescribeType,
	EApiPropertyStringType,
	EApiRouteType,
} from "../../src/index";

const IN_SCOPE: string = "scope-in";
const OUT_OF_SCOPE: string = "scope-out";
const CONCURRENT_REQUESTS: number = 60;
const POOL_SIZE: number = 3;

class CreateQueryLogger implements Logger {
	public readonly queries: Array<string> = [];

	public log(): void {}

	public logMigration(): void {}

	public logQuery(query: string): void {
		this.queries.push(query);
	}

	public logQueryError(): void {}

	public logQuerySlow(): void {}

	public logSchemaBuild(): void {}
}

const queryLogger: CreateQueryLogger = new CreateQueryLogger();
const POOL_READ_TIMEOUT_MS: number = 2000;

function describeString(description: string): PropertyDecorator {
	return ApiPropertyDescribe({ description, exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING });
}

@Entity("create_scope_pg_items")
class ScopedItemEntity {
	@PrimaryColumn({ type: "varchar" })
	@describeString("id")
	public id!: string;

	@Column({ type: "varchar" })
	@describeString("name")
	public name!: string;

	@Column({ type: "varchar" })
	@describeString("tenantId")
	public tenantId!: string;
}

@Entity("create_scope_pg_composites")
class ScopedCompositeEntity {
	@PrimaryColumn({ type: "varchar" })
	@describeString("tenantId")
	public tenantId!: string;

	@PrimaryGeneratedColumn("uuid")
	@describeString("id")
	public id!: string;

	@Column({ type: "varchar" })
	@describeString("name")
	public name!: string;

	@Column({ type: "varchar" })
	@describeString("ownerId")
	public ownerId!: string;
}

// PostgreSQL stores microseconds here, while the driver reads the key back with milliseconds only.
@Entity("create_scope_pg_events")
class ScopedEventEntity {
	@PrimaryGeneratedColumn("uuid")
	@describeString("id")
	public id!: string;

	@CreateDateColumn({ primary: true, type: "timestamptz" })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.CREATED_AT, type: EApiPropertyDescribeType.DATE } as never)
	public createdAt!: Date;

	@Column({ type: "varchar" })
	@describeString("tenantId")
	public tenantId!: string;
}

interface ITemporalKeyFixture {
	controllers: Array<Type<unknown>>;
	entity: Type<object>;
	label: string;
	providers: Array<Type<unknown>>;
	scopedPath: string;
	source: "body" | "default";
}

// 1800 lies where Moscow and New York keep local mean time, whose offsets hold seconds that node-postgres truncates.
const HISTORIC_INSTANT: string = "1800-01-01T00:00:00.000Z";

const historicTimestampDescribe: PropertyDecorator = ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.CREATED_AT, type: EApiPropertyDescribeType.DATE } as never);
const bodyTimestampDescribe: PropertyDecorator = ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE } as never);

@Entity("create_scope_pg_timestamp_default")
class TimestampDefaultKeyEntity {
	@PrimaryGeneratedColumn("uuid")
	@describeString("id")
	public id!: string;

	@PrimaryColumn({ default: () => "'1800-01-01 00:00:00'", type: "timestamp" })
	@historicTimestampDescribe
	public at!: Date;

	@Column({ type: "varchar" })
	@describeString("tenantId")
	public tenantId!: string;
}

@Entity("create_scope_pg_timestamp_body")
class TimestampBodyKeyEntity {
	@PrimaryGeneratedColumn("uuid")
	@describeString("id")
	public id!: string;

	@PrimaryColumn({ type: "timestamp" })
	@bodyTimestampDescribe
	public at!: Date;

	@Column({ type: "varchar" })
	@describeString("tenantId")
	public tenantId!: string;
}

@Entity("create_scope_pg_timestamptz_default")
class TimestamptzDefaultKeyEntity {
	@PrimaryGeneratedColumn("uuid")
	@describeString("id")
	public id!: string;

	@PrimaryColumn({ default: () => "'1800-01-01 00:00:00+00'", type: "timestamptz" })
	@historicTimestampDescribe
	public at!: Date;

	@Column({ type: "varchar" })
	@describeString("tenantId")
	public tenantId!: string;
}

@Entity("create_scope_pg_timestamptz_body")
class TimestamptzBodyKeyEntity {
	@PrimaryGeneratedColumn("uuid")
	@describeString("id")
	public id!: string;

	@PrimaryColumn({ type: "timestamptz" })
	@bodyTimestampDescribe
	public at!: Date;

	@Column({ type: "varchar" })
	@describeString("tenantId")
	public tenantId!: string;
}

type TTemporalKeyEntity = TimestampBodyKeyEntity | TimestampDefaultKeyEntity | TimestamptzBodyKeyEntity | TimestamptzDefaultKeyEntity;

function createTemporalKeyFixture(TemporalKeyEntity: Type<TTemporalKeyEntity>, name: string, source: "body" | "default"): ITemporalKeyFixture {
	@Injectable()
	@ApiService({ entity: TemporalKeyEntity })
	class TemporalKeyService extends ApiServiceBase<TTemporalKeyEntity> {
		@InjectRepository(TemporalKeyEntity)
		public readonly repository!: Repository<TTemporalKeyEntity>;
	}

	@Injectable()
	@ApiAuthorizationPolicy({ entity: TemporalKeyEntity })
	class TemporalKeyPolicy extends ApiAuthorizationPolicyBase<TTemporalKeyEntity> {
		public onBeforeCreate() {
			return this.allow({ scope: () => ({ where: { tenantId: IN_SCOPE } as never }) });
		}
	}

	@ApiControllerSecurable()
	@ApiController<TTemporalKeyEntity>({
		authorization: {
			defaultMode: EApiAuthorizationMode.HOOKS,
			policyNamespace: name,
			resourceDefinition: { entity: TemporalKeyEntity, fields: [{ isFilterable: true, path: "resource.tenantId", queryPath: "tenantId" }], namespace: name, resourcePath: `${name}/{id}`, resourceType: name },
		},
		entity: TemporalKeyEntity,
		name,
		path: name,
		routes: { ...createRoute, ...disabledRoutes },
	})
	class ScopedTemporalKeyController {
		@Inject(TemporalKeyService)
		public readonly service!: TemporalKeyService;
	}

	@ApiController<TTemporalKeyEntity>({ entity: TemporalKeyEntity, name: `${name}-open`, path: `${name}-open`, routes: { [EApiRouteType.CREATE]: {}, ...disabledRoutes } })
	class OpenTemporalKeyController {
		@Inject(TemporalKeyService)
		public readonly service!: TemporalKeyService;
	}

	return { controllers: [ScopedTemporalKeyController, OpenTemporalKeyController], entity: TemporalKeyEntity, label: `${name.replace("create-scope-pg-", "").replace("-", " from the ")}`, providers: [TemporalKeyPolicy, TemporalKeyService], scopedPath: name, source };
}

// A database trigger owns the second primary column.
@Entity("create_scope_pg_regions")
class TriggerRegionEntity {
	@PrimaryColumn({ type: "varchar" })
	@describeString("id")
	public id!: string;

	@PrimaryColumn({ type: "varchar" })
	@describeString("region")
	public region!: string;

	@Column({ type: "varchar" })
	@describeString("name")
	public name!: string;
}

@Injectable()
@ApiService({ entity: ScopedEventEntity })
class ScopedEventService extends ApiServiceBase<ScopedEventEntity> {
	@InjectRepository(ScopedEventEntity)
	public readonly repository!: Repository<ScopedEventEntity>;
}

@Injectable()
@ApiService({ entity: TriggerRegionEntity })
class TriggerRegionService extends ApiServiceBase<TriggerRegionEntity> {
	@InjectRepository(TriggerRegionEntity)
	public readonly repository!: Repository<TriggerRegionEntity>;
}

@Injectable()
@ApiServiceObservable()
@ApiService({ entity: ScopedItemEntity })
class ScopedItemService extends ApiServiceBase<ScopedItemEntity> {
	@InjectRepository(ScopedItemEntity)
	public readonly repository!: Repository<ScopedItemEntity>;
}

@Injectable()
@ApiServiceObservable()
@ApiService({ entity: ScopedItemEntity, functions: { [EApiFunctionType.GET]: { transaction: { mode: EApiFunctionTransactionMode.NONE } } } })
class ScopedGetNoneItemService extends ApiServiceBase<ScopedItemEntity> {
	@InjectRepository(ScopedItemEntity)
	public readonly repository!: Repository<ScopedItemEntity>;
}

@Injectable()
@ApiService({ entity: ScopedItemEntity })
class ScopedUndecoratedCreateService extends ApiServiceBase<ScopedItemEntity> {
	@InjectRepository(ScopedItemEntity)
	public readonly repository!: Repository<ScopedItemEntity>;

	public override async create(properties: never): Promise<ScopedItemEntity> {
		return await this.repository.save(properties as ScopedItemEntity);
	}
}

@Injectable()
@ApiServiceObservable()
@ApiService({ entity: ScopedItemEntity })
class ScopedDecoratedCreateService extends ApiServiceBase<ScopedItemEntity> {
	@InjectRepository(ScopedItemEntity)
	public readonly repository!: Repository<ScopedItemEntity>;

	@ApiFunction({ entity: ScopedItemEntity, type: EApiFunctionType.CREATE })
	public override async create(properties: never): Promise<ScopedItemEntity> {
		return await super.create(properties);
	}
}

@Injectable()
@ApiServiceObservable()
@ApiService({ entity: ScopedCompositeEntity })
class ScopedCompositeService extends ApiServiceBase<ScopedCompositeEntity> {
	@InjectRepository(ScopedCompositeEntity)
	public readonly repository!: Repository<ScopedCompositeEntity>;
}

@Injectable()
class ScopedAuthGuard implements IAuthGuard {
	public canActivate(context: ExecutionContext): boolean {
		context.switchToHttp().getRequest<{ user?: unknown }>().user = { id: "user-1" };

		return true;
	}

	public getAuthenticateOptions(): undefined {
		return undefined;
	}

	public getRequest<TRequest = any>(context: ExecutionContext): TRequest {
		return context.switchToHttp().getRequest();
	}

	public handleRequest<TUser = any>(_error: any, user: any): TUser {
		return user;
	}

	public async logIn(): Promise<void> {
		return Promise.resolve();
	}
}

@Injectable()
@ApiAuthorizationPolicy({ entity: ScopedItemEntity })
class ScopedItemPolicy extends ApiAuthorizationPolicyBase<ScopedItemEntity> {
	public static where: object = { tenantId: IN_SCOPE };

	public onBeforeCreate() {
		return this.allow({ scope: () => ({ where: ScopedItemPolicy.where as never }) });
	}
}

@Injectable()
@ApiAuthorizationPolicy({ entity: ScopedEventEntity })
class ScopedEventPolicy extends ApiAuthorizationPolicyBase<ScopedEventEntity> {
	public onBeforeCreate() {
		return this.allow({ scope: () => ({ where: { tenantId: IN_SCOPE } as never }) });
	}
}

@Injectable()
@ApiAuthorizationPolicy({ entity: ScopedCompositeEntity })
class ScopedCompositePolicy extends ApiAuthorizationPolicyBase<ScopedCompositeEntity> {
	public onBeforeCreate() {
		return this.allow({ scope: () => ({ where: { ownerId: "user-1" } as never }) });
	}
}

@Injectable()
@ApiFunctionSubscriber({ entity: ScopedItemEntity })
class ScopedItemSubscriber extends ApiFunctionSubscriberBase<ScopedItemEntity> {
	public static afterCreate: ((context: { DATA: { repository: Repository<ScopedItemEntity> }; result: ScopedItemEntity }) => Promise<ScopedItemEntity | void>) | undefined;

	public static narrowReload: boolean = false;

	public async onAfterCreate(context: any): Promise<ScopedItemEntity | undefined> {
		return (await ScopedItemSubscriber.afterCreate?.(context)) ?? undefined;
	}

	public async onBeforeGet(context: any): Promise<any> {
		return ScopedItemSubscriber.narrowReload ? { ...context.result, where: { name: "another-name" } } : undefined;
	}
}

@Injectable()
@ApiFunctionSubscriber({ entity: ScopedCompositeEntity })
class ScopedCompositeSubscriber extends ApiFunctionSubscriberBase<ScopedCompositeEntity> {
	public async onBeforeCreate(context: any): Promise<any> {
		return { ...context.result, tenantId: "tenant-shared" };
	}
}

@Injectable()
@ApiRouteSubscriber({ entity: ScopedItemEntity })
class ScopedItemRouteSubscriber extends ApiRouteSubscriberBase<ScopedItemEntity> {
	public static afterCreateCalls: number = 0;

	public async onAfterCreate(): Promise<undefined> {
		ScopedItemRouteSubscriber.afterCreateCalls += 1;

		return undefined;
	}
}

const disabledRoutes = {
	[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
	[EApiRouteType.GET]: { generation: { isEnabled: false } },
	[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
	[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
	[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
};

const createRoute = { [EApiRouteType.CREATE]: { security: { authentication: { guard: ScopedAuthGuard, type: EApiAuthenticationType.USER } } } };

type TScopedItemService = ScopedDecoratedCreateService | ScopedGetNoneItemService | ScopedItemService | ScopedUndecoratedCreateService;

function createItemController(path: string, service: Type<TScopedItemService>): Type<unknown> {
	@ApiControllerObservable()
	@ApiControllerSecurable()
	@ApiController<ScopedItemEntity>({
		authorization: {
			defaultMode: EApiAuthorizationMode.HOOKS,
			policyNamespace: "create-scope-pg:item",
			resourceDefinition: { entity: ScopedItemEntity, fields: [{ isFilterable: true, path: "resource.tenantId", queryPath: "tenantId" }], namespace: "create-scope-pg:item", resourcePath: "create-scope-pg:item/{id}", resourceType: "create-scope-pg:item" },
		},
		entity: ScopedItemEntity,
		name: path,
		path,
		routes: { ...createRoute, ...disabledRoutes },
	})
	class ScopedItemController {
		@Inject(service)
		public readonly service!: TScopedItemService;
	}

	return ScopedItemController;
}

@ApiControllerSecurable()
@ApiController<ScopedCompositeEntity>({
	authorization: {
		defaultMode: EApiAuthorizationMode.HOOKS,
		policyNamespace: "create-scope-pg:composite",
		resourceDefinition: { entity: ScopedCompositeEntity, fields: [{ isFilterable: true, path: "resource.ownerId", queryPath: "ownerId" }], namespace: "create-scope-pg:composite", resourcePath: "create-scope-pg:composite/{id}", resourceType: "create-scope-pg:composite" },
	},
	entity: ScopedCompositeEntity,
	name: "create-scope-pg-composite",
	path: "create-scope-pg-composite",
	routes: { ...createRoute, ...disabledRoutes },
})
class ScopedCompositeController {
	@Inject(ScopedCompositeService)
	public readonly service!: ScopedCompositeService;
}

@ApiControllerSecurable()
@ApiController<ScopedEventEntity>({
	authorization: {
		defaultMode: EApiAuthorizationMode.HOOKS,
		policyNamespace: "create-scope-pg:event",
		resourceDefinition: { entity: ScopedEventEntity, fields: [{ isFilterable: true, path: "resource.tenantId", queryPath: "tenantId" }], namespace: "create-scope-pg:event", resourcePath: "create-scope-pg:event/{id}", resourceType: "create-scope-pg:event" },
	},
	entity: ScopedEventEntity,
	name: "create-scope-pg-event",
	path: "create-scope-pg-event",
	routes: { ...createRoute, ...disabledRoutes },
})
class ScopedEventController {
	@Inject(ScopedEventService)
	public readonly service!: ScopedEventService;
}

@ApiController<ScopedEventEntity>({ entity: ScopedEventEntity, name: "create-scope-pg-event-open", path: "create-scope-pg-event-open", routes: { [EApiRouteType.CREATE]: {}, ...disabledRoutes } })
class OpenEventController {
	@Inject(ScopedEventService)
	public readonly service!: ScopedEventService;
}

@ApiController<TriggerRegionEntity>({ entity: TriggerRegionEntity, name: "create-scope-pg-region", path: "create-scope-pg-region", routes: { [EApiRouteType.CREATE]: {}, ...disabledRoutes } })
class TriggerRegionController {
	@Inject(TriggerRegionService)
	public readonly service!: TriggerRegionService;
}

const temporalKeyFixtures: Array<ITemporalKeyFixture> = [createTemporalKeyFixture(TimestampDefaultKeyEntity, "create-scope-pg-timestamp-default", "default"), createTemporalKeyFixture(TimestampBodyKeyEntity, "create-scope-pg-timestamp-body", "body"), createTemporalKeyFixture(TimestamptzDefaultKeyEntity, "create-scope-pg-timestamptz-default", "default"), createTemporalKeyFixture(TimestamptzBodyKeyEntity, "create-scope-pg-timestamptz-body", "body")];

describe("Generated CREATE authorization scope on PostgreSQL (E2E)", () => {
	let app: INestApplication;
	let composites: Repository<ScopedCompositeEntity>;
	let events: Repository<ScopedEventEntity>;
	let regions: Repository<TriggerRegionEntity>;
	let container: StartedPostgreSqlContainer;
	let fastify: { inject: (options: { method: string; payload?: unknown; url: string }) => Promise<{ json: () => { id?: string }; statusCode: number }> };
	let items: Repository<ScopedItemEntity>;

	async function postItem(path: string, id: string, tenantId: string) {
		return await fastify.inject({ method: "POST", payload: { id, name: "Item", tenantId }, url: `/${path}` });
	}

	async function postComposite(name: string, ownerId: string) {
		return await fastify.inject({ method: "POST", payload: { name, ownerId }, url: "/create-scope-pg-composite" });
	}

	beforeAll(async () => {
		container = await new PostgreSqlContainer("postgres:17-alpine").start();

		@Module({
			controllers: [
				createItemController("create-scope-pg", ScopedItemService),
				createItemController("create-scope-pg-get-none", ScopedGetNoneItemService),
				createItemController("create-scope-pg-undecorated", ScopedUndecoratedCreateService),
				createItemController("create-scope-pg-decorated", ScopedDecoratedCreateService),
				ScopedCompositeController,
				ScopedEventController,
				OpenEventController,
				TriggerRegionController,
				...temporalKeyFixtures.flatMap((fixture: ITemporalKeyFixture): Array<Type<unknown>> => fixture.controllers),
			],
			imports: [
				TypeOrmModule.forRoot({
					database: container.getDatabase(),
					dropSchema: true,
					entities: [ScopedCompositeEntity, ScopedEventEntity, ScopedItemEntity, TriggerRegionEntity, ...temporalKeyFixtures.map((fixture: ITemporalKeyFixture): Type<object> => fixture.entity)],
					extra: { max: POOL_SIZE },
					host: container.getHost(),
					logger: queryLogger,
					logging: ["query"],
					password: container.getPassword(),
					port: container.getPort(),
					synchronize: true,
					type: "postgres",
					username: container.getUsername(),
				}),
				TypeOrmModule.forFeature([ScopedCompositeEntity, ScopedEventEntity, ScopedItemEntity, TriggerRegionEntity, ...temporalKeyFixtures.map((fixture: ITemporalKeyFixture): Type<object> => fixture.entity)]),
				ApiAuthorizationModule.forRoot({ principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user) } }),
				ApiSubscriberModule,
			],
			providers: [ScopedAuthGuard, ScopedCompositePolicy, ScopedCompositeService, ScopedCompositeSubscriber, ScopedDecoratedCreateService, ScopedEventPolicy, ScopedEventService, TriggerRegionService, ...temporalKeyFixtures.flatMap((fixture: ITemporalKeyFixture): Array<Type<unknown>> => fixture.providers), ScopedGetNoneItemService, ScopedItemPolicy, ScopedItemRouteSubscriber, ScopedItemService, ScopedItemSubscriber, ScopedUndecoratedCreateService],
		})
		class ScopedModule {}

		const moduleRef = await Test.createTestingModule({ imports: [ScopedModule] }).compile();

		app = moduleRef.createNestApplication(new FastifyAdapter());
		await app.init();
		fastify = app.getHttpAdapter().getInstance() as typeof fastify;
		items = app.get(getRepositoryToken(ScopedItemEntity));
		composites = app.get(getRepositoryToken(ScopedCompositeEntity));
		events = app.get(getRepositoryToken(ScopedEventEntity));
		regions = app.get(getRepositoryToken(TriggerRegionEntity));

		const dataSource: DataSource = app.get(DataSource);

		await dataSource.query(`create function create_scope_pg_set_region() returns trigger as $$ begin new.region := 'eu'; return new; end; $$ language plpgsql`);
		await dataSource.query(`create trigger create_scope_pg_region before insert on create_scope_pg_regions for each row execute function create_scope_pg_set_region()`);
	}, 120_000);

	beforeEach(async () => {
		await items.clear();
		await composites.clear();
		await events.clear();
		await regions.clear();
		for (const fixture of temporalKeyFixtures) {
			await app.get(DataSource).getRepository(fixture.entity).clear();
		}
		ScopedItemPolicy.where = { tenantId: IN_SCOPE };
		ScopedItemSubscriber.afterCreate = undefined;
		ScopedItemSubscriber.narrowReload = false;
		ScopedItemRouteSubscriber.afterCreateCalls = 0;
	});

	afterAll(async () => {
		await app?.close();
		await container?.stop();
	}, 60_000);

	describe("create identity", () => {
		it.each([
			["a scoped", "create-scope-pg-event"],
			["a non-scoped", "create-scope-pg-event-open"],
		])("reloads %s row whose timestamp primary column holds microseconds", async (_name: string, path: string) => {
			const statuses: Array<number> = [];

			for (let index: number = 0; index < 5; index++) {
				statuses.push((await fastify.inject({ method: "POST", payload: { tenantId: IN_SCOPE }, url: `/${path}` })).statusCode);
			}

			expect(statuses).toEqual([201, 201, 201, 201, 201]);
			expect(await events.count()).toBe(5);
		});

		it("refuses an out-of-scope row whose timestamp primary column holds microseconds", async () => {
			const response = await fastify.inject({ method: "POST", payload: { tenantId: OUT_OF_SCOPE }, url: "/create-scope-pg-event" });

			expect(response.statusCode).toBe(403);
			expect(await events.count()).toBe(0);
		});

		it("reloads by the primary columns the create result holds when a trigger fills another one", async () => {
			const response = await fastify.inject({ method: "POST", payload: { id: "region-1", name: "Region" }, url: "/create-scope-pg-region" });

			expect(response.statusCode).toBe(201);
			expect(response.json()).toMatchObject({ id: "region-1", region: "eu" });
		});

		it("answers 500 and rolls back when a trigger overwrites a primary value the create result still holds", async () => {
			const response = await fastify.inject({ method: "POST", payload: { id: "region-2", name: "Region", region: "us" }, url: "/create-scope-pg-region" });

			expect(response.statusCode).toBe(500);
			expect(await regions.findBy({ id: "region-2" })).toEqual([]);
		});

		describe.each(["UTC", "Europe/Moscow", "America/New_York"])("in the %s time zone", (zone: string) => {
			let timeZone: string | undefined;

			beforeAll(() => {
				timeZone = process.env.TZ;
				process.env.TZ = zone;
			});

			afterAll(() => {
				if (timeZone === undefined) {
					delete process.env.TZ;
				} else {
					process.env.TZ = timeZone;
				}
			});

			it.each(
				temporalKeyFixtures.flatMap((fixture: ITemporalKeyFixture): Array<[string, string, ITemporalKeyFixture, string, number]> => [
					[fixture.label, "a scoped in-scope", fixture, fixture.scopedPath, 201],
					[fixture.label, "a scoped out-of-scope", fixture, fixture.scopedPath, 403],
					[fixture.label, "a non-scoped", fixture, `${fixture.scopedPath}-open`, 201],
				]),
			)("answers a %s key in 1800 on %s request", async (_label: string, kind: string, fixture: ITemporalKeyFixture, path: string, status: number) => {
				const tenantId: string = kind === "a scoped out-of-scope" ? OUT_OF_SCOPE : IN_SCOPE;
				const payload: Record<string, string> = fixture.source === "body" ? { at: HISTORIC_INSTANT, tenantId } : { tenantId };
				const response = await fastify.inject({ method: "POST", payload, url: `/${path}` });

				expect(response.statusCode).toBe(status);
				expect(await app.get(DataSource).getRepository(fixture.entity).count()).toBe(status === 201 ? 1 : 0);
			});
		});

		it("checks the stored row when onAfterCreate returns another in-scope row", async () => {
			await items.save({ id: "decoy", name: "Item", tenantId: IN_SCOPE });
			ScopedItemSubscriber.afterCreate = async ({ result }) => ({ ...result, id: "decoy", tenantId: IN_SCOPE });

			const response = await postItem("create-scope-pg", "planted", OUT_OF_SCOPE);

			expect(response.statusCode).toBe(403);
			expect(await items.countBy({ id: "planted" })).toBe(0);
			expect(await items.countBy({ id: "decoy" })).toBe(1);
		});
	});

	describe("composite primary key", () => {
		it("refuses an out-of-scope row when an in-scope sibling shares the first primary column", async () => {
			expect((await postComposite("own", "user-1")).statusCode).toBe(201);

			const response = await postComposite("planted", "victim");

			expect(response.statusCode).toBe(403);
			expect(await composites.countBy({ name: "planted" })).toBe(0);
			expect(await composites.count()).toBe(1);
		});

		it("answers with the created row, not with a sibling that shares the first primary column", async () => {
			const first = await postComposite("first", "user-1");
			const second = await postComposite("second", "user-1");

			expect(second.statusCode).toBe(201);
			expect(second.json().id).not.toBe(first.json().id);
			expect(second.json()).toMatchObject({ name: "second" });
		});
	});

	describe("transaction cost", () => {
		it("runs a non-scoped create as the queries of a scoped create inside one transaction", async () => {
			const readQueries = (): Array<string> => queryLogger.queries.splice(0).map((query: string): string => query.replace(/ WHERE .*$/su, ""));

			queryLogger.queries.length = 0;
			expect((await postItem("create-scope-pg", "cost-scoped", IN_SCOPE)).statusCode).toBe(201);
			const scopedQueries: Array<string> = readQueries();
			ScopedItemPolicy.where = {};
			expect((await postItem("create-scope-pg", "cost-open", IN_SCOPE)).statusCode).toBe(201);
			const queries: Array<string> = readQueries();

			expect(queries).toEqual(scopedQueries);
			// The save lookup, the insert, the identity read and the reload, as before the create owned a transaction, plus its boundaries.
			expect(queries.map((query: string): string => query.split(" ")[0] ?? "")).toEqual(["START", "SELECT", "INSERT", "SELECT", "SELECT", "COMMIT"]);
		});
	});

	describe("create function capability", () => {
		it("rejects an undecorated create on a scoped route before the write", async () => {
			const response = await postItem("create-scope-pg-undecorated", "raw-out", OUT_OF_SCOPE);

			expect(response.statusCode).toBe(500);
			expect(await items.countBy({ id: "raw-out" })).toBe(0);
		});

		it("rejects an undecorated create on a scoped route even for an in-scope row", async () => {
			const response = await postItem("create-scope-pg-undecorated", "raw-in", IN_SCOPE);

			expect(response.statusCode).toBe(500);
			expect(await items.countBy({ id: "raw-in" })).toBe(0);
		});

		it("rejects an undecorated create on a non-scoped route before the write", async () => {
			ScopedItemPolicy.where = {};

			const response = await postItem("create-scope-pg-undecorated", "raw-plain", OUT_OF_SCOPE);

			expect(response.statusCode).toBe(500);
			expect(await items.countBy({ id: "raw-plain" })).toBe(0);
		});

		it("rolls back a decorated create override", async () => {
			const response = await postItem("create-scope-pg-decorated", "decorated-out", OUT_OF_SCOPE);

			expect(response.statusCode).toBe(403);
			expect(await items.countBy({ id: "decorated-out" })).toBe(0);
		});
	});

	describe("function modes and subscribers", () => {
		it("persists nothing when the GET function is configured as NONE", async () => {
			const response = await postItem("create-scope-pg-get-none", "get-none", IN_SCOPE);

			expect(response.statusCode).toBe(500);
			expect(await items.countBy({ id: "get-none" })).toBe(0);
		});

		it("refuses an in-scope row that onBeforeGet narrows out of the reload", async () => {
			ScopedItemSubscriber.narrowReload = true;

			const response = await postItem("create-scope-pg", "narrowed", IN_SCOPE);

			expect(response.statusCode).toBe(403);
			expect(await items.countBy({ id: "narrowed" })).toBe(0);
		});

		it("runs onAfterCreate before the refusal and rolls back only what it wrote through the transaction", async () => {
			const externalEffects: Array<string> = [];

			ScopedItemSubscriber.afterCreate = async ({ DATA, result }) => {
				externalEffects.push(result.id);

				if (result.id === "refused") {
					await DATA.repository.save({ id: "refused-side-write", name: "Item", tenantId: IN_SCOPE });
				}
			};

			const response = await postItem("create-scope-pg", "refused", OUT_OF_SCOPE);

			expect(response.statusCode).toBe(403);
			expect(externalEffects).toEqual(["refused"]);
			expect(await items.countBy({ id: "refused" })).toBe(0);
			expect(await items.countBy({ id: "refused-side-write" })).toBe(0);
			expect(ScopedItemRouteSubscriber.afterCreateCalls).toBe(0);
		});

		it("lets onAfterCreate read the uncommitted row through DATA.repository", async () => {
			const seen: Array<null | ScopedItemEntity> = [];

			ScopedItemSubscriber.afterCreate = async ({ DATA, result }) => {
				seen.push(await DATA.repository.findOneBy({ id: result.id }));
			};

			expect((await postItem("create-scope-pg", "visible", IN_SCOPE)).statusCode).toBe(201);
			expect(ScopedItemRouteSubscriber.afterCreateCalls).toBe(1);
			expect(seen).toEqual([expect.objectContaining({ id: "visible" })]);
		});
	});

	describe("concurrent requests", () => {
		it("keeps each verdict and each row apart", async () => {
			ScopedItemSubscriber.afterCreate = async () => {
				await new Promise((resolve: (value: unknown) => void) => setTimeout(resolve, Math.random() * 20));
			};

			const responses = await Promise.all(Array.from({ length: CONCURRENT_REQUESTS }, async (_value: unknown, index: number) => await postItem("create-scope-pg", `concurrent-${index}`, index % 2 === 0 ? OUT_OF_SCOPE : IN_SCOPE)));
			const rows: Array<ScopedItemEntity> = await items.find();

			expect(responses.map(({ statusCode }) => statusCode)).toEqual(Array.from({ length: CONCURRENT_REQUESTS }, (_value: unknown, index: number) => (index % 2 === 0 ? 403 : 201)));
			expect(rows).toHaveLength(CONCURRENT_REQUESTS / 2);
			expect(rows.every(({ tenantId }) => tenantId === IN_SCOPE)).toBe(true);
		}, 60_000);

		it("does not need a second connection for DATA.repository while every pool connection holds a transaction", async () => {
			let timedOutReads: number = 0;

			ScopedItemSubscriber.afterCreate = async ({ DATA }) => {
				await new Promise((resolve: (value: unknown) => void) => setTimeout(resolve, 50));

				const result: number | string = await Promise.race([DATA.repository.count(), new Promise<string>((resolve: (value: string) => void) => setTimeout(() => resolve("timeout"), POOL_READ_TIMEOUT_MS))]);

				if (result === "timeout") {
					timedOutReads += 1;
				}
			};

			const responses = await Promise.all(Array.from({ length: POOL_SIZE }, async (_value: unknown, index: number) => await postItem("create-scope-pg", `pool-${index}`, IN_SCOPE)));

			expect(timedOutReads).toBe(0);
			expect(responses.map(({ statusCode }) => statusCode)).toEqual([201, 201, 201]);
		}, 30_000);
	});
});
