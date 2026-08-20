import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { EApiRouteType } from "@enum/decorator/api/route";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPolicy, IApiAuthorizationPolicyRegistry, IApiAuthorizationPolicySubscriber, IApiAuthorizationPolicySubscriberContext, IApiAuthorizationPolicySubscriberRegistration, IApiAuthorizationPolicySubscriberRule, IApiAuthorizationRule } from "@interface/class/api/authorization";
import type { IApiAuthorizationPolicyBuildOptions } from "@interface/class/api/authorization/policy/build-options.interface";
import type { IApiAuthorizationPolicyCacheOptions } from "@interface/class/api/authorization/policy/cache-options.interface";
import type { IApiAuthorizationPolicySubscriberContextData } from "@interface/class/api/authorization/policy/subscriber/context";
import type { IApiAuthorizationPrincipal, IApiAuthorizationPrincipalResolver } from "@interface/class/api/authorization/principal";
import type { IApiEntity } from "@interface/entity/interface";
import type { TApiAuthorizationPolicyHookResult } from "@type/class/api/authorization/policy/hook";

import { ApiAuthorizationPolicyExecutor } from "@class/api/authorization/policy/executor.class";
import { PolicySubscriberWrapper } from "@class/api/authorization/policy/subscriber-wrapper.class";
import { AUTHORIZATION_POLICY_DECORATOR_CONSTANT } from "@constant/class/authorization";
import { AuthorizationResolveDefaultPrincipal } from "@utility/authorization/resolve-default-principal.utility";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { LoggerUtility } from "@utility/logger.utility";

const policyRegistryLogger: LoggerUtility = LoggerUtility.getLogger("ApiAuthorizationPolicyRegistry");

export class ApiAuthorizationPolicyRegistry implements IApiAuthorizationPolicyRegistry {
	private cacheOptions: IApiAuthorizationPolicyCacheOptions;

	private readonly POLICY_REGISTRY: Map<string, PolicySubscriberWrapper>;

	private readonly POLICY_RULE_CACHE: Map<string, { cachedAt: number; rules: Array<IApiAuthorizationPolicySubscriberRule<IApiBaseEntity, unknown>> }>;

	constructor() {
		this.POLICY_RULE_CACHE = new Map();
		this.POLICY_REGISTRY = new Map();
		this.cacheOptions = { isEnabled: false };
	}

	public async buildAggregatedPolicy<E extends IApiBaseEntity, TAction extends string, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE>(entity: new () => E, action: TAction, options: IApiAuthorizationPolicyBuildOptions<E, M> = {}): Promise<IApiAuthorizationPolicy<E, TApiAuthorizationPolicyHookResult<TAction, E, M>> | undefined> {
		const entityName: string = this.getEntityName(entity);
		policyRegistryLogger.debug(`Building aggregated policy for entity "${entityName}" action "${action}"`);

		const registrationWrapper: PolicySubscriberWrapper | undefined = this.POLICY_REGISTRY.get(entityName);
		const registrations: Array<IApiAuthorizationPolicySubscriberRegistration<IApiBaseEntity>> = registrationWrapper?.registrations ?? [];

		policyRegistryLogger.debug(`Found ${registrations.length} registration(s) for entity "${entityName}"`);
		policyRegistryLogger.debug(`All registered entities: [${[...this.POLICY_REGISTRY.values()].map((wrapper: PolicySubscriberWrapper) => wrapper.getName()).join(", ")}]`);

		if (registrations.length === 0) {
			return undefined;
		}

		const entityMetadata: IApiEntity<E> = GenerateEntityInformation<E>(entity);
		const { authenticationRequest, permissions = [], principal: principalOverride, principalResolver, requestMetadata, routeType: routeTypeOverride }: IApiAuthorizationPolicyBuildOptions<E, M> = options;
		const principal: IApiAuthorizationPrincipal = await this.resolvePrincipal(authenticationRequest, principalOverride, principalResolver);

		const contextData: IApiAuthorizationPolicySubscriberContextData<E, M> = {
			action,
			authenticationRequest,
			...requestMetadata,
			entity,
			entityMetadata,
			permissions,
			principal,
			routeType: routeTypeOverride,
		};
		const aggregatedRules: Array<IApiAuthorizationRule<E, TApiAuthorizationPolicyHookResult<TAction, E, M>>> = [];
		const policyIds: Set<string> = new Set<string>();

		for (const registration of registrations) {
			const context: IApiAuthorizationPolicySubscriberContext<E, M> = {
				...contextData,
				DATA: contextData,
			};

			const rules: Array<IApiAuthorizationPolicySubscriberRule<E, TApiAuthorizationPolicyHookResult<TAction, E, M>>> = await this.resolvePolicyRules<E, TAction, M>(registration, action, context, entityName);

			if (rules.length === 0) {
				continue;
			}

			policyIds.add(registration.policyId);

			const normalizedRules: Array<IApiAuthorizationRule<E, TApiAuthorizationPolicyHookResult<TAction, E, M>>> = rules.map((rule: IApiAuthorizationPolicySubscriberRule<E, TApiAuthorizationPolicyHookResult<TAction, E, M>>) => this.normalizeRule<E, TAction, M>(registration.policyId, registration.priority ?? 0, rule, action));

			aggregatedRules.push(...normalizedRules);
		}

		if (aggregatedRules.length === 0) {
			return undefined;
		}

		aggregatedRules.sort((a: IApiAuthorizationRule<E, TApiAuthorizationPolicyHookResult<TAction, E, M>>, b: IApiAuthorizationRule<E, TApiAuthorizationPolicyHookResult<TAction, E, M>>) => b.priority - a.priority);

		const policyDescription: string | undefined = registrations.find((registration: IApiAuthorizationPolicySubscriberRegistration<IApiBaseEntity>) => Boolean(registration.description))?.description;
		const policyIdList: Array<string> = [...policyIds];

		const policy: IApiAuthorizationPolicy<E, TApiAuthorizationPolicyHookResult<TAction, E, M>> = {
			action,
			description: policyDescription,
			entity,
			policyId: this.resolvePolicyId(entity),
			policyIds: policyIdList,
			rules: aggregatedRules,
		};

		return policy;
	}

