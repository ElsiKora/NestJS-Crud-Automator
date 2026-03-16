import "reflect-metadata";

import type { CanActivate, ExecutionContext, INestApplication } from "@nestjs/common";
import type { IApiAuthorizationModuleOptionsFactory, IApiAuthorizationPrincipal, IApiAuthorizationPrincipalResolver, IApiHookPermissionSource } from "../../dist/esm/index";

import { Controller, Get, Injectable, Module, Req, UseGuards } from "@nestjs/common";
import { MODULE_METADATA } from "@nestjs/common/constants";
import { DiscoveryModule } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { Entity, PrimaryColumn } from "typeorm";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
	ApiAuthorizationBootstrapValidationService,
	ApiAuthorizationEngine,
	ApiAuthorizationGuard,
	ApiAuthorizationModule,
	ApiAuthorizationPolicy,
	ApiAuthorizationPolicyBase,
	ApiAuthorizationPolicyDiscoveryService,
	ApiAuthorizationPolicyRegistry,
	ApiAuthorizationRuntime,
	ApiAuthorizationSimulator,
	ApiControllerSecurable,
	ApiSubscriberDiscoveryService,
	ApiSubscriberModule,
	AUTHORIZATION_HOOK_PERMISSION_SOURCES_TOKEN,
	AUTHORIZATION_MODULE_OPTIONS_TOKEN,
	AUTHORIZATION_POLICY_REGISTRY_TOKEN,
	AUTHORIZATION_PRINCIPAL_RESOLVER_TOKEN,
	CONTROLLER_API_DECORATOR_CONSTANT,
	EApiAuthorizationMode,
	EApiAuthorizationPrincipalType,
	METHOD_API_DECORATOR_CONSTANT,
} from "../../dist/esm/index";

@Entity("cross_module_entities")
class CrossModuleEntity {
	@PrimaryColumn({ type: "varchar" })
	public id!: string;
}

type TCrossModuleRequest = {
	authorizationDecision?: {
		permissions?: Array<string>;
		principal?: {
			id?: string;
		};
	};
	user?: unknown;
};

const crossModulePrincipal = {
	attributes: {
		operatorId: "operator-1",
	},
	id: "custom-user",
	permissions: ["admin.item.read"],
	roles: ["operator-admin"],
};

function resolveCrossModulePrincipal(user: unknown): IApiAuthorizationPrincipal {
	const record = user as {
		access?: { permissions?: Array<string>; roles?: Array<string> };
		actor?: { id?: string; operatorId?: string };
	};

	return {
		attributes: {
			operatorId: record.actor?.operatorId,
		},
		claims: {
			permissions: record.access?.permissions ?? [],
		},
		id: record.actor?.id ?? "anonymous",
		roles: record.access?.roles ?? [],
		type: EApiAuthorizationPrincipalType.USER,
	};
}

