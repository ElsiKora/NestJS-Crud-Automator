import { IApiBaseEntity } from "@interface/api-base-entity.interface";
import { IApiSubscriber } from "@interface/class/api/subscriber/interface";
import { IApiSubscriberFunctionExecutionContext } from "@interface/class/api/subscriber/function-execution-context.interface";
import { TApiFunctionCreateProperties } from "@type/decorator/api/function";

export interface IApiSubscriberFunction<E extends IApiBaseEntity> extends IApiSubscriber {
    [key: string]: any;

    onBeforeCreate?(
        context: IApiSubscriberFunctionExecutionContext<E, TApiFunctionCreateProperties<E>, unknown>
    ): Promise<TApiFunctionCreateProperties<E> | undefined>;
    onAfterCreate?(
        context: IApiSubscriberFunctionExecutionContext<E, E, unknown>
    ): Promise<E | undefined>;

    onBeforeUpdate?(
        context: IApiSubscriberFunctionExecutionContext<E, TApiFunctionCreateProperties<E>, unknown>
    ): Promise<TApiFunctionCreateProperties<E> | undefined>;
    onAfterUpdate?(
        context: IApiSubscriberFunctionExecutionContext<E, E, unknown>
    ): Promise<E | undefined>;

    onBeforeDelete?(
        context: IApiSubscriberFunctionExecutionContext<E, E, unknown>
    ): Promise<E | undefined>;
    onAfterDelete?(
        context: IApiSubscriberFunctionExecutionContext<E, E, unknown>
    ): Promise<E | undefined>;

    onBeforeGet?(
        context: IApiSubscriberFunctionExecutionContext<E, E, unknown>
    ): Promise<E | undefined>;
    onAfterGet?(
        context: IApiSubscriberFunctionExecutionContext<E, E, unknown>
    ): Promise<E | undefined>;

    onBeforeGetList?(
        context: IApiSubscriberFunctionExecutionContext<E, E, unknown>
    ): Promise<E | undefined>;
    onAfterGetList?(
        context: IApiSubscriberFunctionExecutionContext<E, Array<E>, unknown>
    ): Promise<Array<E> | undefined>;
    
    onBeforeGetMany?(
        context: IApiSubscriberFunctionExecutionContext<E, E, unknown>
    ): Promise<E | undefined>;
    onAfterGetMany?(
        context: IApiSubscriberFunctionExecutionContext<E, Array<E>, unknown>
    ): Promise<Array<E> | undefined>;

    onBeforeErrorCreate?(context: IApiSubscriberFunctionExecutionContext<E, never, unknown>, error: Error): Promise<void>;
    onAfterErrorCreate?(context: IApiSubscriberFunctionExecutionContext<E, never, unknown>, error: Error): Promise<void>;
    onBeforeErrorUpdate?(context: IApiSubscriberFunctionExecutionContext<E, never, unknown>, error: Error): Promise<void>;
    onAfterErrorUpdate?(context: IApiSubscriberFunctionExecutionContext<E, never, unknown>, error: Error): Promise<void>;
    onBeforeErrorDelete?(context: IApiSubscriberFunctionExecutionContext<E, never, unknown>, error: Error): Promise<void>;
    onAfterErrorDelete?(context: IApiSubscriberFunctionExecutionContext<E, never, unknown>, error: Error): Promise<void>;
    onBeforeErrorGet?(context: IApiSubscriberFunctionExecutionContext<E, never, unknown>, error: Error): Promise<void>;
    onAfterErrorGet?(context: IApiSubscriberFunctionExecutionContext<E, never, unknown>, error: Error): Promise<void>;
    onBeforeErrorGetList?(context: IApiSubscriberFunctionExecutionContext<E, never, unknown>, error: Error): Promise<void>;
    onAfterErrorGetList?(context: IApiSubscriberFunctionExecutionContext<E, never, unknown>, error: Error): Promise<void>;
    onBeforeErrorGetMany?(context: IApiSubscriberFunctionExecutionContext<E, never, unknown>, error: Error): Promise<void>;
    onAfterErrorGetMany?(context: IApiSubscriberFunctionExecutionContext<E, never, unknown>, error: Error): Promise<void>;
} 