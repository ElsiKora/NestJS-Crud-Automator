import type { IRegistry } from "@elsikora/cladi";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunction } from "@interface/class/api/subscriber/function.interface";
import type { IApiSubscriberRoute } from "@interface/class/api/subscriber/route.interface";
import type { IApiFunctionSubscriberProperties, IApiRouteSubscriberProperties } from "@interface/decorator/api/subscriber";

import { createRegistry } from "@elsikora/cladi";
import { LoggerUtility } from "@utility/logger.utility";

const subscriberRegistryLogger: LoggerUtility = LoggerUtility.getLogger("ApiSubscriberRegistry");

class ApiSubscriberRegistry {
	private readonly FUNCTION_SUBSCRIBERS: IRegistry<SubscriberWrapper<IApiSubscriberFunction<IApiBaseEntity>>>;

	private readonly ROUTE_SUBSCRIBERS: IRegistry<SubscriberWrapper<IApiSubscriberRoute<IApiBaseEntity>>>;

	constructor() {
		this.FUNCTION_SUBSCRIBERS = createRegistry<SubscriberWrapper<IApiSubscriberFunction<IApiBaseEntity>>>({});
		this.ROUTE_SUBSCRIBERS = createRegistry<SubscriberWrapper<IApiSubscriberRoute<IApiBaseEntity>>>({});
	}

	public getFunctionSubscribers<E extends IApiBaseEntity>(entityName: string): Array<IApiSubscriberFunction<E>> {
		return (this.FUNCTION_SUBSCRIBERS.get(entityName)?.subscribers ?? []).map((s: { priority: number; subscriber: IApiSubscriberFunction<IApiBaseEntity> }) => s.subscriber) as Array<IApiSubscriberFunction<E>>;
	}

	public getRouteSubscribers<E extends IApiBaseEntity>(entityName: string): Array<IApiSubscriberRoute<E>> {
		return (this.ROUTE_SUBSCRIBERS.get(entityName)?.subscribers ?? []).map((s: { priority: number; subscriber: IApiSubscriberRoute<IApiBaseEntity> }) => s.subscriber) as Array<IApiSubscriberRoute<E>>;
	}

	public registerFunctionSubscriber<E extends IApiBaseEntity>(properties: IApiFunctionSubscriberProperties<E>, subscriber: IApiSubscriberFunction<E>): void {
		const entityName: string = properties.entity.name;
		let wrapper: SubscriberWrapper<IApiSubscriberFunction<IApiBaseEntity>> | undefined = this.FUNCTION_SUBSCRIBERS.get(entityName);

		if (!wrapper) {
			wrapper = new SubscriberWrapper(entityName);
			this.FUNCTION_SUBSCRIBERS.register(wrapper);
		}

		wrapper.addSubscriber(subscriber, properties.priority);

		subscriberRegistryLogger.debug(`Total function subscribers for "${entityName}": ${wrapper.getSubscriberCount()}`);
		subscriberRegistryLogger.debug(
			`Registered function subscriber entities: [${this.FUNCTION_SUBSCRIBERS.getAll()
				.map((registeredWrapper: SubscriberWrapper<IApiSubscriberFunction<IApiBaseEntity>>) => registeredWrapper.getName())
				.join(", ")}]`,
		);
	}

	public registerRouteSubscriber<E extends IApiBaseEntity>(properties: IApiRouteSubscriberProperties<E>, subscriber: IApiSubscriberRoute<E>): void {
		const entityName: string = properties.entity.name;
		let wrapper: SubscriberWrapper<IApiSubscriberRoute<IApiBaseEntity>> | undefined = this.ROUTE_SUBSCRIBERS.get(entityName);

		if (!wrapper) {
			wrapper = new SubscriberWrapper(entityName);
			this.ROUTE_SUBSCRIBERS.register(wrapper);
		}

		wrapper.addSubscriber(subscriber, properties.priority);

		subscriberRegistryLogger.debug(`Total route subscribers for "${entityName}": ${wrapper.getSubscriberCount()}`);
		subscriberRegistryLogger.debug(
			`Registered route subscriber entities: [${this.ROUTE_SUBSCRIBERS.getAll()
				.map((registeredWrapper: SubscriberWrapper<IApiSubscriberRoute<IApiBaseEntity>>) => registeredWrapper.getName())
				.join(", ")}]`,
		);
	}
}

class SubscriberWrapper<T> {
	constructor(
		private readonly name: string,
		public subscribers: Array<{ priority: number; subscriber: T }> = [],
	) {}

	addSubscriber(subscriber: T, priority: number = 0): void {
		this.subscribers.push({ priority, subscriber });
		this.subscribers.sort((a: { priority: number; subscriber: T }, b: { priority: number; subscriber: T }) => b.priority - a.priority);
	}

	getName(): string {
		return this.name;
	}

	getSubscriberCount(): number {
		return this.subscribers.length;
	}
}

export const apiSubscriberRegistry: ApiSubscriberRegistry = new ApiSubscriberRegistry();
