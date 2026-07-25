import "reflect-metadata";

import type { EntityManager, Repository } from "typeorm";

import type {
	IApiAuthorizationPrincipal,
	IApiAuthorizationPrincipalResolver,
	IApiAuthorizationModuleOptions,
	IApiAuthorizationRequestMetadata,
	IApiAuthorizationRuleContext,
	IApiAuthorizationScope,
	IApiBaseEntity,
	IApiFunctionStepContext,
	IApiFunctionStepProperties,
	IApiSubscriberFunctionTransactionContext,
	IApiHookPermissionSource,
	IApiSubscriberFunctionExecutionContextData,
	TApiAuthorizationPolicyBeforeCreateContext,
	TApiAuthorizationPolicyBeforeCreateResult,
	TApiAuthorizationPolicyBeforeGetContext,
	TApiAuthorizationPolicyBeforeGetListContext,
	TApiAuthorizationPolicyBeforeGetListResult,
	TApiAuthorizationPolicyBeforeGetResult,
	TApiAuthorizationPolicyBeforePartialUpdateContext,
	TApiAuthorizationPolicyBeforePartialUpdateResult,
	TApiSubscriberFunctionBeforeCreateContext,
	TApiSubscriberFunctionExecutionContextData,
	TApiSubscriberRouteBeforeCreateContext,
	TApiFunctionTransactionEvent,
	TApiFunctionTransactionOwner,
	TApiGetDefaultStringFormatPropertiesBigIntStringOptions,
	TApiRouteDiscriminatedDtoProperties,
} from "../../src/index";

import {
	ApiAuthorizationPolicy,
	ApiAuthorizationPolicyBase,
	ApiFunctionStep,
	ApiFunctionTransactionCommitUnknownOutcomeException,
	ApiFunctionTransactionPostCommitException,
	ApiFunctionTransactionRollbackException,
	ApiFunctionTransactionScope,
	AUTHORIZATION_PRINCIPAL_RESOLVER_TOKEN,
	EApiAuthorizationMode,
	EApiAuthorizationPrincipalType,
	EApiFunctionContextStorageKind,
	EApiFunctionSubscriberTransactionExpectation,
	EApiFunctionTransactionEventStatus,
	EApiFunctionTransactionMode,
	EApiFunctionTransactionOutcome,
	EApiFunctionTransactionOwnerKind,
	EApiFunctionTransactionTraceType,
	EApiFunctionType,
	EApiGetDefaultStringFormatPropertiesBigIntStringSign,
	EApiPropertyStringType,
	EApiRouteSubscriberAuthorizationExpectation,
	EApiRouteType,
	GetDefaultStringFormatProperties,
} from "../../src/index";
import { describe, expect, it } from "vitest";

class PublicApiUser {
	public id!: string;

	public operator?: { id: string };

	public role?: string;
}

class PublicApiEmailBodyDto {}

class PublicApiStepService {
	@ApiFunctionStep<PublicApiUser>({
		entity: PublicApiUser,
		transaction: {
			mode: EApiFunctionTransactionMode.SUPPORTS,
		},
	})
	public async step(): Promise<void> {
		return await Promise.resolve();
	}
}

class PublicApiPrincipalResolver implements IApiAuthorizationPrincipalResolver {
	public resolve(user: unknown): IApiAuthorizationPrincipal {
		const record: { id?: string; operatorId?: string } = typeof user === "object" && user !== null ? (user as { id?: string; operatorId?: string }) : {};

		return {
			attributes: {
				operatorId: record.operatorId,
			},
			claims: {
				permissions: ["admin.user.create", "admin.user.list", "admin.user.read", "admin.user.update"],
			},
			id: record.id ?? "anonymous",
			roles: ["platform-admin"],
			type: EApiAuthorizationPrincipalType.USER,
		};
	}
}

const publicApiHookPermissionSource: IApiHookPermissionSource = {
	async getPermissions(principal: IApiAuthorizationPrincipal): Promise<ReadonlyArray<string>> {
		const permissions = principal.claims?.permissions;

		return Array.isArray(permissions) ? permissions.filter((permission: unknown): permission is string => typeof permission === "string") : [];
	},
};

@ApiAuthorizationPolicy<PublicApiUser>({ entity: PublicApiUser })
class PublicApiPolicy extends ApiAuthorizationPolicyBase<PublicApiUser> {
	public onBeforeCreate(context: TApiAuthorizationPolicyBeforeCreateContext<PublicApiUser>): TApiAuthorizationPolicyBeforeCreateResult<PublicApiUser> {
		return [
			...this.denyForPermissions(["admin.user.create"], {
				condition: () => context.body.role === "platform-admin",
				priority: 1000,
			}),
			...this.allowForPermissions(["admin.user.create"]),
		];
	}

