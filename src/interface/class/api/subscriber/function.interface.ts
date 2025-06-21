import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunctionExecutionContext } from "@interface/class/api/subscriber/function-execution-context.interface";
import type { IApiSubscriber } from "@interface/class/api/subscriber/interface";
import type { TApiFunctionCreateProperties } from "@type/decorator/api/function";

export interface IApiSubscriberFunction<E extends IApiBaseEntity> extends IApiSubscriber {
	onAfterCreate?(context: IApiSubscriberFunctionExecutionContext<E, E>): Promise<E | undefined>;
	onAfterDelete?(context: IApiSubscriberFunctionExecutionContext<E, E>): Promise<E | undefined>;

	onAfterErrorCreate?(context: IApiSubscriberFunctionExecutionContext<E, never>, error: Error): Promise<void>;
	onAfterErrorDelete?(context: IApiSubscriberFunctionExecutionContext<E, never>, error: Error): Promise<void>;

	onAfterErrorGet?(context: IApiSubscriberFunctionExecutionContext<E, never>, error: Error): Promise<void>;
	onAfterErrorGetList?(context: IApiSubscriberFunctionExecutionContext<E, never>, error: Error): Promise<void>;

	onAfterErrorGetMany?(context: IApiSubscriberFunctionExecutionContext<E, never>, error: Error): Promise<void>;
	onAfterErrorUpdate?(context: IApiSubscriberFunctionExecutionContext<E, never>, error: Error): Promise<void>;

	onAfterGet?(context: IApiSubscriberFunctionExecutionContext<E, E>): Promise<E | undefined>;
	onAfterGetList?(context: IApiSubscriberFunctionExecutionContext<E, Array<E>>): Promise<Array<E> | undefined>;

	onAfterGetMany?(context: IApiSubscriberFunctionExecutionContext<E, Array<E>>): Promise<Array<E> | undefined>;
	onAfterUpdate?(context: IApiSubscriberFunctionExecutionContext<E, E>): Promise<E | undefined>;

	onBeforeCreate?(context: IApiSubscriberFunctionExecutionContext<E, TApiFunctionCreateProperties<E>>): Promise<TApiFunctionCreateProperties<E> | undefined>;
	onBeforeDelete?(context: IApiSubscriberFunctionExecutionContext<E, E>): Promise<E | undefined>;
	onBeforeErrorCreate?(context: IApiSubscriberFunctionExecutionContext<E, never>, error: Error): Promise<void>;
	onBeforeErrorDelete?(context: IApiSubscriberFunctionExecutionContext<E, never>, error: Error): Promise<void>;
	onBeforeErrorGet?(context: IApiSubscriberFunctionExecutionContext<E, never>, error: Error): Promise<void>;
	onBeforeErrorGetList?(context: IApiSubscriberFunctionExecutionContext<E, never>, error: Error): Promise<void>;
	onBeforeErrorGetMany?(context: IApiSubscriberFunctionExecutionContext<E, never>, error: Error): Promise<void>;
	onBeforeErrorUpdate?(context: IApiSubscriberFunctionExecutionContext<E, never>, error: Error): Promise<void>;
	onBeforeGet?(context: IApiSubscriberFunctionExecutionContext<E, E>): Promise<E | undefined>;
	onBeforeGetList?(context: IApiSubscriberFunctionExecutionContext<E, E>): Promise<E | undefined>;
	onBeforeGetMany?(context: IApiSubscriberFunctionExecutionContext<E, E>): Promise<E | undefined>;
	onBeforeUpdate?(context: IApiSubscriberFunctionExecutionContext<E, TApiFunctionCreateProperties<E>>): Promise<TApiFunctionCreateProperties<E> | undefined>;
}
