import "reflect-metadata";

import type { ExecutionContext, INestApplication } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { Repository } from "typeorm";

import { Inject, Injectable, Module } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { InjectRepository, getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { Column, Entity, PrimaryColumn } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiAuthorizationPolicy, ApiAuthorizationPolicyBase, ApiController, ApiControllerSecurable, ApiPropertyDescribe, ApiService, ApiServiceBase, ApiSubscriberModule, AuthorizationResolveDefaultPrincipal, EApiAuthenticationType, EApiAuthorizationMode, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

const IN_SCOPE: string = "scope-in";
const OUT_OF_SCOPE: string = "scope-out";

function describeString(description: string): PropertyDecorator {
	return ApiPropertyDescribe({ description, exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING });
}

// SQLite stores the key as "YYYY-MM-DD HH:MM:SS.SSS" text, while the create result still holds the ISO text of the body.
@Entity("create_identity_sqlite_events")
class BodyDateTimeKeyEntity {
	@PrimaryColumn({ type: "varchar" })
	@describeString("id")
	public id!: string;

	@PrimaryColumn({ type: "datetime" })
	@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE } as never)
	public at!: Date;

	@Column({ type: "varchar" })
	@describeString("tenantId")
	public tenantId!: string;
}

@Injectable()
@ApiService({ entity: BodyDateTimeKeyEntity })
class BodyDateTimeKeyService extends ApiServiceBase<BodyDateTimeKeyEntity> {
	@InjectRepository(BodyDateTimeKeyEntity)
	public readonly repository!: Repository<BodyDateTimeKeyEntity>;
}

@Injectable()
class IdentityAuthGuard implements IAuthGuard {
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
@ApiAuthorizationPolicy({ entity: BodyDateTimeKeyEntity })
class BodyDateTimeKeyPolicy extends ApiAuthorizationPolicyBase<BodyDateTimeKeyEntity> {
	public onBeforeCreate() {
		return this.allow({ scope: () => ({ where: { tenantId: IN_SCOPE } as never }) });
	}
}

const disabledRoutes = {
	[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
	[EApiRouteType.GET]: { generation: { isEnabled: false } },
	[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
	[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
	[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
};

@ApiControllerSecurable()
@ApiController<BodyDateTimeKeyEntity>({
	authorization: {
		defaultMode: EApiAuthorizationMode.HOOKS,
		policyNamespace: "create-identity-sqlite:event",
		resourceDefinition: { entity: BodyDateTimeKeyEntity, fields: [{ isFilterable: true, path: "resource.tenantId", queryPath: "tenantId" }], namespace: "create-identity-sqlite:event", resourcePath: "create-identity-sqlite:event/{id}", resourceType: "create-identity-sqlite:event" },
	},
	entity: BodyDateTimeKeyEntity,
	name: "create-identity-sqlite",
	path: "create-identity-sqlite",
	routes: { [EApiRouteType.CREATE]: { security: { authentication: { guard: IdentityAuthGuard, type: EApiAuthenticationType.USER } } }, ...disabledRoutes },
})
class ScopedBodyDateTimeKeyController {
	@Inject(BodyDateTimeKeyService)
	public readonly service!: BodyDateTimeKeyService;
}

@ApiController<BodyDateTimeKeyEntity>({ entity: BodyDateTimeKeyEntity, name: "create-identity-sqlite-open", path: "create-identity-sqlite-open", routes: { [EApiRouteType.CREATE]: {}, ...disabledRoutes } })
class OpenBodyDateTimeKeyController {
	@Inject(BodyDateTimeKeyService)
	public readonly service!: BodyDateTimeKeyService;
}

describe("Generated CREATE identity on SQLite (E2E)", () => {
	let app: INestApplication;
	let events: Repository<BodyDateTimeKeyEntity>;
	let fastify: { inject: (options: { method: string; payload?: unknown; url: string }) => Promise<{ statusCode: number }> };

	beforeAll(async () => {
		@Module({
			controllers: [ScopedBodyDateTimeKeyController, OpenBodyDateTimeKeyController],
			imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities: [BodyDateTimeKeyEntity], logging: false, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature([BodyDateTimeKeyEntity]), ApiAuthorizationModule.forRoot({ principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user) } }), ApiSubscriberModule],
			providers: [BodyDateTimeKeyPolicy, BodyDateTimeKeyService, IdentityAuthGuard],
		})
		class IdentityModule {}

		const moduleRef = await Test.createTestingModule({ imports: [IdentityModule] }).compile();

		app = moduleRef.createNestApplication(new FastifyAdapter());
		await app.init();
		fastify = app.getHttpAdapter().getInstance() as typeof fastify;
		events = app.get(getRepositoryToken(BodyDateTimeKeyEntity));
	}, 60_000);

	beforeEach(async () => {
		await events.clear();
	});

	afterAll(async () => {
		await app?.close();
	});

	it.each([
		["a scoped in-scope", "create-identity-sqlite", IN_SCOPE, 201],
		["a scoped out-of-scope", "create-identity-sqlite", OUT_OF_SCOPE, 403],
		["a non-scoped", "create-identity-sqlite-open", IN_SCOPE, 201],
	])("answers a datetime key from the body on %s request", async (_name: string, path: string, tenantId: string, status: number) => {
		const response = await fastify.inject({ method: "POST", payload: { at: "2024-01-02T03:04:05.678Z", id: "event-1", tenantId }, url: `/${path}` });

		expect(response.statusCode).toBe(status);
		expect(await events.count()).toBe(status === 201 ? 1 : 0);
	});
});