@Injectable()
class CrossModuleRequestUserGuard implements CanActivate {
	public canActivate(context: ExecutionContext): boolean {
		const request = context.switchToHttp().getRequest<TCrossModuleRequest>();

		request.user = {
			access: {
				permissions: crossModulePrincipal.permissions,
				roles: crossModulePrincipal.roles,
			},
			actor: {
				id: crossModulePrincipal.id,
				operatorId: crossModulePrincipal.attributes.operatorId,
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
	public get(@Req() request: TCrossModuleRequest): { permissions: Array<string>; principalId: string | null } {
		return {
			permissions: request.authorizationDecision?.permissions ?? [],
			principalId: request.authorizationDecision?.principal?.id ?? null,
		};
	}
}

Reflect.defineMetadata(METHOD_API_DECORATOR_CONSTANT.AUTHORIZATION_METADATA_KEY, { action: "get" }, CrossModuleFeatureController.prototype.get);

Reflect.defineMetadata(CONTROLLER_API_DECORATOR_CONSTANT.ENTITY_METADATA_KEY, CrossModuleEntity, CrossModuleFeatureController);
Reflect.defineMetadata(
	CONTROLLER_API_DECORATOR_CONSTANT.PROPERTIES_METADATA_KEY,
	{
		authorization: {
			defaultMode: EApiAuthorizationMode.HOOKS,
		},
		entity: CrossModuleEntity,
		routes: {
			delete: { isEnabled: false },
			get: { authorization: { mode: EApiAuthorizationMode.HOOKS } },
			getList: { isEnabled: false },
			create: { isEnabled: false },
			partialUpdate: { isEnabled: false },
			update: { isEnabled: false },
		},
	},
	CrossModuleFeatureController,
);

@ApiAuthorizationPolicy({ entity: CrossModuleEntity })
class CrossModulePolicy extends ApiAuthorizationPolicyBase<CrossModuleEntity> {
	public getCustomActionRule(action: string) {
		if (action === "get") {
			return this.allowForPermissions(["admin.item.read"]);
		}

		return [];
	}
}

@Module({
	controllers: [CrossModuleFeatureController],
	providers: [CrossModulePolicy, CrossModuleRequestUserGuard],
})
class CrossModuleFeatureModule {}

@Injectable()
class CrossModuleAsyncPrincipalResolver implements IApiAuthorizationPrincipalResolver {
	public resolve(user: unknown): IApiAuthorizationPrincipal {
		return resolveCrossModulePrincipal(user);
	}
}

@Injectable()
class CrossModuleAsyncHookPermissionSource implements IApiHookPermissionSource {
	public async getPermissions(principal: IApiAuthorizationPrincipal): Promise<ReadonlyArray<string>> {
		const permissions = principal.claims?.permissions;

		return Array.isArray(permissions) ? permissions.filter((permission: unknown): permission is string => typeof permission === "string") : [];
	}
}

@Injectable()
class CrossModuleAuthorizationOptionsFactory implements IApiAuthorizationModuleOptionsFactory {
	public constructor(
		private readonly hookPermissionSource: CrossModuleAsyncHookPermissionSource,
		private readonly principalResolver: CrossModuleAsyncPrincipalResolver,
	) {}

	public createApiAuthorizationModuleOptions() {
		return {
			hookPermissionSources: [this.hookPermissionSource],
			principalResolver: this.principalResolver,
		};
	}
}

@Module({
	exports: [CrossModuleAsyncHookPermissionSource, CrossModuleAsyncPrincipalResolver, CrossModuleAuthorizationOptionsFactory],
	providers: [CrossModuleAsyncHookPermissionSource, CrossModuleAsyncPrincipalResolver, CrossModuleAuthorizationOptionsFactory],
})
class CrossModuleAsyncProvidersModule {}

describe("Module metadata (E2E)", () => {
	it("makes the custom principal resolver available to guards used in imported feature modules", async () => {
		const principalResolver = {
			resolve: vi.fn().mockImplementation((user: unknown) => {
				const record = user as {
					access?: { permissions?: Array<string>; roles?: Array<string> };
					actor?: { id?: string; operatorId?: string };
				};

				return {
					attributes: {
						operatorId: record.actor?.operatorId,
					},
					claims: {
						permissions: record.access?.permissions ?? [],
					},
					id: record.actor?.id ?? "anonymous",
					roles: record.access?.roles ?? [],
					type: EApiAuthorizationPrincipalType.USER,
				};
			}),
		};
		const hookPermissionSource: IApiHookPermissionSource = {
			async getPermissions(principal: IApiAuthorizationPrincipal): Promise<ReadonlyArray<string>> {
				const permissions = principal.claims?.permissions;

				return Array.isArray(permissions) ? permissions.filter((permission: unknown): permission is string => typeof permission === "string") : [];
			},
		};
		@Module({
			imports: [
				ApiAuthorizationModule.forRoot({
					hookPermissionSources: [hookPermissionSource],
					principalResolver,
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
			permissions: crossModulePrincipal.permissions,
			principalId: crossModulePrincipal.id,
		});
		expect(principalResolver.resolve).toHaveBeenCalledOnce();

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

		expect(providers).toEqual(expect.arrayContaining([ApiAuthorizationBootstrapValidationService, ApiAuthorizationEngine, ApiAuthorizationGuard, ApiAuthorizationPolicyDiscoveryService, ApiAuthorizationRuntime, ApiAuthorizationSimulator]));
		expect(providers.some((provider: any) => provider?.provide === AUTHORIZATION_POLICY_REGISTRY_TOKEN)).toBe(true);
		expect(providers.some((provider: any) => provider?.provide === ApiAuthorizationPolicyRegistry)).toBe(true);
		expect(exportsList).toEqual(expect.arrayContaining([AUTHORIZATION_POLICY_REGISTRY_TOKEN, ApiAuthorizationBootstrapValidationService, ApiAuthorizationEngine, ApiAuthorizationGuard, ApiAuthorizationPolicyDiscoveryService, ApiAuthorizationRuntime, ApiAuthorizationSimulator]));
		expect(imports).toEqual(expect.arrayContaining([DiscoveryModule]));
	});

	it("registers a custom principal resolver through ApiAuthorizationModule.forRoot", () => {
		const hookPermissionSources: Array<IApiHookPermissionSource> = [
			{
				async getPermissions(): Promise<ReadonlyArray<string>> {
					return [];
				},
			},
		];
		const dynamicModule = ApiAuthorizationModule.forRoot({
			hookPermissionSources,
			principalResolver: {
				resolve: () => ({
					attributes: {},
					id: "custom-user",
					roles: [],
					type: EApiAuthorizationPrincipalType.USER,
				}),
			},
		});

		expect(dynamicModule.providers?.some((provider: any) => provider?.provide === AUTHORIZATION_PRINCIPAL_RESOLVER_TOKEN)).toBe(true);
		expect(dynamicModule.providers?.some((provider: any) => provider?.provide === AUTHORIZATION_HOOK_PERMISSION_SOURCES_TOKEN)).toBe(true);
		expect(dynamicModule.exports).toEqual(expect.arrayContaining([AUTHORIZATION_PRINCIPAL_RESOLVER_TOKEN, AUTHORIZATION_HOOK_PERMISSION_SOURCES_TOKEN]));
		expect(dynamicModule.global).toBe(true);
	});

	it("registers async authorization providers through ApiAuthorizationModule.forRootAsync", () => {
		const dynamicModule = ApiAuthorizationModule.forRootAsync({
			useFactory: () => ({}),
		});

		expect(dynamicModule.providers?.some((provider: any) => provider?.provide === AUTHORIZATION_MODULE_OPTIONS_TOKEN)).toBe(true);
		expect(dynamicModule.providers?.some((provider: any) => provider?.provide === AUTHORIZATION_PRINCIPAL_RESOLVER_TOKEN)).toBe(true);
		expect(dynamicModule.providers?.some((provider: any) => provider?.provide === AUTHORIZATION_HOOK_PERMISSION_SOURCES_TOKEN)).toBe(true);
		expect(dynamicModule.exports).toEqual(expect.arrayContaining([AUTHORIZATION_PRINCIPAL_RESOLVER_TOKEN, AUTHORIZATION_HOOK_PERMISSION_SOURCES_TOKEN]));
		expect(dynamicModule.global).toBe(true);
	});

	it("injects the custom principal resolver into the DI container when registered through forRoot", async () => {
		const principalResolver = {
			resolve: vi.fn().mockReturnValue({
				attributes: { operatorId: "operator-1" },
				id: "custom-user",
				roles: ["operator-admin"],
				type: EApiAuthorizationPrincipalType.USER,
			}),
		};
		const moduleRef = await Test.createTestingModule({
			imports: [
				ApiAuthorizationModule.forRoot({
					hookPermissionSources: [
						{
							async getPermissions(): Promise<ReadonlyArray<string>> {
								return ["admin.item.read"];
							},
						},
					],
					principalResolver,
				}),
			],
		}).compile();

		expect(moduleRef.get(AUTHORIZATION_PRINCIPAL_RESOLVER_TOKEN)).toBe(principalResolver);

		await moduleRef.close();
	});

	it("injects custom authorization providers through forRootAsync useFactory", async () => {
		@Module({
			imports: [
				ApiAuthorizationModule.forRootAsync({
					imports: [CrossModuleAsyncProvidersModule],
					inject: [CrossModuleAsyncHookPermissionSource, CrossModuleAsyncPrincipalResolver],
					useFactory: (hookPermissionSource: CrossModuleAsyncHookPermissionSource, principalResolver: CrossModuleAsyncPrincipalResolver) => ({
						hookPermissionSources: [hookPermissionSource],
						principalResolver,
					}),
				}),
				CrossModuleFeatureModule,
			],
		})
		class CrossModuleAsyncFactoryAppModule {}

		const moduleRef = await Test.createTestingModule({
			imports: [CrossModuleAsyncFactoryAppModule],
		}).compile();
		const app: INestApplication = moduleRef.createNestApplication(new FastifyAdapter());
		const fastify = app.getHttpAdapter().getInstance() as {
			inject: (options: { method: string; url: string }) => Promise<{ json: () => Record<string, unknown>; statusCode: number }>;
		};

		await app.init();

		expect(moduleRef.get(AUTHORIZATION_PRINCIPAL_RESOLVER_TOKEN)).toBe(moduleRef.get(CrossModuleAsyncPrincipalResolver));
		expect(moduleRef.get(AUTHORIZATION_HOOK_PERMISSION_SOURCES_TOKEN)).toEqual([moduleRef.get(CrossModuleAsyncHookPermissionSource)]);

		const response = await fastify.inject({
			method: "GET",
			url: "/cross-module-auth",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
			permissions: crossModulePrincipal.permissions,
			principalId: crossModulePrincipal.id,
		});

		app.get(ApiAuthorizationPolicyRegistry).clear();
		await app.close();
	});

	it("injects custom authorization providers through forRootAsync useClass", async () => {
		@Module({
			imports: [
				ApiAuthorizationModule.forRootAsync({
					imports: [CrossModuleAsyncProvidersModule],
					useClass: CrossModuleAuthorizationOptionsFactory,
				}),
				CrossModuleFeatureModule,
			],
		})
		class CrossModuleAsyncClassAppModule {}

		const moduleRef = await Test.createTestingModule({
			imports: [CrossModuleAsyncClassAppModule],
		}).compile();
		const app: INestApplication = moduleRef.createNestApplication(new FastifyAdapter());
		const fastify = app.getHttpAdapter().getInstance() as {
			inject: (options: { method: string; url: string }) => Promise<{ json: () => Record<string, unknown>; statusCode: number }>;
		};

		await app.init();

		expect(moduleRef.get(AUTHORIZATION_PRINCIPAL_RESOLVER_TOKEN)).toBeInstanceOf(CrossModuleAsyncPrincipalResolver);
		expect(moduleRef.get(AUTHORIZATION_HOOK_PERMISSION_SOURCES_TOKEN)).toHaveLength(1);

		const response = await fastify.inject({
			method: "GET",
			url: "/cross-module-auth",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
			permissions: crossModulePrincipal.permissions,
			principalId: crossModulePrincipal.id,
		});

		app.get(ApiAuthorizationPolicyRegistry).clear();
		await app.close();
	});

	it("injects custom authorization providers through forRootAsync useExisting", async () => {
		@Module({
			imports: [
				CrossModuleAsyncProvidersModule,
				ApiAuthorizationModule.forRootAsync({
					imports: [CrossModuleAsyncProvidersModule],
					useExisting: CrossModuleAuthorizationOptionsFactory,
				}),
				CrossModuleFeatureModule,
			],
		})
		class CrossModuleAsyncExistingAppModule {}

		const moduleRef = await Test.createTestingModule({
			imports: [CrossModuleAsyncExistingAppModule],
		}).compile();
		const app: INestApplication = moduleRef.createNestApplication(new FastifyAdapter());
		const fastify = app.getHttpAdapter().getInstance() as {
			inject: (options: { method: string; url: string }) => Promise<{ json: () => Record<string, unknown>; statusCode: number }>;
		};

		await app.init();

		expect(moduleRef.get(AUTHORIZATION_PRINCIPAL_RESOLVER_TOKEN)).toBe(moduleRef.get(CrossModuleAsyncPrincipalResolver));
		expect(moduleRef.get(AUTHORIZATION_HOOK_PERMISSION_SOURCES_TOKEN)).toEqual([moduleRef.get(CrossModuleAsyncHookPermissionSource)]);

		const response = await fastify.inject({
			method: "GET",
			url: "/cross-module-auth",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
			permissions: crossModulePrincipal.permissions,
			principalId: crossModulePrincipal.id,
		});

		app.get(ApiAuthorizationPolicyRegistry).clear();
		await app.close();
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