	public clear(): void {
		this.POLICY_RULE_CACHE.clear();
		this.POLICY_REGISTRY.clear();
	}

	public configureCache(options: IApiAuthorizationPolicyCacheOptions = {}): void {
		this.cacheOptions = {
			isEnabled: Boolean(options.isEnabled),
			ttlMs: options.ttlMs,
		};
	}

	public hasSubscriberForEntity(entity: new () => IApiBaseEntity): boolean {
		return (this.POLICY_REGISTRY.get(this.getEntityName(entity))?.registrations.length ?? 0) > 0;
	}

	public invalidateCache(entity?: new () => IApiBaseEntity): void {
		if (!entity) {
			this.POLICY_RULE_CACHE.clear();

			return;
		}

		this.invalidateCacheForEntity(this.getEntityName(entity));
	}

	public registerSubscriber<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE>(registration: IApiAuthorizationPolicySubscriberRegistration<E, M>): void {
		const normalizedRegistration: IApiAuthorizationPolicySubscriberRegistration<IApiBaseEntity> = {
			cache: registration.cache,
			description: registration.description,
			entity: registration.entity,
			policyId: registration.policyId,
			priority: registration.priority ?? 0,
			subscriber: registration.subscriber as never,
		};

		const entityName: string = this.getEntityName(normalizedRegistration.entity);

		policyRegistryLogger.verbose(`Registering policy subscriber for entity "${entityName}" with policyId "${normalizedRegistration.policyId}" and priority ${normalizedRegistration.priority}`);

		let wrapper: PolicySubscriberWrapper | undefined = this.POLICY_REGISTRY.get(entityName);

		if (!wrapper) {
			wrapper = new PolicySubscriberWrapper(entityName);
			this.POLICY_REGISTRY.set(entityName, wrapper);
		}

		wrapper.addRegistration(normalizedRegistration);
		policyRegistryLogger.debug(`Total registrations for entity "${entityName}": ${wrapper.getRegistrationCount()}`);

		this.invalidateCache(normalizedRegistration.entity);
	}

	private cacheRules<E extends IApiBaseEntity, R>(cacheKey: string, rules: Array<IApiAuthorizationPolicySubscriberRule<E, R>>, cacheOptions: IApiAuthorizationPolicyCacheOptions): void {
		if (!cacheOptions.isEnabled) {
			return;
		}

		this.POLICY_RULE_CACHE.set(cacheKey, { cachedAt: Date.now(), rules: rules as Array<IApiAuthorizationPolicySubscriberRule<IApiBaseEntity, unknown>> });
	}

	private createPolicyCacheKey<E extends IApiBaseEntity>(entityName: string, registration: IApiAuthorizationPolicySubscriberRegistration<E>, action: string, routeType?: EApiRouteType): string {
		const subscriberName: string = this.getSubscriberName(registration.subscriber as unknown as IApiAuthorizationPolicySubscriber<IApiBaseEntity>);

		return `${entityName}::${registration.policyId}::${subscriberName}::${(routeType ?? "custom").toLowerCase()}::${action.toLowerCase()}`;
	}

