import type { IRegistry } from "@elsikora/cladi";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPolicy, IApiAuthorizationPolicyRegistry, IApiAuthorizationPolicySubscriber, IApiAuthorizationPolicySubscriberContext, IApiAuthorizationPolicySubscriberRegistration, IApiAuthorizationPolicySubscriberRule, IApiAuthorizationRule } from "@interface/class/api/authorization";
import type { IApiAuthorizationPolicyBuildOptions } from "@interface/class/api/authorization/policy/build-options.interface";
import type { IApiAuthorizationPolicyCacheOptions } from "@interface/class/api/authorization/policy/cache-options.interface";
import type { IApiAuthorizationPolicySubscriberContextData } from "@interface/class/api/authorization/policy/subscriber/context";
import type { IApiAuthorizationSubject } from "@interface/class/api/authorization/subject.interface";
import type { IApiEntity } from "@interface/entity/interface";
import type { TApiAuthorizationPolicyHookResult } from "@type/class/api/authorization/policy/hook";

import { AUTHORIZATION_POLICY_DECORATOR_CONSTANT } from "@constant/class/authorization/policy-decorator.constant";
import { createRegistry } from "@elsikora/cladi";
import { EApiRouteType } from "@enum/decorator/api/route-type.enum";
import { AuthorizationResolveDefaultSubject } from "@utility/authorization/resolve-default-subject.utility";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { LoggerUtility } from "@utility/logger.utility";

import { ApiAuthorizationPolicyExecutor } from "./executor.class";

const policyRegistryLogger: LoggerUtility = LoggerUtility.getLogger("ApiAuthorizationPolicyRegistry");

type TEntityConstructor<E extends IApiBaseEntity> = new () => E;

export class ApiAuthorizationPolicyRegistry implements IApiAuthorizationPolicyRegistry {
	private cacheOptions: IApiAuthorizationPolicyCacheOptions;

	private readonly POLICY_REGISTRY: IRegistry<PolicySubscriberWrapper>;

	private readonly POLICY_RULE_CACHE: Map<string, { cachedAt: number; rules: Array<IApiAuthorizationPolicySubscriberRule<IApiBaseEntity, unknown>> }>;

	constructor() {
		this.POLICY_RULE_CACHE = new Map();
		this.POLICY_REGISTRY = createRegistry<PolicySubscriberWrapper>({});
		this.cacheOptions = { isEnabled: false };
	}

