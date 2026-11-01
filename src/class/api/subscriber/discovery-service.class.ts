import type { EApiControllerGetListQueryPaginationMode, EApiRouteSubscriberAuthorizationExpectation } from "@enum/decorator/api";
import type { IApiSubscriberFunction } from "@interface/class/api/subscriber/function";
import type { IApiSubscriberRoute } from "@interface/class/api/subscriber/route.interface";

import { ApiFunctionSubscriberBase } from "@class/api/subscriber/function-base.class";
import { apiSubscriberRegistry } from "@class/api/subscriber/registry.class";
import { ApiRouteSubscriberBase } from "@class/api/subscriber/route-base.class";
import { SUBSCRIBER_API_DECORATOR_CONSTANT } from "@constant/decorator/api/subscriber.constant";
import { IApiBaseEntity } from "@interface/api-base-entity.interface";
import { IApiFunctionSubscriberProperties, IApiRouteSubscriberProperties } from "@interface/decorator/api/subscriber";
import { Injectable, OnApplicationShutdown, OnModuleInit } from "@nestjs/common";
import { DiscoveryService } from "@nestjs/core";
import { InstanceWrapper } from "@nestjs/core/internal";
import { LoggerUtility } from "@utility/logger.utility";

const subscriberLogger: LoggerUtility = LoggerUtility.getLogger("ApiSubscriberDiscoveryService");

@Injectable()
export class ApiSubscriberDiscoveryService implements OnApplicationShutdown, OnModuleInit {
	private readonly REGISTERED_FUNCTION_SUBSCRIBERS: Set<IApiSubscriberFunction<IApiBaseEntity>>;

	private readonly REGISTERED_ROUTE_SUBSCRIBERS: Set<IApiSubscriberRoute<IApiBaseEntity, EApiRouteSubscriberAuthorizationExpectation, EApiControllerGetListQueryPaginationMode>>;

	constructor(private readonly discoveryService: DiscoveryService) {
		this.REGISTERED_FUNCTION_SUBSCRIBERS = new Set();
		this.REGISTERED_ROUTE_SUBSCRIBERS = new Set();
	}

	/**
	 * Removes the subscribers this application registered.
	 * Nest closes the HTTP server before this hook, so a request whose connection stays open until its response keeps its subscribers; `onModuleDestroy` would run too early.
	 * A handler can outlive the server close when its client disconnected or the adapter uses `forceCloseConnections`; its later subscriber lookups then find nothing.
	 */
	onApplicationShutdown(): void {
		for (const subscriber of this.REGISTERED_FUNCTION_SUBSCRIBERS) {
			apiSubscriberRegistry.unregisterFunctionSubscriber(subscriber);
		}

		for (const subscriber of this.REGISTERED_ROUTE_SUBSCRIBERS) {
			apiSubscriberRegistry.unregisterRouteSubscriber<IApiBaseEntity, EApiControllerGetListQueryPaginationMode>(subscriber);
		}

		subscriberLogger.verbose(`Removed ${this.REGISTERED_FUNCTION_SUBSCRIBERS.size} function and ${this.REGISTERED_ROUTE_SUBSCRIBERS.size} route subscribers.`);
		this.REGISTERED_FUNCTION_SUBSCRIBERS.clear();
		this.REGISTERED_ROUTE_SUBSCRIBERS.clear();
	}

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
			const subscriber: IApiSubscriberFunction<IApiBaseEntity> = wrapper.instance as IApiSubscriberFunction<IApiBaseEntity>;
			apiSubscriberRegistry.registerFunctionSubscriber(properties, subscriber);
			this.REGISTERED_FUNCTION_SUBSCRIBERS.add(subscriber);
			subscriberLogger.verbose(`Registered function subscriber ${wrapper.name} for entity ${properties.entity.name} with priority ${properties.priority ?? 0}`);
		}
	}

	private registerRouteSubscribers(providers: Array<InstanceWrapper>): void {
		const routeSubscribers: Array<InstanceWrapper> = providers.filter((wrapper: InstanceWrapper) => wrapper.instance && wrapper.metatype && wrapper.instance instanceof ApiRouteSubscriberBase && Reflect.hasMetadata(SUBSCRIBER_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, wrapper.metatype));

		for (const wrapper of routeSubscribers) {
			// eslint-disable-next-line @elsikora/typescript/no-non-null-assertion
			const properties: IApiRouteSubscriberProperties<IApiBaseEntity> = Reflect.getMetadata(SUBSCRIBER_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, wrapper.metatype!) as IApiRouteSubscriberProperties<IApiBaseEntity>;
			const subscriber: IApiSubscriberRoute<IApiBaseEntity, EApiRouteSubscriberAuthorizationExpectation, EApiControllerGetListQueryPaginationMode> = wrapper.instance as IApiSubscriberRoute<IApiBaseEntity, EApiRouteSubscriberAuthorizationExpectation, EApiControllerGetListQueryPaginationMode>;
			apiSubscriberRegistry.registerRouteSubscriber<IApiBaseEntity, EApiControllerGetListQueryPaginationMode>(properties, subscriber);
			this.REGISTERED_ROUTE_SUBSCRIBERS.add(subscriber);
			subscriberLogger.verbose(`Registered route subscriber ${wrapper.name} for entity ${properties.entity.name} with priority ${properties.priority ?? 0}`);
		}
	}
}