	public onBeforeGet(_context: TApiAuthorizationPolicyBeforeGetContext<PublicApiUser>): TApiAuthorizationPolicyBeforeGetResult<PublicApiUser> {
		return [
			...this.allowForPermissions(["admin.user.read"], {
				scope: (ruleContext: IApiAuthorizationRuleContext<PublicApiUser>): IApiAuthorizationScope<PublicApiUser> => this.scopeToOperator(ruleContext),
			}),
		];
	}

	public onBeforeGetList(_context: TApiAuthorizationPolicyBeforeGetListContext<PublicApiUser>): TApiAuthorizationPolicyBeforeGetListResult<PublicApiUser> {
		return [...this.allowForPermissions(["admin.user.list"])];
	}

	public onBeforePartialUpdate(context: TApiAuthorizationPolicyBeforePartialUpdateContext<PublicApiUser>): TApiAuthorizationPolicyBeforePartialUpdateResult<PublicApiUser> {
		return [
			...this.denyForPermissions(["admin.user.update"], {
				condition: () => context.body.role === "platform-admin",
				priority: 1000,
			}),
			...this.allowForPermissions(["admin.user.update"]),
		];
	}

	private scopeToOperator(ruleContext: IApiAuthorizationRuleContext<PublicApiUser>): IApiAuthorizationScope<PublicApiUser> {
		const operatorId: unknown = ruleContext.principal.attributes?.operatorId;

		if (typeof operatorId !== "string" || operatorId.length === 0) {
			throw new TypeError("operatorId is required");
		}

		return {
			where: {
				operator: {
					id: operatorId,
				},
			},
		};
	}
}

