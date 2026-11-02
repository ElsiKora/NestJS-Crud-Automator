import "reflect-metadata";

import type { ExecutionContext, INestApplication } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { ValueTransformer } from "typeorm";

import { Inject, Injectable, Module } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { InjectRepository, getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { Column, Entity, PrimaryColumn, Repository } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiAuthorizationPolicy, ApiAuthorizationPolicyBase, ApiController, ApiControllerSecurable, ApiPropertyDescribe, ApiService, ApiServiceBase, ApiSubscriberModule, AuthorizationResolveDefaultPrincipal, EApiAuthenticationType, EApiAuthorizationMode, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

const IN_SCOPE: string = "tenant-1";
const OUT_OF_SCOPE: string = "tenant-2";

const upperCaseTransformer: ValueTransformer = {
	from: (value: unknown): unknown => value,
	to: (value: unknown): unknown => (typeof value === "string" ? value.toUpperCase() : value),
};

const describeString: PropertyDecorator = ApiPropertyDescribe({ description: "text", exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING });

@Entity("create_scope_transformed_items")
class CreateScopeTransformedItemEntity {
	@Column({ transformer: upperCaseTransformer, type: "varchar" })
	@describeString
	public code!: string;

	@PrimaryColumn({ type: "varchar" })
	@describeString
	public id!: string;

	@Column({ type: "varchar" })
	@describeString
	public tenantId!: string;
}

@Injectable()
@ApiService({ entity: CreateScopeTransformedItemEntity })
class CreateScopeTransformedItemService extends ApiServiceBase<CreateScopeTransformedItemEntity> {
	@InjectRepository(CreateScopeTransformedItemEntity)
	public readonly repository!: Repository<CreateScopeTransformedItemEntity>;
}

@Injectable()
@ApiAuthorizationPolicy({ entity: CreateScopeTransformedItemEntity })
class CreateScopeTransformedItemPolicy extends ApiAuthorizationPolicyBase<CreateScopeTransformedItemEntity> {
	public static where: object = { tenantId: IN_SCOPE };

	public onBeforeCreate() {
		return this.allow({ scope: () => ({ where: CreateScopeTransformedItemPolicy.where as never }) });
	}
}

@Injectable()
class CreateScopeTransformedAuthGuard implements IAuthGuard {
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

const disabled = { generation: { isEnabled: false } };

@ApiControllerSecurable()
@ApiController<CreateScopeTransformedItemEntity>({
	authorization: { defaultMode: EApiAuthorizationMode.HOOKS, policyNamespace: "create-scope-transformed", resourceDefinition: { entity: CreateScopeTransformedItemEntity, fields: [{ isFilterable: true, path: "resource.tenantId", queryPath: "tenantId" }], namespace: "create-scope-transformed", type: "item" } },
	entity: CreateScopeTransformedItemEntity,
	name: "create-scope-transformed",
	path: "create-scope-transformed",
	routes: {
		[EApiRouteType.CREATE]: { security: { authentication: { guard: CreateScopeTransformedAuthGuard, type: EApiAuthenticationType.USER } } },
		[EApiRouteType.DELETE]: disabled,
		[EApiRouteType.GET]: disabled,
		[EApiRouteType.GET_LIST]: disabled,
		[EApiRouteType.PARTIAL_UPDATE]: disabled,
		[EApiRouteType.UPDATE]: disabled,
	},
} as never)
class CreateScopeTransformedItemController {
	@Inject(CreateScopeTransformedItemService)
	public readonly service!: CreateScopeTransformedItemService;
}

@Module({
	controllers: [CreateScopeTransformedItemController],
	imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [CreateScopeTransformedItemEntity], logging: false, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature([CreateScopeTransformedItemEntity]), ApiAuthorizationModule.forRoot({ principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) } } as never), ApiSubscriberModule],
	providers: [CreateScopeTransformedAuthGuard, CreateScopeTransformedItemPolicy, CreateScopeTransformedItemService],
})
class CreateScopeTransformedAppModule {}

describe("Generated CREATE scope on an entity with a transformer column (E2E)", () => {
	let app: INestApplication;
	let fastify: { inject: (options: { method: string; payload?: unknown; url: string }) => Promise<{ statusCode: number }> };
	let repository: Repository<CreateScopeTransformedItemEntity>;

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({ imports: [CreateScopeTransformedAppModule] }).compile();

		app = moduleRef.createNestApplication(new FastifyAdapter());
		await app.init();
		fastify = app.getHttpAdapter().getInstance() as typeof fastify;
		repository = app.get(getRepositoryToken(CreateScopeTransformedItemEntity));
	});

	beforeEach(async () => {
		await repository.clear();
		CreateScopeTransformedItemPolicy.where = { tenantId: IN_SCOPE };
	});

	afterAll(async () => {
		await app.close();
	});

	it("creates a row inside the scope", async () => {
		const response = await fastify.inject({ method: "POST", payload: { code: "abc", id: "in", tenantId: IN_SCOPE }, url: "/create-scope-transformed" });

		expect(response.statusCode).toBe(201);
		expect(await repository.find()).toEqual([expect.objectContaining({ code: "ABC", id: "in" })]);
	});

	it("refuses a row outside the scope and leaves nothing", async () => {
		const response = await fastify.inject({ method: "POST", payload: { code: "abc", id: "out", tenantId: OUT_OF_SCOPE }, url: "/create-scope-transformed" });

		expect(response.statusCode).toBe(403);
		expect(await repository.count()).toBe(0);
	});

	it("checks a scope on the transformed column against its stored value", async () => {
		CreateScopeTransformedItemPolicy.where = { code: "abc" };

		const stored = await fastify.inject({ method: "POST", payload: { code: "abc", id: "in", tenantId: OUT_OF_SCOPE }, url: "/create-scope-transformed" });
		const refused = await fastify.inject({ method: "POST", payload: { code: "xyz", id: "out", tenantId: OUT_OF_SCOPE }, url: "/create-scope-transformed" });

		expect([stored.statusCode, refused.statusCode]).toEqual([201, 403]);
		expect((await repository.find()).map((row: CreateScopeTransformedItemEntity): string => row.id)).toEqual(["in"]);
	});
});
