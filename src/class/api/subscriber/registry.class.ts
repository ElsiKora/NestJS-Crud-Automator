import type { EApiControllerGetListQueryPaginationMode, EApiFunctionType, EApiRouteSubscriberAuthorizationExpectation, EApiRouteType } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunction } from "@interface/class/api/subscriber/function";
import type { IApiSubscriberRoute } from "@interface/class/api/subscriber/route.interface";
import type { IApiFunctionSubscriberProperties, IApiRouteSubscriberProperties } from "@interface/decorator/api/subscriber";

import { SubscriberWrapper } from "@class/api/subscriber/wrapper.class";
import { LoggerUtility } from "@utility/logger.utility";

const subscriberRegistryLogger: LoggerUtility = LoggerUtility.getLogger("ApiSubscriberRegistry");

class ApiSubscriberRegistry {
	private readonly FUNCTION_SUBSCRIBER_REGISTRATION_ORDER: WeakMap<IApiSubscriberFunction<IApiBaseEntity>, number>;

	private readonly FUNCTION_SUBSCRIBERS: Map<string, SubscriberWrapper<IApiSubscriberFunction<IApiBaseEntity>>>;

	private nextFunctionSubscriberRegistrationOrder: number;

	private readonly ROUTE_SUBSCRIBERS: Map<string, SubscriberWrapper<IApiSubscriberRoute<IApiBaseEntity, EApiRouteSubscriberAuthorizationExpectation, EApiControllerGetListQueryPaginationMode>>>;

	constructor() {
		this.FUNCTION_SUBSCRIBER_REGISTRATION_ORDER = new WeakMap();
		this.FUNCTION_SUBSCRIBERS = new Map();
		this.ROUTE_SUBSCRIBERS = new Map();
		this.nextFunctionSubscriberRegistrationOrder = 0;
	}

	public getFunctionSubscriberProperties<E extends IApiBaseEntity>(subscriber: IApiSubscriberFunction<E>): IApiFunctionSubscriberProperties<E> | undefined {
		for (const wrapper of this.FUNCTION_SUBSCRIBERS.values()) {
			const entry: { properties?: IApiFunctionSubscriberProperties<IApiBaseEntity>; subscriber: IApiSubscriberFunction<IApiBaseEntity> } | undefined = wrapper.subscribers.find((registeredSubscriber: { subscriber: IApiSubscriberFunction<IApiBaseEntity> }) => registeredSubscriber.subscriber === (subscriber as unknown as IApiSubscriberFunction<IApiBaseEntity>));

			if (entry) {
				return entry.properties as IApiFunctionSubscriberProperties<E> | undefined;
			}
		}

		return undefined;
	}

	public getFunctionSubscriberRegistrationOrder<E extends IApiBaseEntity>(subscriber: IApiSubscriberFunction<E>): number {
		return this.FUNCTION_SUBSCRIBER_REGISTRATION_ORDER.get(subscriber as unknown as IApiSubscriberFunction<IApiBaseEntity>) ?? Number.MAX_SAFE_INTEGER;
	}

	public getFunctionSubscribers<E extends IApiBaseEntity>(entityName: string, functionType?: EApiFunctionType, action?: string): Array<IApiSubscriberFunction<E>> {
		return (this.FUNCTION_SUBSCRIBERS.get(entityName)?.subscribers ?? []).filter((entry: { properties?: IApiFunctionSubscriberProperties<IApiBaseEntity>; subscriber: IApiSubscriberFunction<IApiBaseEntity> }) => this.isFunctionSubscriberMatching(entry.properties, functionType, action)).map((s: { subscriber: IApiSubscriberFunction<IApiBaseEntity> }) => s.subscriber) as unknown as Array<IApiSubscriberFunction<E>>;
	}

