import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPolicy, IApiAuthorizationPolicyRegistry, IApiAuthorizationPolicySubscriber, IApiAuthorizationPolicySubscriberContext, IApiAuthorizationPolicySubscriberRegistration, IApiAuthorizationPolicySubscriberRule, IApiAuthorizationRule } from "@interface/authorization";
import type { IApiEntity } from "@interface/entity/interface";
import type { TApiAuthorizationPolicyHookResult } from "@type/class/api/authorization/policy/hook";

import { AUTHORIZATION_POLICY_DECORATOR_CONSTANT } from "@constant/authorization/policy/decorator.constant";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { LoggerUtility } from "@utility/logger.utility";

const policyRegistryLogger: LoggerUtility = LoggerUtility.getLogger("ApiAuthorizationPolicyRegistry");

type TEntityConstructor<E extends IApiBaseEntity> = new () => E;

export class ApiAuthorizationPolicyRegistry implements IApiAuthorizationPolicyRegistry {
	private readonly LEGACY_POLICIES: Map<string, IApiAuthorizationPolicy<IApiBaseEntity, unknown>>;

	private readonly POLICY_CACHE: Map<string, IApiAuthorizationPolicy<IApiBaseEntity, unknown>>;

	private readonly POLICY_REGISTRATIONS_BY_ENTITY: Map<string, Array<IApiAuthorizationPolicySubscriberRegistration<IApiBaseEntity>>>;

	private readonly POLICY_REGISTRATIONS_BY_ID: Map<string, IApiAuthorizationPolicySubscriberRegistration<IApiBaseEntity>>;

	constructor() {
		this.LEGACY_POLICIES = new Map();
		this.POLICY_CACHE = new Map();
		this.POLICY_REGISTRATIONS_BY_ENTITY = new Map();
		this.POLICY_REGISTRATIONS_BY_ID = new Map();
	}

	public async buildAggregatedPolicy<E extends IApiBaseEntity, TAction extends string>(entity: TEntityConstructor<E>, action: TAction): Promise<IApiAuthorizationPolicy<E, TApiAuthorizationPolicyHookResult<TAction, E>> | undefined> {
		const entityName: string = this.getEntityName(entity);
		const cacheKey: string = this.createCacheKey(entity, action);
		policyRegistryLogger.debug(`Building aggregated policy for entity "${entityName}" action "${action}" (cache key: ${cacheKey})`);

		const cachedPolicy: IApiAuthorizationPolicy<E, TApiAuthorizationPolicyHookResult<TAction, E>> | undefined = this.POLICY_CACHE.get(cacheKey) as IApiAuthorizationPolicy<E, TApiAuthorizationPolicyHookResult<TAction, E>> | undefined;

		if (cachedPolicy) {
			policyRegistryLogger.debug(`Returning cached policy for "${cacheKey}"`);

			return cachedPolicy;
		}

		const legacyPolicy: IApiAuthorizationPolicy<E, TApiAuthorizationPolicyHookResult<TAction, E>> | undefined = this.LEGACY_POLICIES.get(cacheKey) as IApiAuthorizationPolicy<E, TApiAuthorizationPolicyHookResult<TAction, E>> | undefined;

		if (legacyPolicy) {
			policyRegistryLogger.debug(`Returning legacy policy for "${cacheKey}"`);
			this.cachePolicy(cacheKey, legacyPolicy);

			return legacyPolicy;
		}

		const registrations: Array<IApiAuthorizationPolicySubscriberRegistration<IApiBaseEntity>> | undefined = this.POLICY_REGISTRATIONS_BY_ENTITY.get(entityName);

		policyRegistryLogger.debug(`Found ${registrations?.length ?? 0} registration(s) for entity "${entityName}"`);
		policyRegistryLogger.debug(`All registered entities: [${[...this.POLICY_REGISTRATIONS_BY_ENTITY.keys()].join(", ")}]`);

		if (!registrations?.length) {
			return undefined;
		}

		const entityMetadata: IApiEntity<E> = GenerateEntityInformation<E>(entity);
		const aggregatedRules: Array<IApiAuthorizationRule<E, TApiAuthorizationPolicyHookResult<TAction, E>>> = [];

		for (const registration of registrations) {
			const context: IApiAuthorizationPolicySubscriberContext<E> = { entity, entityMetadata };

			const rules: Array<IApiAuthorizationPolicySubscriberRule<E, TApiAuthorizationPolicyHookResult<TAction, E>>> = await (registration.subscriber as unknown as IApiAuthorizationPolicySubscriber<E>).getRulesForAction(action, context);

			if (rules.length === 0) {
				continue;
			}

			const normalizedRules: Array<IApiAuthorizationRule<E, TApiAuthorizationPolicyHookResult<TAction, E>>> = rules.map((rule: IApiAuthorizationPolicySubscriberRule<E, TApiAuthorizationPolicyHookResult<TAction, E>>) => this.normalizeRule<E, TAction>(registration.policyId, registration.priority ?? 0, rule, action));

			aggregatedRules.push(...normalizedRules);
		}

		if (aggregatedRules.length === 0) {
			return undefined;
		}

		aggregatedRules.sort((a: IApiAuthorizationRule<E, TApiAuthorizationPolicyHookResult<TAction, E>>, b: IApiAuthorizationRule<E, TApiAuthorizationPolicyHookResult<TAction, E>>) => b.priority - a.priority);

		const policyDescription: string | undefined = registrations.find((registration: IApiAuthorizationPolicySubscriberRegistration<IApiBaseEntity>) => Boolean(registration.description))?.description;

		const policy: IApiAuthorizationPolicy<E, TApiAuthorizationPolicyHookResult<TAction, E>> = {
			action,
			description: policyDescription,
			entity,
			policyId: this.resolvePolicyId(entity),
			rules: aggregatedRules,
		};

		this.cachePolicy(cacheKey, policy);

		return policy;
	}

