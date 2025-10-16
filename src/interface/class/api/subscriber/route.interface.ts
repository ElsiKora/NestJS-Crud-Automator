import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriber } from "@interface/class/api/subscriber/interface";
import type { IApiSubscriberRouteErrorExecutionContext } from "@interface/class/api/subscriber/route-error-execution-context.interface";
import type { IApiSubscriberRouteExecutionContext } from "@interface/class/api/subscriber/route-execution-context.interface";
import type { DeepPartial } from "typeorm";

export interface IApiSubscriberRoute<E extends IApiBaseEntity> extends IApiSubscriber {
	onAfterCreate?(context: IApiSubscriberRouteExecutionContext<E, E>): Promise<E | undefined>;
	onAfterDelete?(context: IApiSubscriberRouteExecutionContext<E, E>): Promise<E | undefined>;

	onAfterErrorCreate?(context: IApiSubscriberRouteErrorExecutionContext<E>, error: Error): Promise<void>;
	onAfterErrorDelete?(context: IApiSubscriberRouteErrorExecutionContext<E>, error: Error): Promise<void>;

	onAfterErrorGet?(context: IApiSubscriberRouteErrorExecutionContext<E>, error: Error): Promise<void>;
	onAfterErrorGetList?(context: IApiSubscriberRouteErrorExecutionContext<E>, error: Error): Promise<void>;

	onAfterErrorGetMany?(context: IApiSubscriberRouteErrorExecutionContext<E>, error: Error): Promise<void>;
	onAfterErrorUpdate?(context: IApiSubscriberRouteErrorExecutionContext<E>, error: Error): Promise<void>;

	onAfterGet?(context: IApiSubscriberRouteExecutionContext<E, E>): Promise<E | undefined>;
	onAfterGetList?(context: IApiSubscriberRouteExecutionContext<E, Array<E>>): Promise<Array<E> | undefined>;

	onAfterGetMany?(context: IApiSubscriberRouteExecutionContext<E, Array<E>>): Promise<Array<E> | undefined>;
	onAfterUpdate?(context: IApiSubscriberRouteExecutionContext<E, E>): Promise<E | undefined>;

	onBeforeCreate?(context: IApiSubscriberRouteExecutionContext<E, { body: DeepPartial<E> }>): Promise<{ body: DeepPartial<E> } | undefined>;
	onBeforeDelete?(context: IApiSubscriberRouteExecutionContext<E, E>): Promise<E | undefined>;
	onBeforeErrorCreate?(context: IApiSubscriberRouteErrorExecutionContext<E>, error: Error): Promise<void>;
	onBeforeErrorDelete?(context: IApiSubscriberRouteErrorExecutionContext<E>, error: Error): Promise<void>;
	onBeforeErrorGet?(context: IApiSubscriberRouteErrorExecutionContext<E>, error: Error): Promise<void>;
	onBeforeErrorGetList?(context: IApiSubscriberRouteErrorExecutionContext<E>, error: Error): Promise<void>;
	onBeforeErrorGetMany?(context: IApiSubscriberRouteErrorExecutionContext<E>, error: Error): Promise<void>;
	onBeforeErrorUpdate?(context: IApiSubscriberRouteErrorExecutionContext<E>, error: Error): Promise<void>;
	onBeforeGet?(context: IApiSubscriberRouteExecutionContext<E, E>): Promise<E | undefined>;
	onBeforeGetList?(context: IApiSubscriberRouteExecutionContext<E, E>): Promise<E | undefined>;
	onBeforeGetMany?(context: IApiSubscriberRouteExecutionContext<E, E>): Promise<E | undefined>;
	onBeforeUpdate?(context: IApiSubscriberRouteExecutionContext<E, { body: DeepPartial<E> }>): Promise<{ body: DeepPartial<E> } | undefined>;
}