	public getRouteSubscribers<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE>(entityName: string, controller?: new (...arguments_: Array<unknown>) => unknown, routeType?: EApiRouteType, action?: string): Array<IApiSubscriberRoute<E, EApiRouteSubscriberAuthorizationExpectation, M>> {
		return (this.ROUTE_SUBSCRIBERS.get(entityName)?.subscribers ?? [])
			.filter((entry: { properties?: IApiRouteSubscriberProperties<IApiBaseEntity>; subscriber: IApiSubscriberRoute<IApiBaseEntity, EApiRouteSubscriberAuthorizationExpectation, EApiControllerGetListQueryPaginationMode> }) => this.isRouteSubscriberMatching(entry.properties, controller, routeType, action))
			.map((s: { subscriber: IApiSubscriberRoute<IApiBaseEntity, EApiRouteSubscriberAuthorizationExpectation, EApiControllerGetListQueryPaginationMode> }) => s.subscriber) as unknown as Array<IApiSubscriberRoute<E, EApiRouteSubscriberAuthorizationExpectation, M>>;
	}

	public registerFunctionSubscriber<E extends IApiBaseEntity>(properties: IApiFunctionSubscriberProperties<E>, subscriber: IApiSubscriberFunction<E>): void {
		const entityName: string = properties.entity.name;
		let wrapper: SubscriberWrapper<IApiSubscriberFunction<IApiBaseEntity>> | undefined = this.FUNCTION_SUBSCRIBERS.get(entityName);

		if (!wrapper) {
			wrapper = new SubscriberWrapper(entityName);
			this.FUNCTION_SUBSCRIBERS.set(entityName, wrapper);
		}

		if (!this.FUNCTION_SUBSCRIBER_REGISTRATION_ORDER.has(subscriber as unknown as IApiSubscriberFunction<IApiBaseEntity>)) {
			this.FUNCTION_SUBSCRIBER_REGISTRATION_ORDER.set(subscriber as unknown as IApiSubscriberFunction<IApiBaseEntity>, this.nextFunctionSubscriberRegistrationOrder);
			this.nextFunctionSubscriberRegistrationOrder += 1;
		}

		wrapper.addSubscriber(subscriber as unknown as IApiSubscriberFunction<IApiBaseEntity>, properties.priority, properties);

		subscriberRegistryLogger.debug(`Total function subscribers for "${entityName}": ${wrapper.getSubscriberCount()}`);
		subscriberRegistryLogger.debug(`Registered function subscriber entities: [${[...this.FUNCTION_SUBSCRIBERS.values()].map((registeredWrapper: SubscriberWrapper<IApiSubscriberFunction<IApiBaseEntity>>) => registeredWrapper.getName()).join(", ")}]`);
	}

	public registerRouteSubscriber<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE>(properties: IApiRouteSubscriberProperties<E>, subscriber: IApiSubscriberRoute<E, EApiRouteSubscriberAuthorizationExpectation, M>): void {
		const entityName: string = properties.entity.name;
		let wrapper: SubscriberWrapper<IApiSubscriberRoute<IApiBaseEntity, EApiRouteSubscriberAuthorizationExpectation, EApiControllerGetListQueryPaginationMode>> | undefined = this.ROUTE_SUBSCRIBERS.get(entityName);

		if (!wrapper) {
			wrapper = new SubscriberWrapper(entityName);
			this.ROUTE_SUBSCRIBERS.set(entityName, wrapper);
		}

		wrapper.addSubscriber(subscriber as unknown as IApiSubscriberRoute<IApiBaseEntity, EApiRouteSubscriberAuthorizationExpectation, EApiControllerGetListQueryPaginationMode>, properties.priority, properties);

		subscriberRegistryLogger.debug(`Total route subscribers for "${entityName}": ${wrapper.getSubscriberCount()}`);
		subscriberRegistryLogger.debug(`Registered route subscriber entities: [${[...this.ROUTE_SUBSCRIBERS.values()].map((registeredWrapper: SubscriberWrapper<IApiSubscriberRoute<IApiBaseEntity, EApiRouteSubscriberAuthorizationExpectation, EApiControllerGetListQueryPaginationMode>>) => registeredWrapper.getName()).join(", ")}]`);
	}

