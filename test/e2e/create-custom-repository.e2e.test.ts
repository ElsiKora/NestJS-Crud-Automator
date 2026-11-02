import "reflect-metadata";

import type { ExecutionContext, INestApplication } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";

import { Inject, Injectable, Module } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { getDataSourceToken, TypeOrmModule } from "@nestjs/typeorm";
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

const EXTENDED_REPOSITORY: string = "EXTENDED_REPOSITORY";

@Injectable()
@ApiServiceObservable()
@ApiService({ entity: CustomItemEntity })
class ExtendedItemService extends ApiServiceBase<CustomItemEntity> {
	@Inject(EXTENDED_REPOSITORY)
	public readonly repository!: ICustomRepository;
}

// A repository class of its own, as a provider with its own constructor would build one.
class SubclassedItemRepository extends Repository<CustomItemEntity> {
	public override async save(...parameters: Array<never>): Promise<never> {
		calls.save += 1;

		return (await Reflect.apply(Repository.prototype.save, this, parameters)) as never;
	}
}

const SUBCLASSED_REPOSITORY: string = "SUBCLASSED_REPOSITORY";

@Injectable()
@ApiService({ entity: CustomItemEntity })
class SubclassedItemService extends ApiServiceBase<CustomItemEntity> {
	@Inject(SUBCLASSED_REPOSITORY)
	public readonly repository!: SubclassedItemRepository;
}

const DELEGATING_REPOSITORY: string = "DELEGATING_REPOSITORY";

@Injectable()
@ApiService({ entity: CustomItemEntity })
class DelegatingItemService extends ApiServiceBase<CustomItemEntity> {
	@Inject(DELEGATING_REPOSITORY)
	public readonly repository!: Repository<CustomItemEntity>;
}

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

@ApiController<CustomItemEntity>({ entity: CustomItemEntity, name: "custom-extended", path: "custom-extended", routes: { [EApiRouteType.CREATE]: {}, ...disabledRoutes } })
class ExtendedItemController {
	@Inject(ExtendedItemService)
	public readonly service!: ExtendedItemService;
}

@ApiControllerSecurable()
@ApiController<CustomItemEntity>({
	authorization: { defaultMode: EApiAuthorizationMode.HOOKS, policyNamespace: "custom-scoped", resourceDefinition: { entity: CustomItemEntity, fields: [{ isFilterable: true, path: "resource.tenantId", queryPath: "tenantId" }], namespace: "custom-scoped", resourcePath: "custom-scoped/{id}", resourceType: "custom-scoped" } },
	entity: CustomItemEntity,
	name: "custom-scoped",
	path: "custom-scoped",
	routes: { [EApiRouteType.CREATE]: { security: { authentication: { guard: CustomAuthGuard, type: EApiAuthenticationType.USER } } }, ...disabledRoutes },
})
class ScopedExtendedItemController {
	@Inject(ExtendedItemService)
	public readonly service!: ExtendedItemService;
}

@ApiController<CustomItemEntity>({ entity: CustomItemEntity, name: "custom-subclassed", path: "custom-subclassed", routes: { [EApiRouteType.CREATE]: {}, ...disabledRoutes } })
class SubclassedItemController {
	@Inject(SubclassedItemService)
	public readonly service!: SubclassedItemService;
}

@ApiController<CustomItemEntity>({ entity: CustomItemEntity, name: "custom-delegating", path: "custom-delegating", routes: { [EApiRouteType.CREATE]: {}, ...disabledRoutes } })
class DelegatingItemController {
	@Inject(DelegatingItemService)
	public readonly service!: DelegatingItemService;
}

@Module({
	controllers: [DelegatingItemController, ExtendedItemController, ScopedExtendedItemController, SubclassedItemController],
	imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [CustomItemEntity], logging: false, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature([CustomItemEntity]), ApiAuthorizationModule.forRoot({ principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) } } as never), ApiSubscriberModule],
	providers: [
		CustomAuthGuard,
		CustomItemPolicy,
		CustomItemSubscriber,
		DelegatingItemService,
		ExtendedItemService,
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
					save: async (...parameters: Array<never>): Promise<unknown> => await Reflect.apply(repository.save, repository, parameters),
					get target(): Repository<CustomItemEntity>["target"] {
						return repository.target;
					},
				};
			},
		},
	],
})
class CustomRepositoryModule {}

describe("Generated CREATE on a custom repository (E2E)", () => {
	let app: INestApplication;
	let items: Repository<CustomItemEntity>;

	const post = async (path: string, tenantId: string): Promise<number> => {
		const response = await app
			.getHttpAdapter()
			.getInstance()
			.inject({ method: "POST", payload: { tenantId }, url: `/${path}` });

		return response.statusCode;
	};

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({ imports: [CustomRepositoryModule] }).compile();

		app = moduleRef.createNestApplication(new FastifyAdapter());
		await app.init();
		await app.getHttpAdapter().getInstance().ready();
		items = moduleRef.get(DataSource).getRepository(CustomItemEntity);
	});

	afterAll(async () => {
		await app.close();
	});

	beforeEach(async () => {
		await items.clear();
		calls.findOne = 0;
		calls.save = 0;
		seen.create = undefined;
		seen.get = undefined;
	});

	it("runs a save override of an extended repository exactly once", async () => {
		expect(await post("custom-extended", IN_SCOPE)).toBe(201);
		expect(calls.save).toBe(1);
		expect(await items.count()).toBe(1);
	});

	it("runs a read override of an extended repository in the post-create read", async () => {
		expect(await post("custom-extended", IN_SCOPE)).toBe(201);
		expect(calls.findOne).toBeGreaterThan(0);
	});

	it("gives subscribers the members of an extended repository", async () => {
		expect(await post("custom-extended", IN_SCOPE)).toBe(201);
		expect(seen).toEqual({ create: "custom", get: "custom" });
	});

	it("runs the override inside the transaction, so a refused row is rolled back", async () => {
		expect(await post("custom-scoped", OUT_OF_SCOPE)).toBe(403);
		expect(calls.save).toBe(1);
		expect(await items.count()).toBe(0);
	});

	it("runs a save override of a repository subclass exactly once", async () => {
		expect(await post("custom-subclassed", IN_SCOPE)).toBe(201);
		expect(calls.save).toBe(1);
		expect(await items.count()).toBe(1);
	});

	it("keeps working on a delegating object that is not a repository", async () => {
		expect(await post("custom-delegating", IN_SCOPE)).toBe(201);
		expect(await items.count()).toBe(1);
	});
});
