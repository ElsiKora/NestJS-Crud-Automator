import type { EApiFunctionType, EApiRouteType } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunction } from "@interface/class/api/subscriber/function.interface";
import type { IApiSubscriberRoute } from "@interface/class/api/subscriber/route.interface";
import type { IApiFunctionSubscriberProperties, IApiRouteSubscriberProperties } from "@interface/decorator/api/subscriber";

import { LoggerUtility } from "@utility/logger.utility";

import { SubscriberWrapper } from "./wrapper.class";

const subscriberRegistryLogger: LoggerUtility = LoggerUtility.getLogger("ApiSubscriberRegistry");

class ApiSubscriberRegistry {
	private readonly FUNCTION_SUBSCRIBERS: Map<string, SubscriberWrapper<IApiSubscriberFunction<IApiBaseEntity>>>;

	private readonly ROUTE_SUBSCRIBERS: Map<string, SubscriberWrapper<IApiSubscriberRoute<IApiBaseEntity>>>;

	constructor() {
		this.FUNCTION_SUBSCRIBERS = new Map();
		this.ROUTE_SUBSCRIBERS = new Map();
	}

	public getFunctionSubscribers<E extends IApiBaseEntity>(entityName: string, functionType?: EApiFunctionType, action?: string): Array<IApiSubscriberFunction<E>> {
		return (this.FUNCTION_SUBSCRIBERS.get(entityName)?.subscribers ?? []).filter((entry: { properties?: IApiFunctionSubscriberProperties<IApiBaseEntity>; subscriber: IApiSubscriberFunction<IApiBaseEntity> }) => this.isFunctionSubscriberMatching(entry.properties, functionType, action)).map((s: { subscriber: IApiSubscriberFunction<IApiBaseEntity> }) => s.subscriber) as unknown as Array<IApiSubscriberFunction<E>>;
	}

	public getRouteSubscribers<E extends IApiBaseEntity>(entityName: string, controller?: new (...arguments_: Array<unknown>) => unknown, routeType?: EApiRouteType, action?: string): Array<IApiSubscriberRoute<E>> {
		return (this.ROUTE_SUBSCRIBERS.get(entityName)?.subscribers ?? []).filter((entry: { properties?: IApiRouteSubscriberProperties<IApiBaseEntity>; subscriber: IApiSubscriberRoute<IApiBaseEntity> }) => this.isRouteSubscriberMatching(entry.properties, controller, routeType, action)).map((s: { subscriber: IApiSubscriberRoute<IApiBaseEntity> }) => s.subscriber) as unknown as Array<IApiSubscriberRoute<E>>;
	}

	public registerFunctionSubscriber<E extends IApiBaseEntity>(properties: IApiFunctionSubscriberProperties<E>, subscriber: IApiSubscriberFunction<E>): void {
		const entityName: string = properties.entity.name;
		let wrapper: SubscriberWrapper<IApiSubscriberFunction<IApiBaseEntity>> | undefined = this.FUNCTION_SUBSCRIBERS.get(entityName);

		if (!wrapper) {
			wrapper = new SubscriberWrapper(entityName);
			this.FUNCTION_SUBSCRIBERS.set(entityName, wrapper);
		}

		wrapper.addSubscriber(subscriber as unknown as IApiSubscriberFunction<IApiBaseEntity>, properties.priority, properties as unknown as IApiFunctionSubscriberProperties<IApiBaseEntity>);

		subscriberRegistryLogger.debug(`Total function subscribers for "${entityName}": ${wrapper.getSubscriberCount()}`);
		subscriberRegistryLogger.debug(`Registered function subscriber entities: [${[...this.FUNCTION_SUBSCRIBERS.values()].map((registeredWrapper: SubscriberWrapper<IApiSubscriberFunction<IApiBaseEntity>>) => registeredWrapper.getName()).join(", ")}]`);
	}

	public registerRouteSubscriber<E extends IApiBaseEntity>(properties: IApiRouteSubscriberProperties<E>, subscriber: IApiSubscriberRoute<E>): void {
		const entityName: string = properties.entity.name;
		let wrapper: SubscriberWrapper<IApiSubscriberRoute<IApiBaseEntity>> | undefined = this.ROUTE_SUBSCRIBERS.get(entityName);

		if (!wrapper) {
			wrapper = new SubscriberWrapper(entityName);
			this.ROUTE_SUBSCRIBERS.set(entityName, wrapper);
		}

		wrapper.addSubscriber(subscriber as unknown as IApiSubscriberRoute<IApiBaseEntity>, properties.priority, properties as unknown as IApiRouteSubscriberProperties<IApiBaseEntity>);

		subscriberRegistryLogger.debug(`Total route subscribers for "${entityName}": ${wrapper.getSubscriberCount()}`);
		subscriberRegistryLogger.debug(`Registered route subscriber entities: [${[...this.ROUTE_SUBSCRIBERS.values()].map((registeredWrapper: SubscriberWrapper<IApiSubscriberRoute<IApiBaseEntity>>) => registeredWrapper.getName()).join(", ")}]`);
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
}

export const apiSubscriberRegistry: ApiSubscriberRegistry = new ApiSubscriberRegistry();