	/**
	 * Removes a function subscriber by identity from every entity it is registered for.
	 * @template E - Entity type handled by the subscriber.
	 * @param {IApiSubscriberFunction<E>} subscriber - Subscriber instance to remove.
	 * @returns {void}
	 */
	public unregisterFunctionSubscriber<E extends IApiBaseEntity>(subscriber: IApiSubscriberFunction<E>): void {
		this.removeSubscriber(this.FUNCTION_SUBSCRIBERS, subscriber as unknown as IApiSubscriberFunction<IApiBaseEntity>);
	}

	/**
	 * Removes a route subscriber by identity from every entity it is registered for.
	 * @template E - Entity type handled by the subscriber.
	 * @template M - Pagination mode of the subscriber's GET_LIST hooks.
	 * @param {IApiSubscriberRoute<E, EApiRouteSubscriberAuthorizationExpectation, M>} subscriber - Subscriber instance to remove.
	 * @returns {void}
	 */
	public unregisterRouteSubscriber<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE>(subscriber: IApiSubscriberRoute<E, EApiRouteSubscriberAuthorizationExpectation, M>): void {
		this.removeSubscriber(this.ROUTE_SUBSCRIBERS, subscriber as unknown as IApiSubscriberRoute<IApiBaseEntity, EApiRouteSubscriberAuthorizationExpectation, EApiControllerGetListQueryPaginationMode>);
	}

	private isFunctionSubscriberMatching(properties: IApiFunctionSubscriberProperties<IApiBaseEntity> | undefined, functionType?: EApiFunctionType, action?: string): boolean {
		if (!properties?.functions?.length) {
			return true;
		}

		return properties.functions.some((filter: NonNullable<IApiFunctionSubscriberProperties<IApiBaseEntity>["functions"]>[number]) => filter.type === functionType && (filter.action === undefined || filter.action === action));
	}

	private isRouteSubscriberMatching(properties: IApiRouteSubscriberProperties<IApiBaseEntity> | undefined, controller?: new (...arguments_: Array<unknown>) => unknown, routeType?: EApiRouteType, action?: string): boolean {
		if (!properties) {
			return true;
		}

		const isControllerMatching: boolean =
			!properties.controllers?.length ||
			properties.controllers.some((controllerReference: NonNullable<IApiRouteSubscriberProperties<IApiBaseEntity>["controllers"]>[number]) => {
				const resolvedController: new (...arguments_: Array<unknown>) => unknown = typeof controllerReference === "function" && "prototype" in controllerReference ? (controllerReference as new (...arguments_: Array<unknown>) => unknown) : (controllerReference as () => new (...arguments_: Array<unknown>) => unknown)();

				return resolvedController === controller;
			});
		const isRouteMatching: boolean = !properties.routes?.length || (routeType !== undefined && properties.routes.includes(routeType));
		const isActionMatching: boolean = !properties.actions?.length || (action !== undefined && properties.actions.includes(action));

		return isControllerMatching && isRouteMatching && isActionMatching;
	}

	/**
	 * Removes a subscriber from all wrappers of a registry map and drops the wrappers that become empty.
	 * @template T - Subscriber type stored in the wrappers.
	 * @param {Map<string, SubscriberWrapper<T>>} wrappers - Registry map keyed by entity name.
	 * @param {T} subscriber - Subscriber instance to remove.
	 * @returns {void}
	 */
	private removeSubscriber<T>(wrappers: Map<string, SubscriberWrapper<T>>, subscriber: T): void {
		for (const [entityName, wrapper] of wrappers) {
			wrapper.removeSubscriber(subscriber);

			if (wrapper.getSubscriberCount() === 0) {
				wrappers.delete(entityName);
			}
		}
	}
}

export const apiSubscriberRegistry: ApiSubscriberRegistry = new ApiSubscriberRegistry();
