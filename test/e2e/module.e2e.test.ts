import "reflect-metadata";

import type { CanActivate, ExecutionContext, INestApplication } from "@nestjs/common";

import { Controller, Get, Injectable, Module, Req, UseGuards } from "@nestjs/common";
import { MODULE_METADATA } from "@nestjs/common/constants";
import { DiscoveryModule } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { Entity, PrimaryColumn } from "typeorm";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiAuthorizationEngine, ApiAuthorizationGuard, ApiAuthorizationModule, ApiAuthorizationPolicy, ApiAuthorizationPolicyBase, ApiAuthorizationPolicyDiscoveryService, ApiAuthorizationPolicyRegistry, ApiControllerSecurable, ApiSubscriberDiscoveryService, ApiSubscriberModule, AUTHORIZATION_POLICY_REGISTRY_TOKEN, AUTHORIZATION_SUBJECT_RESOLVER_TOKEN, CONTROLLER_API_DECORATOR_CONSTANT } from "../../dist/esm/index";

@Entity("cross_module_entities")
class CrossModuleEntity {
	@PrimaryColumn({ type: "varchar" })
	public id!: string;
}

type TCrossModuleRequest = {
	authorizationDecision?: {
		subject?: {
			id?: string;
			permissions?: Array<string>;
		};
	};
	user?: unknown;
};

const crossModuleSubject = {
	attributes: {
		operatorId: "operator-1",
	},
	id: "custom-user",
	permissions: ["admin.item.read"],
	roles: ["operator-admin"],
};

@Injectable()
class CrossModuleRequestUserGuard implements CanActivate {
	public canActivate(context: ExecutionContext): boolean {
		const request = context.switchToHttp().getRequest<TCrossModuleRequest>();

		request.user = {
			access: {
				permissions: crossModuleSubject.permissions,
				roles: crossModuleSubject.roles,
			},
			actor: {
				id: crossModuleSubject.id,
				operatorId: crossModuleSubject.attributes.operatorId,
			},
		};

		return true;
	}
}

@ApiControllerSecurable()
@Controller("cross-module-auth")
@UseGuards(CrossModuleRequestUserGuard, ApiAuthorizationGuard)
class CrossModuleFeatureController {
	@Get()
	public get(@Req() request: TCrossModuleRequest): { permissions: Array<string>; subjectId: string | null } {
		return {
			permissions: request.authorizationDecision?.subject?.permissions ?? [],
			subjectId: request.authorizationDecision?.subject?.id ?? null,
		};
	}
}

Reflect.defineMetadata(CONTROLLER_API_DECORATOR_CONSTANT.ENTITY_METADATA_KEY, CrossModuleEntity, CrossModuleFeatureController);

@ApiAuthorizationPolicy({ entity: CrossModuleEntity })
class CrossModulePolicy extends ApiAuthorizationPolicyBase<CrossModuleEntity> {
	public onBeforeGet() {
		return this.allowForPermissions(["admin.item.read"]);
	}
}

@Module({
	controllers: [CrossModuleFeatureController],
	providers: [CrossModulePolicy, CrossModuleRequestUserGuard],
})
class CrossModuleFeatureModule {}

describe("Module metadata (E2E)", () => {
	it("makes the custom subject resolver available to guards used in imported feature modules", async () => {
		const subjectResolver = {
			resolve: vi.fn().mockImplementation((user: unknown) => {
				const record = user as {
					access?: { permissions?: Array<string>; roles?: Array<string> };
					actor?: { id?: string; operatorId?: string };
				};

				return {
					attributes: {
						operatorId: record.actor?.operatorId,
					},
					id: record.actor?.id ?? "anonymous",
					permissions: record.access?.permissions ?? [],
					roles: record.access?.roles ?? [],
				};
			}),
		};
		@Module({
			imports: [
				ApiAuthorizationModule.forRoot({
					subjectResolver,
				}),
				CrossModuleFeatureModule,
			],
		})
		class CrossModuleAppModule {}

		const moduleRef = await Test.createTestingModule({
			imports: [CrossModuleAppModule],
		}).compile();
		const app: INestApplication = moduleRef.createNestApplication(new FastifyAdapter());
		const fastify = app.getHttpAdapter().getInstance() as {
			inject: (options: { method: string; url: string }) => Promise<{ json: () => Record<string, unknown>; statusCode: number }>;
		};

		await app.init();

		const response = await fastify.inject({
			method: "GET",
			url: "/cross-module-auth",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
			permissions: crossModuleSubject.permissions,
			subjectId: crossModuleSubject.id,
		});
		expect(subjectResolver.resolve).toHaveBeenCalledOnce();
		expect((app.get(ApiAuthorizationGuard) as unknown as { subjectResolver?: unknown }).subjectResolver).toBe(subjectResolver);

		app.get(ApiAuthorizationPolicyRegistry).clear();
		await app.close();
	});
});

