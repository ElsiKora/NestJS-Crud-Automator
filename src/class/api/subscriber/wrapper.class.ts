import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiFunctionSubscriberProperties, IApiRouteSubscriberProperties } from "@interface/decorator/api/subscriber";

export class SubscriberWrapper<T> {
	constructor(
		private readonly name: string,
		public subscribers: Array<{ priority: number; properties?: IApiFunctionSubscriberProperties<IApiBaseEntity> | IApiRouteSubscriberProperties<IApiBaseEntity>; subscriber: T }> = [],
	) {}

	public addSubscriber(subscriber: T, priority: number = 0, properties?: IApiFunctionSubscriberProperties<IApiBaseEntity> | IApiRouteSubscriberProperties<IApiBaseEntity>): void {
		this.subscribers.push({ priority, properties, subscriber });
		this.subscribers.sort((a: { priority: number; subscriber: T }, b: { priority: number; subscriber: T }) => b.priority - a.priority);
	}

	public getName(): string {
		return this.name;
	}

	public getSubscriberCount(): number {
		return this.subscribers.length;
	}
}
