import "reflect-metadata";

import type { ExecutionContext, INestApplication } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { StartedTestContainer } from "testcontainers";

import { Inject, Injectable, Module } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { getDataSourceToken, InjectDataSource, TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Column, DataSource, Entity, PrimaryGeneratedColumn, Repository } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiAuthorizationPolicy, ApiAuthorizationPolicyBase, ApiController, ApiControllerSecurable, ApiFunctionSubscriber, ApiFunctionSubscriberBase, ApiPropertyDescribe, ApiService, ApiServiceBase, ApiServiceObservable, ApiSubscriberModule, AuthorizationResolveDefaultPrincipal, EApiAuthenticationType, EApiAuthorizationMode, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

const IN_SCOPE: string = "tenant-1";
const OUT_OF_SCOPE: string = "tenant-2";

const describeText: PropertyDecorator = ApiPropertyDescribe({ description: "text", exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING });

@Entity("custom_repository_items")
class CustomItemEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ type: EApiPropertyDescribeType.UUID } as never)
	public id!: string;

	@Column({ type: "varchar" })
	@describeText
	public tenantId!: string;
}

// The repository a subscriber or an override received on each call.
const calls: { findOne: number; save: number } = { findOne: 0, save: 0 };
const seen: { create?: unknown; get?: unknown } = {};

interface ICustomRepository extends Repository<CustomItemEntity> {
	readonly label: string;
}

const CUSTOM_MEMBERS: ThisType<Repository<CustomItemEntity>> & Record<string, unknown> = {
	async findOne(this: Repository<CustomItemEntity>, ...parameters: Array<unknown>): Promise<unknown> {
		calls.findOne += 1;

		return await Reflect.apply(Repository.prototype.findOne, this, parameters);
	},
	label: "custom",
	async save(this: Repository<CustomItemEntity>, ...parameters: Array<unknown>): Promise<unknown> {
		calls.save += 1;

		return await Reflect.apply(Repository.prototype.save, this, parameters);
	},
};

// A repository class without a constructor of its own.
class SubclassedItemRepository extends Repository<CustomItemEntity> {
	public override async save(...parameters: Array<never>): Promise<never> {
		calls.save += 1;

		return (await Reflect.apply(Repository.prototype.save, this, parameters)) as never;
	}
}

// The usual NestJS custom repository: a provider whose constructor takes the DataSource.
@Injectable()
class NestItemRepository extends Repository<CustomItemEntity> {
	public constructor(@InjectDataSource() dataSource: DataSource) {
		super(CustomItemEntity, dataSource.createEntityManager());
	}

	public override async save(...parameters: Array<never>): Promise<never> {
		calls.save += 1;

		return (await Reflect.apply(Repository.prototype.save, this, parameters)) as never;
	}
}

@Injectable()
class ItemAudit {
	public record(): void {
		calls.save += 1;
	}
}

// A NestJS custom repository with another injected dependency its methods use.
@Injectable()
class AuditedItemRepository extends Repository<CustomItemEntity> {
	public constructor(
		@InjectDataSource() dataSource: DataSource,
		@Inject(ItemAudit) private readonly audit: ItemAudit,
	) {
		super(CustomItemEntity, dataSource.createEntityManager());
	}

	public override async save(...parameters: Array<never>): Promise<never> {
		this.audit.record();

		return (await Reflect.apply(Repository.prototype.save, this, parameters)) as never;
	}
}

const EXTENDED_REPOSITORY: string = "EXTENDED_REPOSITORY";
const SUBCLASSED_REPOSITORY: string = "SUBCLASSED_REPOSITORY";
const DELEGATING_REPOSITORY: string = "DELEGATING_REPOSITORY";

@Injectable()
@ApiFunctionSubscriber({ entity: CustomItemEntity })
class CustomItemSubscriber extends ApiFunctionSubscriberBase<CustomItemEntity> {
	public onBeforeCreate(context: { DATA: { repository: Partial<ICustomRepository> }; result?: unknown }): unknown {
		seen.create = context.DATA.repository.label;

		return context.result;
	}

	public onBeforeGet(context: { DATA: { repository: Partial<ICustomRepository> }; result?: unknown }): unknown {
		seen.get = context.DATA.repository.label;

		return context.result;
	}
}

@Injectable()
@ApiAuthorizationPolicy({ entity: CustomItemEntity })
class CustomItemPolicy extends ApiAuthorizationPolicyBase<CustomItemEntity> {
	public onBeforeCreate() {
		return this.allow({ scope: () => ({ where: { tenantId: IN_SCOPE } }) });
	}
}