	public clear(): void {
		this.LEGACY_POLICIES.clear();
		this.POLICY_CACHE.clear();
		this.POLICY_REGISTRATIONS_BY_ENTITY.clear();
		this.POLICY_REGISTRATIONS_BY_ID.clear();
	}

	public registerPolicy<E extends IApiBaseEntity, R>(policy: IApiAuthorizationPolicy<E, R>): void {
		const cacheKey: string = this.createCacheKey(policy.entity, policy.action);
		this.setLegacyPolicy(cacheKey, policy);
	}

	public registerSubscriber<E extends IApiBaseEntity>(registration: IApiAuthorizationPolicySubscriberRegistration<E>): void {
		const normalizedRegistration: IApiAuthorizationPolicySubscriberRegistration<IApiBaseEntity> = {
			description: registration.description,
			entity: registration.entity as TEntityConstructor<IApiBaseEntity>,
			policyId: registration.policyId,
			priority: registration.priority ?? 0,
			subscriber: registration.subscriber as never,
		};

		const entityName: string = this.getEntityName(normalizedRegistration.entity);

		policyRegistryLogger.verbose(`Registering policy subscriber for entity "${entityName}" with policyId "${normalizedRegistration.policyId}" and priority ${normalizedRegistration.priority}`);

		this.POLICY_REGISTRATIONS_BY_ID.set(normalizedRegistration.policyId, normalizedRegistration);

		const entityRegistrations: Array<IApiAuthorizationPolicySubscriberRegistration<IApiBaseEntity>> = this.POLICY_REGISTRATIONS_BY_ENTITY.get(entityName) ?? [];

		entityRegistrations.push(normalizedRegistration);
		entityRegistrations.sort((a: IApiAuthorizationPolicySubscriberRegistration<IApiBaseEntity>, b: IApiAuthorizationPolicySubscriberRegistration<IApiBaseEntity>) => (b.priority ?? 0) - (a.priority ?? 0));

		this.POLICY_REGISTRATIONS_BY_ENTITY.set(entityName, entityRegistrations);
		policyRegistryLogger.debug(`Total registrations for entity "${entityName}": ${entityRegistrations.length}`);

		this.invalidateCacheForEntity(entityName);
	}

	private cachePolicy<E extends IApiBaseEntity, R>(cacheKey: string, policy: IApiAuthorizationPolicy<E, R>): void {
		this.POLICY_CACHE.set(cacheKey, this.toBasePolicy(policy));
	}

	private createCacheKey<E extends IApiBaseEntity>(entity: TEntityConstructor<E>, action: string): string {
		return `${this.getEntityName(entity)}::${action.toLowerCase()}`;
	}

	private getEntityName<E extends IApiBaseEntity>(entity: TEntityConstructor<E>): string {
		return (entity.name ?? "UnknownResource").toLowerCase();
	}

	private invalidateCacheForEntity(entityName: string): void {
		for (const cacheKey of this.POLICY_CACHE.keys()) {
			if (cacheKey.startsWith(`${entityName}::`)) {
				this.POLICY_CACHE.delete(cacheKey);
			}
		}
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

	private resolvePolicyId<E extends IApiBaseEntity>(entity: TEntityConstructor<E>): string {
		return `${this.getEntityName(entity)}${AUTHORIZATION_POLICY_DECORATOR_CONSTANT.DEFAULT_POLICY_ID_SUFFIX}`;
	}

	private setLegacyPolicy<E extends IApiBaseEntity, R>(cacheKey: string, policy: IApiAuthorizationPolicy<E, R>): void {
		const normalizedPolicy: IApiAuthorizationPolicy<IApiBaseEntity, unknown> = this.toBasePolicy(policy);

		this.LEGACY_POLICIES.set(cacheKey, normalizedPolicy);
		this.POLICY_CACHE.set(cacheKey, normalizedPolicy);
	}

	private toBasePolicy<E extends IApiBaseEntity, R>(policy: IApiAuthorizationPolicy<E, R>): IApiAuthorizationPolicy<IApiBaseEntity, unknown> {
		return policy as unknown as IApiAuthorizationPolicy<IApiBaseEntity, unknown>;
	}
}

export const apiAuthorizationPolicyRegistry: ApiAuthorizationPolicyRegistry = new ApiAuthorizationPolicyRegistry();
