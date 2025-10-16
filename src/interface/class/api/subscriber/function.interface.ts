import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunctionErrorExecutionContext } from "@interface/class/api/subscriber/function-error-execution-context.interface";
import type { IApiSubscriberFunctionExecutionContext } from "@interface/class/api/subscriber/function-execution-context.interface";
import type { IApiSubscriber } from "@interface/class/api/subscriber/interface";
import type { TApiFunctionCreateProperties } from "@type/decorator/api/function";

export interface IApiSubscriberFunction<E extends IApiBaseEntity> extends IApiSubscriber {
	onAfterCreate?(context: IApiSubscriberFunctionExecutionContext<E, E>): Promise<E | undefined>;
	onAfterDelete?(context: IApiSubscriberFunctionExecutionContext<E, E>): Promise<E | undefined>;

	onAfterErrorCreate?(context: IApiSubscriberFunctionErrorExecutionContext<E>, error: Error): Promise<void>;
	onAfterErrorDelete?(context: IApiSubscriberFunctionErrorExecutionContext<E>, error: Error): Promise<void>;

	onAfterErrorGet?(context: IApiSubscriberFunctionErrorExecutionContext<E>, error: Error): Promise<void>;
	onAfterErrorGetList?(context: IApiSubscriberFunctionErrorExecutionContext<E>, error: Error): Promise<void>;

	onAfterErrorGetMany?(context: IApiSubscriberFunctionErrorExecutionContext<E>, error: Error): Promise<void>;
	onAfterErrorUpdate?(context: IApiSubscriberFunctionErrorExecutionContext<E>, error: Error): Promise<void>;

	onAfterGet?(context: IApiSubscriberFunctionExecutionContext<E, E>): Promise<E | undefined>;
	onAfterGetList?(context: IApiSubscriberFunctionExecutionContext<E, Array<E>>): Promise<Array<E> | undefined>;

	onAfterGetMany?(context: IApiSubscriberFunctionExecutionContext<E, Array<E>>): Promise<Array<E> | undefined>;
	onAfterUpdate?(context: IApiSubscriberFunctionExecutionContext<E, E>): Promise<E | undefined>;

	onBeforeCreate?(context: IApiSubscriberFunctionExecutionContext<E, TApiFunctionCreateProperties<E>>): Promise<TApiFunctionCreateProperties<E> | undefined>;
	onBeforeDelete?(context: IApiSubscriberFunctionExecutionContext<E, E>): Promise<E | undefined>;
	onBeforeErrorCreate?(context: IApiSubscriberFunctionErrorExecutionContext<E>, error: Error): Promise<void>;
	onBeforeErrorDelete?(context: IApiSubscriberFunctionErrorExecutionContext<E>, error: Error): Promise<void>;
	onBeforeErrorGet?(context: IApiSubscriberFunctionErrorExecutionContext<E>, error: Error): Promise<void>;
	onBeforeErrorGetList?(context: IApiSubscriberFunctionErrorExecutionContext<E>, error: Error): Promise<void>;
	onBeforeErrorGetMany?(context: IApiSubscriberFunctionErrorExecutionContext<E>, error: Error): Promise<void>;
	onBeforeErrorUpdate?(context: IApiSubscriberFunctionErrorExecutionContext<E>, error: Error): Promise<void>;
	onBeforeGet?(context: IApiSubscriberFunctionExecutionContext<E, E>): Promise<E | undefined>;
	onBeforeGetList?(context: IApiSubscriberFunctionExecutionContext<E, E>): Promise<E | undefined>;
	onBeforeGetMany?(context: IApiSubscriberFunctionExecutionContext<E, E>): Promise<E | undefined>;
	onBeforeUpdate?(context: IApiSubscriberFunctionExecutionContext<E, TApiFunctionCreateProperties<E>>): Promise<TApiFunctionCreateProperties<E> | undefined>;
}