describe("Module metadata (E2E)", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("exposes providers and exports for ApiAuthorizationModule", () => {
		const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, ApiAuthorizationModule) as Array<unknown>;
		const exportsList = Reflect.getMetadata(MODULE_METADATA.EXPORTS, ApiAuthorizationModule) as Array<unknown>;
		const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, ApiAuthorizationModule) as Array<unknown>;

		expect(providers).toEqual(expect.arrayContaining([ApiAuthorizationEngine, ApiAuthorizationGuard, ApiAuthorizationPolicyDiscoveryService]));
		expect(providers.some((provider: any) => provider?.provide === AUTHORIZATION_POLICY_REGISTRY_TOKEN)).toBe(true);
		expect(providers.some((provider: any) => provider?.provide === ApiAuthorizationPolicyRegistry)).toBe(true);
		expect(exportsList).toEqual(expect.arrayContaining([AUTHORIZATION_POLICY_REGISTRY_TOKEN, ApiAuthorizationEngine, ApiAuthorizationGuard, ApiAuthorizationPolicyDiscoveryService]));
		expect(imports).toEqual(expect.arrayContaining([DiscoveryModule]));
	});

	it("registers a custom subject resolver through ApiAuthorizationModule.forRoot", () => {
		const dynamicModule = ApiAuthorizationModule.forRoot({
			subjectResolver: {
				resolve: () => ({
					attributes: {},
					id: "custom-user",
					permissions: [],
					roles: [],
				}),
			},
		});

		expect(dynamicModule.providers?.some((provider: any) => provider?.provide === AUTHORIZATION_SUBJECT_RESOLVER_TOKEN)).toBe(true);
		expect(dynamicModule.exports).toEqual(expect.arrayContaining([AUTHORIZATION_SUBJECT_RESOLVER_TOKEN]));
		expect(dynamicModule.global).toBe(true);
	});

	it("injects the custom subject resolver into ApiAuthorizationGuard when registered through forRoot", async () => {
		const subjectResolver = {
			resolve: vi.fn().mockReturnValue({
				attributes: { operatorId: "operator-1" },
				id: "custom-user",
				permissions: ["admin.item.read"],
				roles: ["operator-admin"],
			}),
		};
		const moduleRef = await Test.createTestingModule({
			imports: [
				ApiAuthorizationModule.forRoot({
					subjectResolver,
				}),
			],
		}).compile();

		expect(moduleRef.get(AUTHORIZATION_SUBJECT_RESOLVER_TOKEN)).toBe(subjectResolver);
		expect((moduleRef.get(ApiAuthorizationGuard) as unknown as { subjectResolver?: unknown }).subjectResolver).toBe(subjectResolver);

		await moduleRef.close();
	});

	it("exposes providers and exports for ApiSubscriberModule", () => {
		const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, ApiSubscriberModule) as Array<unknown>;
		const exportsList = Reflect.getMetadata(MODULE_METADATA.EXPORTS, ApiSubscriberModule) as Array<unknown>;
		const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, ApiSubscriberModule) as Array<unknown>;

		expect(providers).toEqual(expect.arrayContaining([ApiSubscriberDiscoveryService]));
		expect(exportsList).toEqual(expect.arrayContaining([ApiSubscriberDiscoveryService]));
		expect(imports).toEqual(expect.arrayContaining([DiscoveryModule]));
	});
});
