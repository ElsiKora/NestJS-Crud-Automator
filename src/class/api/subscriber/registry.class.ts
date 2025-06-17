import type { IRegistry } from "@elsikora/cladi";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunction } from "@interface/class/api/subscriber/function.interface";
import type { IApiSubscriberRoute } from "@interface/class/api/subscriber/route.interface";

import { createRegistry } from "@elsikora/cladi";

class ApiSubscriberRegistry {
	private readonly functionSubscribers: IRegistry<SubscriberWrapper<IApiSubscriberFunction<any>>>;

	private readonly routeSubscribers: IRegistry<SubscriberWrapper<IApiSubscriberRoute<any>>>;

	constructor() {
		this.functionSubscribers = createRegistry<SubscriberWrapper<IApiSubscriberFunction<any>>>({});
		this.routeSubscribers = createRegistry<SubscriberWrapper<IApiSubscriberRoute<any>>>({});
	}

	public getFunctionSubscribers<E extends IApiBaseEntity>(entityName: string): Array<IApiSubscriberFunction<E>> {
		return (this.functionSubscribers.get(entityName)?.subscribers ?? []) as Array<IApiSubscriberFunction<E>>;
	}

	public getRouteSubscribers<E extends IApiBaseEntity>(entityName: string): Array<IApiSubscriberRoute<E>> {
		return (this.routeSubscribers.get(entityName)?.subscribers ?? []) as Array<IApiSubscriberRoute<E>>;
	}

	public registerFunctionSubscriber<E extends IApiBaseEntity>(entity: new (...arguments_: Array<any>) => E, subscriber: IApiSubscriberFunction<E>): void {
		const entityName = entity.name;
		let wrapper = this.functionSubscribers.get(entityName);

		if (!wrapper) {
			wrapper = new SubscriberWrapper(entityName);
			this.functionSubscribers.register(wrapper);
		}

		wrapper.subscribers.push(subscriber);
	}

	public registerRouteSubscriber<E extends IApiBaseEntity>(entity: new (...arguments_: Array<any>) => E, subscriber: IApiSubscriberRoute<E>): void {
		const entityName = entity.name;
		let wrapper = this.routeSubscribers.get(entityName);

		if (!wrapper) {
			wrapper = new SubscriberWrapper(entityName);
			this.routeSubscribers.register(wrapper);
		}

		wrapper.subscribers.push(subscriber);
	}
}

class SubscriberWrapper<T> {
	constructor(
		private readonly name: string,
		public subscribers: Array<T> = [],
	) {}

	getName(): string {
		return this.name;
	}
}

export const apiSubscriberRegistry = new ApiSubscriberRegistry();