	public async buildAggregatedPolicy<E extends IApiBaseEntity, TAction extends string>(entity: TEntityConstructor<E>, action: TAction, options: IApiAuthorizationPolicyBuildOptions = {}): Promise<IApiAuthorizationPolicy<E, TApiAuthorizationPolicyHookResult<TAction, E>> | undefined> {
		const entityName: string = this.getEntityName(entity);
		policyRegistryLogger.debug(`Building aggregated policy for entity "${entityName}" action "${action}"`);

		const registrationWrapper: PolicySubscriberWrapper | undefined = this.POLICY_REGISTRY.get(entityName);
		const registrations: Array<IApiAuthorizationPolicySubscriberRegistration<IApiBaseEntity>> = registrationWrapper?.registrations ?? [];

		policyRegistryLogger.debug(`Found ${registrations.length} registration(s) for entity "${entityName}"`);
		policyRegistryLogger.debug(
			`All registered entities: [${this.POLICY_REGISTRY.getAll()
				.map((wrapper: PolicySubscriberWrapper) => wrapper.getName())
				.join(", ")}]`,
		);

		if (registrations.length === 0) {
			return undefined;
		}

		const entityMetadata: IApiEntity<E> = GenerateEntityInformation<E>(entity);
		const routeType: EApiRouteType | undefined = this.resolveRouteType(action);
		const { authenticationRequest, subject: subjectOverride }: IApiAuthorizationPolicyBuildOptions = options;
		const subject: IApiAuthorizationSubject = subjectOverride ?? AuthorizationResolveDefaultSubject(authenticationRequest?.user);

		const contextData: IApiAuthorizationPolicySubscriberContextData<E> = {
			action,
			authenticationRequest,
			entity,
			entityMetadata,
			routeType,
			subject,
		};
		const aggregatedRules: Array<IApiAuthorizationRule<E, TApiAuthorizationPolicyHookResult<TAction, E>>> = [];
		const policyIds: Set<string> = new Set<string>();

		for (const registration of registrations) {
			const context: IApiAuthorizationPolicySubscriberContext<E> = {
				...contextData,
				DATA: contextData,
			};

			const rules: Array<IApiAuthorizationPolicySubscriberRule<E, TApiAuthorizationPolicyHookResult<TAction, E>>> = await this.resolvePolicyRules<E, TAction>(registration, action, context, entityName);

			if (rules.length === 0) {
				continue;
			}

			policyIds.add(registration.policyId);

			const normalizedRules: Array<IApiAuthorizationRule<E, TApiAuthorizationPolicyHookResult<TAction, E>>> = rules.map((rule: IApiAuthorizationPolicySubscriberRule<E, TApiAuthorizationPolicyHookResult<TAction, E>>) => this.normalizeRule<E, TAction>(registration.policyId, registration.priority ?? 0, rule, action));

			aggregatedRules.push(...normalizedRules);
		}

		if (aggregatedRules.length === 0) {
			return undefined;
		}

		aggregatedRules.sort((a: IApiAuthorizationRule<E, TApiAuthorizationPolicyHookResult<TAction, E>>, b: IApiAuthorizationRule<E, TApiAuthorizationPolicyHookResult<TAction, E>>) => b.priority - a.priority);

		const policyDescription: string | undefined = registrations.find((registration: IApiAuthorizationPolicySubscriberRegistration<IApiBaseEntity>) => Boolean(registration.description))?.description;
		const policyIdList: Array<string> = [...policyIds];

		const policy: IApiAuthorizationPolicy<E, TApiAuthorizationPolicyHookResult<TAction, E>> = {
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

	public registerSubscriber<E extends IApiBaseEntity>(registration: IApiAuthorizationPolicySubscriberRegistration<E>): void {
		const normalizedRegistration: IApiAuthorizationPolicySubscriberRegistration<IApiBaseEntity> = {
			cache: registration.cache,
			description: registration.description,
			entity: registration.entity as TEntityConstructor<IApiBaseEntity>,
			policyId: registration.policyId,
			priority: registration.priority ?? 0,
			subscriber: registration.subscriber as never,
		};

		const entityName: string = this.getEntityName(normalizedRegistration.entity);

		policyRegistryLogger.verbose(`Registering policy subscriber for entity "${entityName}" with policyId "${normalizedRegistration.policyId}" and priority ${normalizedRegistration.priority}`);

		let wrapper: PolicySubscriberWrapper | undefined = this.POLICY_REGISTRY.get(entityName);

		if (!wrapper) {
			wrapper = new PolicySubscriberWrapper(entityName);
			this.POLICY_REGISTRY.register(wrapper);
		}

		wrapper.addRegistration(normalizedRegistration);
		policyRegistryLogger.debug(`Total registrations for entity "${entityName}": ${wrapper.getRegistrationCount()}`);

		this.invalidateCacheForEntity(entityName);
	}

	private cacheRules<E extends IApiBaseEntity, R>(cacheKey: string, rules: Array<IApiAuthorizationPolicySubscriberRule<E, R>>, cacheOptions: IApiAuthorizationPolicyCacheOptions): void {
		if (!cacheOptions.isEnabled) {
			return;
		}

		this.POLICY_RULE_CACHE.set(cacheKey, { cachedAt: Date.now(), rules: rules as Array<IApiAuthorizationPolicySubscriberRule<IApiBaseEntity, unknown>> });
	}

	private createPolicyCacheKey<E extends IApiBaseEntity>(entityName: string, registration: IApiAuthorizationPolicySubscriberRegistration<E>, action: string): string {
		const subscriberName: string = this.getSubscriberName(registration.subscriber as unknown as IApiAuthorizationPolicySubscriber<IApiBaseEntity>);

		return `${entityName}::${registration.policyId}::${subscriberName}::${action.toLowerCase()}`;
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

	private getEntityName<E extends IApiBaseEntity>(entity: TEntityConstructor<E>): string {
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

	private normalizeRule<E extends IApiBaseEntity, TAction extends string>(policyId: string, subscriberPriority: number, rule: IApiAuthorizationPolicySubscriberRule<E, TApiAuthorizationPolicyHookResult<TAction, E>>, action: TAction): IApiAuthorizationRule<E, TApiAuthorizationPolicyHookResult<TAction, E>> {
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

	private resolvePolicyId<E extends IApiBaseEntity>(entity: TEntityConstructor<E>): string {
		return `${this.getEntityName(entity)}${AUTHORIZATION_POLICY_DECORATOR_CONSTANT.DEFAULT_POLICY_ID_SUFFIX}`;
	}

	private async resolvePolicyRules<E extends IApiBaseEntity, TAction extends string>(registration: IApiAuthorizationPolicySubscriberRegistration<IApiBaseEntity>, action: TAction, context: IApiAuthorizationPolicySubscriberContext<E>, entityName: string): Promise<Array<IApiAuthorizationPolicySubscriberRule<E, TApiAuthorizationPolicyHookResult<TAction, E>>>> {
		const cacheOptions: IApiAuthorizationPolicyCacheOptions = this.resolveCacheOptions(registration.cache);
		const cacheKey: string = this.createPolicyCacheKey(entityName, registration, action);
		const cachedRules: Array<IApiAuthorizationPolicySubscriberRule<E, TApiAuthorizationPolicyHookResult<TAction, E>>> | undefined = this.getCachedRules<E, TApiAuthorizationPolicyHookResult<TAction, E>>(cacheKey, cacheOptions);

		if (cachedRules) {
			return cachedRules;
		}

		const rules: Array<IApiAuthorizationPolicySubscriberRule<E, TApiAuthorizationPolicyHookResult<TAction, E>>> = await ApiAuthorizationPolicyExecutor.execute(registration.subscriber as unknown as IApiAuthorizationPolicySubscriber<E>, action, context);

		this.cacheRules(cacheKey, rules, cacheOptions);

		return rules;
	}

	private resolveRouteType(action: string): EApiRouteType | undefined {
		const routeTypes: Array<string> = Object.values(EApiRouteType) as Array<string>;

		return routeTypes.find((routeType: string) => routeType === action) as EApiRouteType | undefined;
	}
}

export const apiAuthorizationPolicyRegistry: ApiAuthorizationPolicyRegistry = new ApiAuthorizationPolicyRegistry();

class PolicySubscriberWrapper {
	public registrations: Array<IApiAuthorizationPolicySubscriberRegistration<IApiBaseEntity>>;

	constructor(
		private readonly name: string,
		registrations: Array<IApiAuthorizationPolicySubscriberRegistration<IApiBaseEntity>> = [],
	) {
		this.registrations = registrations;
	}

	public addRegistration(registration: IApiAuthorizationPolicySubscriberRegistration<IApiBaseEntity>): void {
		this.registrations.push(registration);
		this.registrations.sort((a: IApiAuthorizationPolicySubscriberRegistration<IApiBaseEntity>, b: IApiAuthorizationPolicySubscriberRegistration<IApiBaseEntity>) => (b.priority ?? 0) - (a.priority ?? 0));
	}

	public getName(): string {
		return this.getNormalizedName();
	}

	public getRegistrationCount(): number {
		return this.registrations.length;
	}

	private getNormalizedName(): string {
		return this.name;
	}
}
