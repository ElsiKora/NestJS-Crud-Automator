import { SUBSCRIBER_API_DECORATOR_CONSTANT } from "@constant/decorator/api/subscriber.constant";
import { IApiBaseEntity } from "@interface/api-base-entity.interface";
import { IApiFunctionSubscriberProperties, IApiRouteSubscriberProperties } from "@interface/decorator/api/subscriber";
import { Injectable, OnModuleInit } from "@nestjs/common";
import { DiscoveryService } from "@nestjs/core";
import { InstanceWrapper } from "@nestjs/core/injector/instance-wrapper";
import { LoggerUtility } from "@utility/logger.utility";

import { ApiFunctionSubscriberBase } from "./function-base.class";
import { apiSubscriberRegistry } from "./registry.class";
import { ApiRouteSubscriberBase } from "./route-base.class";

const subscriberLogger: LoggerUtility = LoggerUtility.getLogger("ApiSubscriberDiscoveryService");

@Injectable()
export class ApiSubscriberDiscoveryService implements OnModuleInit {
	constructor(private readonly discoveryService: DiscoveryService) {}

	onModuleInit(): void {
		subscriberLogger.verbose("Starting subscriber discovery...");
		const providers: Array<InstanceWrapper> = this.discoveryService.getProviders();
		this.registerFunctionSubscribers(providers);
		this.registerRouteSubscribers(providers);
		subscriberLogger.verbose("Subscriber discovery finished.");
	}

	private registerFunctionSubscribers(providers: Array<InstanceWrapper>): void {
		const functionSubscribers: Array<InstanceWrapper> = providers.filter((wrapper: InstanceWrapper) => wrapper.instance && wrapper.metatype && wrapper.instance instanceof ApiFunctionSubscriberBase && Reflect.hasMetadata(SUBSCRIBER_API_DECORATOR_CONSTANT.FUNCTION_METADATA_KEY, wrapper.metatype));

		for (const wrapper of functionSubscribers) {
			// eslint-disable-next-line @elsikora/typescript/no-non-null-assertion
			const properties: IApiFunctionSubscriberProperties<IApiBaseEntity> = Reflect.getMetadata(SUBSCRIBER_API_DECORATOR_CONSTANT.FUNCTION_METADATA_KEY, wrapper.metatype!) as IApiFunctionSubscriberProperties<IApiBaseEntity>;
			// eslint-disable-next-line @elsikora/typescript/no-unsafe-argument
			apiSubscriberRegistry.registerFunctionSubscriber(properties, wrapper.instance);
			subscriberLogger.verbose(`Registered function subscriber ${wrapper.name} for entity ${properties.entity.name} with priority ${properties.priority ?? 0}`);
		}
	}

	private registerRouteSubscribers(providers: Array<InstanceWrapper>): void {
		const routeSubscribers: Array<InstanceWrapper> = providers.filter((wrapper: InstanceWrapper) => wrapper.instance && wrapper.metatype && wrapper.instance instanceof ApiRouteSubscriberBase && Reflect.hasMetadata(SUBSCRIBER_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, wrapper.metatype));

		for (const wrapper of routeSubscribers) {
			// eslint-disable-next-line @elsikora/typescript/no-non-null-assertion
			const properties: IApiRouteSubscriberProperties<IApiBaseEntity> = Reflect.getMetadata(SUBSCRIBER_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, wrapper.metatype!) as IApiRouteSubscriberProperties<IApiBaseEntity>;
			// eslint-disable-next-line @elsikora/typescript/no-unsafe-argument
			apiSubscriberRegistry.registerRouteSubscriber(properties, wrapper.instance);
			subscriberLogger.verbose(`Registered route subscriber ${wrapper.name} for entity ${properties.entity.name} with priority ${properties.priority ?? 0}`);
		}
	}
}