	private getCachedRules<E extends IApiBaseEntity, R>(cacheKey: string, cacheOptions: IApiAuthorizationPolicyCacheOptions): Array<IApiAuthorizationPolicySubscriberRule<E, R>> | undefined {
		if (!cacheOptions.isEnabled) {
			return undefined;
		}

		const cachedEntry: { cachedAt: number; rules: Array<IApiAuthorizationPolicySubscriberRule<IApiBaseEntity, unknown>> } | undefined = this.POLICY_RULE_CACHE.get(cacheKey);

		if (!cachedEntry) {
			return undefined;
		}

		if (this.isCacheExpired(cachedEntry.cachedAt, cacheOptions.ttlMs)) {
			this.POLICY_RULE_CACHE.delete(cacheKey);

			return undefined;
		}

		return cachedEntry.rules as unknown as Array<IApiAuthorizationPolicySubscriberRule<E, R>>;
	}

	private getEntityName(entity: new () => IApiBaseEntity): string {
		return (entity.name ?? "UnknownResource").toLowerCase();
	}

	private getSubscriberName(subscriber: IApiAuthorizationPolicySubscriber<IApiBaseEntity>): string {
		return subscriber.constructor?.name ?? "UnknownPolicySubscriber";
	}

	private invalidateCacheForEntity(entityName: string): void {
		for (const cacheKey of this.POLICY_RULE_CACHE.keys()) {
			if (cacheKey.startsWith(`${entityName}::`)) {
				this.POLICY_RULE_CACHE.delete(cacheKey);
			}
		}
	}

	private isCacheExpired(cachedAt: number, ttlMs?: number): boolean {
		if (ttlMs === undefined) {
			return false;
		}

		return Date.now() - cachedAt > ttlMs;
	}

	private normalizeRule<E extends IApiBaseEntity, TAction extends string, M extends EApiControllerGetListQueryPaginationMode>(policyId: string, subscriberPriority: number, rule: IApiAuthorizationPolicySubscriberRule<E, TApiAuthorizationPolicyHookResult<TAction, E, M>>, action: TAction): IApiAuthorizationRule<E, TApiAuthorizationPolicyHookResult<TAction, E, M>> {
		const rulePriority: number = rule.priority ?? 0;

		return {
			action,
			condition: rule.condition,
			description: rule.description,
			effect: rule.effect,
			policyId,
			priority: subscriberPriority + rulePriority,
			resultTransform: rule.resultTransform,
			scope: rule.scope,
		};
	}

	private resolveCacheOptions(options?: IApiAuthorizationPolicyCacheOptions): IApiAuthorizationPolicyCacheOptions {
		return {
			isEnabled: options?.isEnabled ?? this.cacheOptions.isEnabled,
			ttlMs: options?.ttlMs ?? this.cacheOptions.ttlMs,
		};
	}

	private resolvePolicyId(entity: new () => IApiBaseEntity): string {
		return `${this.getEntityName(entity)}${AUTHORIZATION_POLICY_DECORATOR_CONSTANT.DEFAULT_POLICY_ID_SUFFIX}`;
	}

	private async resolvePolicyRules<E extends IApiBaseEntity, TAction extends string, M extends EApiControllerGetListQueryPaginationMode>(registration: IApiAuthorizationPolicySubscriberRegistration<IApiBaseEntity>, action: TAction, context: IApiAuthorizationPolicySubscriberContext<E, M>, entityName: string): Promise<Array<IApiAuthorizationPolicySubscriberRule<E, TApiAuthorizationPolicyHookResult<TAction, E, M>>>> {
		const cacheOptions: IApiAuthorizationPolicyCacheOptions = this.resolveCacheOptions(registration.cache);
		const cacheKey: string = this.createPolicyCacheKey(entityName, registration, action, context.routeType);
		const cachedRules: Array<IApiAuthorizationPolicySubscriberRule<E, TApiAuthorizationPolicyHookResult<TAction, E, M>>> | undefined = this.getCachedRules<E, TApiAuthorizationPolicyHookResult<TAction, E, M>>(cacheKey, cacheOptions);

		if (cachedRules) {
			return cachedRules;
		}

		const rules: Array<IApiAuthorizationPolicySubscriberRule<E, TApiAuthorizationPolicyHookResult<TAction, E, M>>> = await ApiAuthorizationPolicyExecutor.execute<E, TAction, M>(registration.subscriber as unknown as IApiAuthorizationPolicySubscriber<E, M>, action, context);

		this.cacheRules(cacheKey, rules, cacheOptions);

		return rules;
	}

	private async resolvePrincipal<E extends IApiBaseEntity>(authenticationRequest: IApiAuthorizationPolicyBuildOptions<E>["authenticationRequest"], principalOverride: IApiAuthorizationPrincipal | undefined, principalResolver: IApiAuthorizationPrincipalResolver | undefined): Promise<IApiAuthorizationPrincipal> {
		if (principalOverride) {
			return principalOverride;
		}

		if (principalResolver) {
			return await principalResolver.resolve(authenticationRequest?.user, authenticationRequest);
		}

		return AuthorizationResolveDefaultPrincipal(authenticationRequest?.user);
	}
}

export const apiAuthorizationPolicyRegistry: ApiAuthorizationPolicyRegistry = new ApiAuthorizationPolicyRegistry();
