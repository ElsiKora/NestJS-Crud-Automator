import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPolicySubscriberProperties } from "@interface/authorization/policy/subscriber/properties.interface";

import { AUTHORIZATION_POLICY_DECORATOR_CONSTANT } from "@constant/authorization/policy/decorator.constant";
import { Injectable, OnModuleInit } from "@nestjs/common";
import { DiscoveryService } from "@nestjs/core";
import { InstanceWrapper } from "@nestjs/core/injector/instance-wrapper";
import { LoggerUtility } from "@utility/logger.utility";

import { ApiAuthorizationPolicyBase } from "./base.class";
import { ApiAuthorizationPolicyRegistry } from "./registry.class";

const policyDiscoveryLogger: LoggerUtility = LoggerUtility.getLogger("ApiAuthorizationPolicyDiscoveryService");

@Injectable()
export class ApiAuthorizationPolicyDiscoveryService implements OnModuleInit {
	constructor(
		private readonly discoveryService: DiscoveryService,
		private readonly registry: ApiAuthorizationPolicyRegistry,
	) {}

	public onModuleInit(): void {
		policyDiscoveryLogger.verbose("Starting authorization policy discovery...");
		const providers: Array<InstanceWrapper> = this.discoveryService.getProviders();
		const policyProviders: Array<InstanceWrapper> = providers.filter((wrapper: InstanceWrapper) => this.isPolicyWrapper(wrapper));

		for (const wrapper of policyProviders) {
			if (!wrapper.metatype) {
				continue;
			}

			const metadata: unknown = Reflect.getMetadata(AUTHORIZATION_POLICY_DECORATOR_CONSTANT.METADATA_KEY, wrapper.metatype);
			const properties: IApiAuthorizationPolicySubscriberProperties<IApiBaseEntity> | undefined = metadata as IApiAuthorizationPolicySubscriberProperties<IApiBaseEntity> | undefined;

			if (!properties) {
				continue;
			}

			const policyId: string = properties.policyId ?? `${properties.entity.name?.toLowerCase() ?? "unknown"}${AUTHORIZATION_POLICY_DECORATOR_CONSTANT.DEFAULT_POLICY_ID_SUFFIX}`;

			this.registry.registerSubscriber({
				description: properties.description,
				entity: properties.entity,
				policyId,
				priority: properties.priority ?? 0,
				subscriber: wrapper.instance as ApiAuthorizationPolicyBase<IApiBaseEntity>,
			});

			policyDiscoveryLogger.verbose(`Registered authorization policy ${wrapper.name ?? properties.entity.name ?? "UnknownPolicy"} for entity ${properties.entity.name ?? "UnknownEntity"} with priority ${properties.priority ?? 0}`);
		}

		policyDiscoveryLogger.verbose(`Authorization policy discovery finished. Registered ${policyProviders.length} providers.`);
	}

	private isPolicyWrapper(wrapper: InstanceWrapper): boolean {
		return Boolean(wrapper.instance && wrapper.metatype && wrapper.instance instanceof ApiAuthorizationPolicyBase && Reflect.hasMetadata(AUTHORIZATION_POLICY_DECORATOR_CONSTANT.METADATA_KEY, wrapper.metatype));
	}
}
