import { SUBSCRIBER_API_DECORATOR_CONSTANT } from "@constant/decorator/api/subscriber.constant";
import { IApiBaseEntity } from "@interface/api-base-entity.interface";
import { Injectable, OnModuleInit } from "@nestjs/common";
import { DiscoveryService } from "@nestjs/core";
import { InstanceWrapper } from "@nestjs/core/injector/instance-wrapper";
import { LoggerUtility } from "@utility/logger.utility";

import { ApiFunctionSubscriberBase } from "./function-base.class";
import { apiSubscriberRegistry } from "./registry.class";
import { ApiRouteSubscriberBase } from "./route-base.class";

const subscriberLogger = LoggerUtility.getLogger("ApiSubscriberDiscoveryService");

@Injectable()
export class ApiSubscriberDiscoveryService implements OnModuleInit {
	constructor(private readonly discoveryService: DiscoveryService) {}

	onModuleInit(): void {
		subscriberLogger.verbose("Starting subscriber discovery...");
		const providers = this.discoveryService.getProviders();
		this.registerFunctionSubscribers(providers);
		this.registerRouteSubscribers(providers);
		subscriberLogger.verbose("Subscriber discovery finished.");
	}

	private registerFunctionSubscribers(providers: Array<InstanceWrapper>): void {
		const functionSubscribers = providers.filter((wrapper) => wrapper.instance && wrapper.metatype && wrapper.instance instanceof ApiFunctionSubscriberBase && Reflect.hasMetadata(SUBSCRIBER_API_DECORATOR_CONSTANT.FUNCTION_METADATA_KEY, wrapper.metatype));

		for (const wrapper of functionSubscribers) {
			const properties: { entity: new (...arguments_: Array<any>) => IApiBaseEntity } = Reflect.getMetadata(SUBSCRIBER_API_DECORATOR_CONSTANT.FUNCTION_METADATA_KEY, wrapper.metatype!);
			apiSubscriberRegistry.registerFunctionSubscriber(properties.entity, wrapper.instance);
			subscriberLogger.verbose(`Registered function subscriber ${wrapper.name} for entity ${properties.entity.name}`);
		}
	}

	private registerRouteSubscribers(providers: Array<InstanceWrapper>): void {
		const routeSubscribers = providers.filter((wrapper) => wrapper.instance && wrapper.metatype && wrapper.instance instanceof ApiRouteSubscriberBase && Reflect.hasMetadata(SUBSCRIBER_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, wrapper.metatype));

		for (const wrapper of routeSubscribers) {
			const properties: { entity: new (...arguments_: Array<any>) => IApiBaseEntity } = Reflect.getMetadata(SUBSCRIBER_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, wrapper.metatype!);
			apiSubscriberRegistry.registerRouteSubscriber(properties.entity, wrapper.instance);
			subscriberLogger.verbose(`Registered route subscriber ${wrapper.name} for entity ${properties.entity.name}`);
		}
	}
}