describe("public API exports (E2E)", () => {
	it("keeps payload-aware authorization and subscriber transaction types available from built dist", async () => {
		const principalResolver: IApiAuthorizationPrincipalResolver = new PublicApiPrincipalResolver();
		const moduleOptions: IApiAuthorizationModuleOptions = {
			hookPermissionSources: [publicApiHookPermissionSource],
			principalResolver,
		};
		const requestMetadata: IApiAuthorizationRequestMetadata<PublicApiUser> = {
			body: {
				role: "operator-user",
			},
			headers: {
				"x-request-id": "req-1",
			},
			ip: "127.0.0.1",
			parameters: {
				id: "user-1",
			},
		};
		const routeDiscriminatorConfig: TApiRouteDiscriminatedDtoProperties = {
			discriminator: {
				mapping: {
					email: PublicApiEmailBodyDto,
				},
				propertyName: "channel",
			},
			type: [PublicApiEmailBodyDto],
		};
		const bigintStringOptions: TApiGetDefaultStringFormatPropertiesBigIntStringOptions = {
			sign: EApiGetDefaultStringFormatPropertiesBigIntStringSign.UNSIGNED,
		};
		const stepProperties: IApiFunctionStepProperties<PublicApiUser> = {
			entity: PublicApiUser,
		};
		const stepRepository = {} as Repository<PublicApiUser>;
		const subscriberRepository = {} as Repository<PublicApiUser>;
		const subscriberRequiredData = {
			eventManager: {} as EntityManager,
			repository: subscriberRepository,
		} satisfies TApiSubscriberFunctionExecutionContextData<PublicApiUser, EApiFunctionSubscriberTransactionExpectation.REQUIRED>;
		const subscriberSupportsData = {
			repository: subscriberRepository,
		} satisfies IApiSubscriberFunctionExecutionContextData<PublicApiUser>;
		const subscriberBeforeCreateContext = {
			DATA: subscriberRequiredData,
			ENTITY: new PublicApiUser(),
			FUNCTION_TYPE: EApiFunctionType.CREATE,
			result: {
				role: "operator-user",
			},
		} satisfies TApiSubscriberFunctionBeforeCreateContext<PublicApiUser, Partial<PublicApiUser>, EApiFunctionSubscriberTransactionExpectation.REQUIRED>;
		const stepContext = {
			eventManager: undefined,
			getRepository: <T extends IApiBaseEntity>(_entity: new () => T): Repository<T> => stepRepository as unknown as Repository<T>,
			repository: stepRepository,
		} satisfies IApiFunctionStepContext<PublicApiUser>;
		const transactionOwner: TApiFunctionTransactionOwner = {
			kind: EApiFunctionTransactionOwnerKind.SCOPE,
			name: "public-api",
		};
		const transactionEvent: TApiFunctionTransactionEvent = {
			entityName: PublicApiUser.name,
			functionType: EApiFunctionType.CREATE,
			methodName: "create",
			sequence: 1,
			status: EApiFunctionTransactionEventStatus.SUCCEEDED,
		};
		const transactionContext = {
			DATA: {
				events: [transactionEvent],
				matchedEvents: [transactionEvent],
				transaction: {
					id: "transaction-id",
					owner: transactionOwner,
				},
			},
		} satisfies IApiSubscriberFunctionTransactionContext;
		const builtPackageEntryPath: string = "../../dist/esm/index.js";
		const builtPackageEntry = (await import(builtPackageEntryPath)) as {
			ApiFunctionStep?: unknown;
			ApiFunctionTransactionCommitUnknownOutcomeException?: unknown;
			ApiFunctionTransactionPostCommitException?: unknown;
			ApiFunctionTransactionRollbackException?: unknown;
			ApiFunctionTransactionScope?: unknown;
			EApiFunctionContextStorageKind?: {
				TRANSACTION?: unknown;
			};
			EApiFunctionTransactionEventStatus?: {
				SUCCEEDED?: unknown;
			};
			EApiFunctionTransactionMode?: {
				SUPPORTS?: unknown;
			};
			EApiFunctionTransactionOutcome?: {
				UNKNOWN?: unknown;
			};
			EApiFunctionTransactionOwnerKind?: {
				SCOPE?: unknown;
			};
			EApiFunctionTransactionTraceType?: {
				STEP?: unknown;
			};
			EApiFunctionSubscriberTransactionExpectation?: {
				REQUIRED?: unknown;
			};
			EApiFunctionType?: {
				CREATE?: unknown;
			};
			EApiGetDefaultStringFormatPropertiesBigIntStringSign?: {
				UNSIGNED?: unknown;
			};
			EApiRouteSubscriberAuthorizationExpectation?: {
				REQUIRED?: unknown;
			};
		};
		const builtCjsPackageEntryPath: string = "../../dist/cjs/index.js";
		const builtCjsPackageEntry = (await import(builtCjsPackageEntryPath)) as {
			ApiFunctionStep?: unknown;
			ApiFunctionTransactionScope?: unknown;
			EApiGetDefaultStringFormatPropertiesBigIntStringSign?: {
				UNSIGNED?: unknown;
			};
		};
		const bigintStringDefaults = GetDefaultStringFormatProperties(EApiPropertyStringType.BIGINT_STRING, bigintStringOptions);
		const resolvedPrincipal: IApiAuthorizationPrincipal = await Promise.resolve(
			principalResolver.resolve({
				id: "user-1",
				operatorId: "operator-1",
			}),
		);
		const routeSubscriberBeforeCreateContext: TApiSubscriberRouteBeforeCreateContext<PublicApiUser, EApiRouteSubscriberAuthorizationExpectation.REQUIRED> = {
			DATA: {} as never,
			ENTITY: new PublicApiUser(),
			ROUTE_TYPE: EApiRouteType.CREATE,
			result: {
				authenticationRequest: {
					authorizationDecision: {
						principal: resolvedPrincipal,
					} as TApiSubscriberRouteBeforeCreateContext<PublicApiUser, EApiRouteSubscriberAuthorizationExpectation.REQUIRED>["result"]["authenticationRequest"]["authorizationDecision"],
					user: {
						id: "user-1",
					},
				},
				body: {
					role: "operator-user",
				},
				headers: {
					"x-request-id": "req-1",
				},
				ip: "127.0.0.1",
			},
		};

		expect(moduleOptions.principalResolver).toBe(principalResolver);
		expect(moduleOptions.hookPermissionSources).toEqual([publicApiHookPermissionSource]);
		expect(requestMetadata.body).toEqual({ role: "operator-user" });
		expect(requestMetadata.parameters).toEqual({ id: "user-1" });
		expect(routeDiscriminatorConfig.discriminator.propertyName).toBe("channel");
		expect(bigintStringDefaults.pattern).toBe(String.raw`/^(0|[1-9]\d{0,19})$/`);
		expect(stepProperties.entity).toBe(PublicApiUser);
		expect(subscriberRequiredData.eventManager).toBeDefined();
		expect(subscriberRequiredData.repository).toBe(subscriberRepository);
		expect(subscriberSupportsData.repository).toBe(subscriberRepository);
		expect(subscriberBeforeCreateContext.DATA.eventManager).toBe(subscriberRequiredData.eventManager);
		expect(routeSubscriberBeforeCreateContext.result.authenticationRequest.authorizationDecision.principal).toBe(resolvedPrincipal);
		expect(stepContext.eventManager).toBeUndefined();
		expect(stepContext.getRepository(PublicApiUser)).toBe(stepRepository);
		expect(stepContext.repository).toBe(stepRepository);
		expect(transactionContext.DATA.events).toEqual([transactionEvent]);
		expect(transactionContext.DATA.transaction.owner).toBe(transactionOwner);
		expect(typeof ApiFunctionTransactionCommitUnknownOutcomeException).toBe("function");
		expect(typeof ApiFunctionTransactionPostCommitException).toBe("function");
		expect(typeof ApiFunctionTransactionRollbackException).toBe("function");
		expect(typeof ApiFunctionTransactionScope).toBe("function");
		expect(typeof builtPackageEntry.ApiFunctionStep).toBe("function");
		expect(typeof builtPackageEntry.ApiFunctionTransactionCommitUnknownOutcomeException).toBe("function");
		expect(typeof builtPackageEntry.ApiFunctionTransactionPostCommitException).toBe("function");
		expect(typeof builtPackageEntry.ApiFunctionTransactionRollbackException).toBe("function");
		expect(typeof builtPackageEntry.ApiFunctionTransactionScope).toBe("function");
		expect(builtPackageEntry).not.toHaveProperty("ApiFunctionTransactionLifecycle");
		expect(builtPackageEntry).not.toHaveProperty("ApiFunctionTransactionRegistry");
		expect(builtPackageEntry).not.toHaveProperty("ApiFunctionTransactionRuntime");
		expect(builtPackageEntry).not.toHaveProperty("ApplyBigIntStringGetDefaultStringFormatPropertiesOptions");
		expect(builtPackageEntry).not.toHaveProperty("ApplyGetDefaultStringFormatPropertiesCustomizer");
		expect(builtPackageEntry).not.toHaveProperty("CUSTOMIZER_MAP_GET_DEFAULT_STRING_FORMAT_PROPERTIES_API_UTILITY_CONSTANT");
		expect(builtPackageEntry).not.toHaveProperty("MANUAL_PROPERTY_METADATA_DTO_UTILITY_CONSTANT");
		expect(typeof builtCjsPackageEntry.ApiFunctionStep).toBe("function");
		expect(typeof builtCjsPackageEntry.ApiFunctionTransactionScope).toBe("function");
		expect(builtCjsPackageEntry.EApiGetDefaultStringFormatPropertiesBigIntStringSign?.UNSIGNED).toBe(EApiGetDefaultStringFormatPropertiesBigIntStringSign.UNSIGNED);
		expect(builtPackageEntry.EApiFunctionContextStorageKind?.TRANSACTION).toBe(EApiFunctionContextStorageKind.TRANSACTION);
		expect(builtPackageEntry.EApiFunctionSubscriberTransactionExpectation?.REQUIRED).toBe(EApiFunctionSubscriberTransactionExpectation.REQUIRED);
		expect(builtPackageEntry.EApiFunctionTransactionEventStatus?.SUCCEEDED).toBe(EApiFunctionTransactionEventStatus.SUCCEEDED);
		expect(builtPackageEntry.EApiFunctionTransactionMode?.SUPPORTS).toBe(EApiFunctionTransactionMode.SUPPORTS);
		expect(builtPackageEntry.EApiFunctionTransactionOutcome?.UNKNOWN).toBe(EApiFunctionTransactionOutcome.UNKNOWN);
		expect(builtPackageEntry.EApiFunctionTransactionOwnerKind?.SCOPE).toBe(EApiFunctionTransactionOwnerKind.SCOPE);
		expect(builtPackageEntry.EApiFunctionTransactionTraceType?.STEP).toBe(EApiFunctionTransactionTraceType.STEP);
		expect(builtPackageEntry.EApiFunctionType?.CREATE).toBe(EApiFunctionType.CREATE);
		expect(builtPackageEntry.EApiGetDefaultStringFormatPropertiesBigIntStringSign?.UNSIGNED).toBe(EApiGetDefaultStringFormatPropertiesBigIntStringSign.UNSIGNED);
		expect(builtPackageEntry.EApiRouteSubscriberAuthorizationExpectation?.REQUIRED).toBe(EApiRouteSubscriberAuthorizationExpectation.REQUIRED);
		expect(AUTHORIZATION_PRINCIPAL_RESOLVER_TOKEN).toBe("API_AUTHORIZATION_PRINCIPAL_RESOLVER");
		expect(resolvedPrincipal.id).toBe("user-1");
		expect(EApiAuthorizationMode.HOOKS).toBe("hooks");
		expect(new PublicApiPolicy()).toBeInstanceOf(ApiAuthorizationPolicyBase);
		expect(new PublicApiStepService()).toBeInstanceOf(PublicApiStepService);
	});
});