@Injectable()
class CustomAuthGuard implements IAuthGuard {
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

const disabledRoutes = {
	[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
	[EApiRouteType.GET]: { generation: { isEnabled: false } },
	[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
	[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
	[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
};

const openRoute = (path: string) => ({ entity: CustomItemEntity, name: path, path, routes: { [EApiRouteType.CREATE]: {}, ...disabledRoutes } });

const scopedRoute = (path: string) => ({
	authorization: { defaultMode: EApiAuthorizationMode.HOOKS, policyNamespace: path, resourceDefinition: { entity: CustomItemEntity, fields: [{ isFilterable: true, path: "resource.tenantId", queryPath: "tenantId" }], namespace: path, resourcePath: `${path}/{id}`, resourceType: path } },
	entity: CustomItemEntity,
	name: path,
	path,
	routes: { [EApiRouteType.CREATE]: { security: { authentication: { guard: CustomAuthGuard, type: EApiAuthenticationType.USER } } }, ...disabledRoutes },
});

@Injectable()
@ApiServiceObservable()
@ApiService({ entity: CustomItemEntity })
class ExtendedItemService extends ApiServiceBase<CustomItemEntity> {
	@Inject(EXTENDED_REPOSITORY)
	public readonly repository!: ICustomRepository;
}

@Injectable()
@ApiService({ entity: CustomItemEntity })
class SubclassedItemService extends ApiServiceBase<CustomItemEntity> {
	@Inject(SUBCLASSED_REPOSITORY)
	public readonly repository!: SubclassedItemRepository;
}

@Injectable()
@ApiService({ entity: CustomItemEntity })
class NestItemService extends ApiServiceBase<CustomItemEntity> {
	public constructor(@Inject(NestItemRepository) protected readonly repository: NestItemRepository) {
		super();
	}
}

@Injectable()
@ApiService({ entity: CustomItemEntity })
class AuditedItemService extends ApiServiceBase<CustomItemEntity> {
	@Inject(AuditedItemRepository)
	public readonly repository!: AuditedItemRepository;
}

@Injectable()
@ApiService({ entity: CustomItemEntity })
class DelegatingItemService extends ApiServiceBase<CustomItemEntity> {
	@Inject(DELEGATING_REPOSITORY)
	public readonly repository!: Repository<CustomItemEntity>;
}

@ApiController<CustomItemEntity>(openRoute("custom-extended"))
class ExtendedItemController {
	@Inject(ExtendedItemService)
	public readonly service!: ExtendedItemService;
}

@ApiControllerSecurable()
@ApiController<CustomItemEntity>(scopedRoute("custom-extended-scoped"))
class ScopedExtendedItemController {
	@Inject(ExtendedItemService)
	public readonly service!: ExtendedItemService;
}

@ApiController<CustomItemEntity>(openRoute("custom-subclassed"))
class SubclassedItemController {
	@Inject(SubclassedItemService)
	public readonly service!: SubclassedItemService;
}

@ApiControllerSecurable()
@ApiController<CustomItemEntity>(scopedRoute("custom-subclassed-scoped"))
class ScopedSubclassedItemController {
	@Inject(SubclassedItemService)
	public readonly service!: SubclassedItemService;
}

@ApiController<CustomItemEntity>(openRoute("custom-nest"))
class NestItemController {
	@Inject(NestItemService)
	public readonly service!: NestItemService;
}

@ApiControllerSecurable()
@ApiController<CustomItemEntity>(scopedRoute("custom-nest-scoped"))
class ScopedNestItemController {
	@Inject(NestItemService)
	public readonly service!: NestItemService;
}

@ApiController<CustomItemEntity>(openRoute("custom-audited"))
class AuditedItemController {
	@Inject(AuditedItemService)
	public readonly service!: AuditedItemService;
}

@ApiControllerSecurable()
@ApiController<CustomItemEntity>(scopedRoute("custom-audited-scoped"))
class ScopedAuditedItemController {
	@Inject(AuditedItemService)
	public readonly service!: AuditedItemService;
}

@ApiController<CustomItemEntity>(openRoute("custom-delegating"))
class DelegatingItemController {
	@Inject(DelegatingItemService)
	public readonly service!: DelegatingItemService;
}

@ApiControllerSecurable()
@ApiController<CustomItemEntity>(scopedRoute("custom-delegating-scoped"))
class ScopedDelegatingItemController {
	@Inject(DelegatingItemService)
	public readonly service!: DelegatingItemService;
}

interface IRepositoryShape {
	name: string;
	path: string;
	// How often the save of the repository runs for one create: a delegating object is not a repository, so the transaction saves through the plain repository of the entity.
	saves: number;
}

const SHAPES: Array<IRepositoryShape> = [
	{ name: "an extended repository", path: "custom-extended", saves: 1 },
	{ name: "a repository subclass", path: "custom-subclassed", saves: 1 },
	{ name: "a NestJS repository that takes the DataSource", path: "custom-nest", saves: 1 },
	{ name: "a NestJS repository with another dependency", path: "custom-audited", saves: 1 },
	{ name: "a delegating object", path: "custom-delegating", saves: 0 },
];

interface IRepositoryDriver {
	name: string;
	start: () => Promise<{ container?: StartedTestContainer; options: object }>;
}

const DRIVERS: Array<IRepositoryDriver> = [
	{ name: "better-sqlite3", start: async () => ({ options: { database: ":memory:", type: "better-sqlite3" } }) },
	{
		name: "postgres",
		start: async () => {
			const container = await new PostgreSqlContainer("postgres:17-alpine").start();

			return { container, options: { database: container.getDatabase(), host: container.getHost(), password: container.getPassword(), port: container.getPort(), type: "postgres", username: container.getUsername() } };
		},
	},
];

describe.each(DRIVERS)("Generated CREATE on a custom repository on $name (E2E)", (driver: IRepositoryDriver) => {
	let app: INestApplication;
	let container: StartedTestContainer | undefined;
	let items: Repository<CustomItemEntity>;

	const post = async (path: string, tenantId: string): Promise<number> => {
		const response = await app
			.getHttpAdapter()
			.getInstance()
			.inject({ method: "POST", payload: { tenantId }, url: `/${path}` });

		return response.statusCode;
	};

	beforeAll(async () => {
		const started = await driver.start();
		container = started.container;

		@Module({
			controllers: [AuditedItemController, DelegatingItemController, ExtendedItemController, NestItemController, ScopedAuditedItemController, ScopedDelegatingItemController, ScopedExtendedItemController, ScopedNestItemController, ScopedSubclassedItemController, SubclassedItemController],
			imports: [TypeOrmModule.forRoot({ ...started.options, dropSchema: true, entities: [CustomItemEntity], logging: false, synchronize: true } as never), TypeOrmModule.forFeature([CustomItemEntity]), ApiAuthorizationModule.forRoot({ principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) } } as never), ApiSubscriberModule],
			providers: [
				AuditedItemRepository,
				AuditedItemService,
				CustomAuthGuard,
				CustomItemPolicy,
				CustomItemSubscriber,
				DelegatingItemService,
				ExtendedItemService,
				ItemAudit,
				NestItemRepository,
				NestItemService,
				SubclassedItemService,
				{
					inject: [getDataSourceToken()],
					provide: EXTENDED_REPOSITORY,
					useFactory: (dataSource: DataSource): Repository<CustomItemEntity> => dataSource.getRepository(CustomItemEntity).extend(CUSTOM_MEMBERS as never),
				},
				{
					inject: [getDataSourceToken()],
					provide: SUBCLASSED_REPOSITORY,
					useFactory: (dataSource: DataSource): SubclassedItemRepository => new SubclassedItemRepository(CustomItemEntity, dataSource.manager),
				},
				{
					inject: [getDataSourceToken()],
					provide: DELEGATING_REPOSITORY,
					useFactory: (dataSource: DataSource): object => {
						const repository: Repository<CustomItemEntity> = dataSource.getRepository(CustomItemEntity);

						return {
							get manager(): Repository<CustomItemEntity>["manager"] {
								return repository.manager;
							},
							get metadata(): Repository<CustomItemEntity>["metadata"] {
								return repository.metadata;
							},
							save: async (...parameters: Array<never>): Promise<unknown> => {
								calls.save += 1;

								return await Reflect.apply(repository.save, repository, parameters);
							},
							get target(): Repository<CustomItemEntity>["target"] {
								return repository.target;
							},
						};
					},
				},
			],
		})
		class CustomRepositoryModule {}

		const moduleRef = await Test.createTestingModule({ imports: [CustomRepositoryModule] }).compile();

		app = moduleRef.createNestApplication(new FastifyAdapter());
		await app.init();
		await app.getHttpAdapter().getInstance().ready();
		items = moduleRef.get(DataSource).getRepository(CustomItemEntity);
	}, 180_000);

	afterAll(async () => {
		await app?.close();
		await container?.stop();
	}, 60_000);

	beforeEach(async () => {
		await items.clear();
		calls.findOne = 0;
		calls.save = 0;
		seen.create = undefined;
		seen.get = undefined;
	});

	it.each(SHAPES)("creates through $name", async (shape: IRepositoryShape) => {
		expect(await post(shape.path, IN_SCOPE)).toBe(201);
		expect(calls.save).toBe(shape.saves);
		expect(await items.count()).toBe(1);
	});

	it.each(SHAPES)("rolls a refused create on $name back", async (shape: IRepositoryShape) => {
		expect(await post(`${shape.path}-scoped`, OUT_OF_SCOPE)).toBe(403);
		expect(calls.save).toBe(shape.saves);
		expect(await items.count()).toBe(0);
	});

	it("runs a read override of an extended repository in the post-create read", async () => {
		expect(await post("custom-extended", IN_SCOPE)).toBe(201);
		expect(calls.findOne).toBeGreaterThan(0);
	});

	it("gives subscribers the members of an extended repository", async () => {
		expect(await post("custom-extended", IN_SCOPE)).toBe(201);
		expect(seen).toEqual({ create: "custom", get: "custom" });
	});
});
