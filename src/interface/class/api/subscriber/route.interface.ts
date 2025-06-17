import { IApiBaseEntity } from "@interface/api-base-entity.interface";
import { IApiSubscriber } from "@interface/class/api/subscriber/interface";
import { IApiSubscriberRouteExecutionContext } from "@interface/class/api/subscriber/route-execution-context.interface";
import { DeepPartial } from "typeorm";

export interface IApiSubscriberRoute<E extends IApiBaseEntity> extends IApiSubscriber {
    [key: string]: any;

    onBeforeCreate?(
        context: IApiSubscriberRouteExecutionContext<E, { body: DeepPartial<E> }>
    ): Promise<{ body: DeepPartial<E> } | undefined>;
    onAfterCreate?(
        context: IApiSubscriberRouteExecutionContext<E, E>
    ): Promise<E | undefined>;

    onBeforeUpdate?(
        context: IApiSubscriberRouteExecutionContext<E, { body: DeepPartial<E> }>
    ): Promise<{ body: DeepPartial<E> } | undefined>;
    onAfterUpdate?(
        context: IApiSubscriberRouteExecutionContext<E, E>
    ): Promise<E | undefined>;

    onBeforeDelete?(
        context: IApiSubscriberRouteExecutionContext<E, E>
    ): Promise<E | undefined>;
    onAfterDelete?(
        context: IApiSubscriberRouteExecutionContext<E, E>
    ): Promise<E | undefined>;

    onBeforeGet?(
        context: IApiSubscriberRouteExecutionContext<E, E>
    ): Promise<E | undefined>;
    onAfterGet?(
        context: IApiSubscriberRouteExecutionContext<E, E>
    ): Promise<E | undefined>;
    
    onBeforeGetList?(
        context: IApiSubscriberRouteExecutionContext<E, E>
    ): Promise<E | undefined>;
    onAfterGetList?(
        context: IApiSubscriberRouteExecutionContext<E, Array<E>>
    ): Promise<Array<E> | undefined>;

    onBeforeGetMany?(
        context: IApiSubscriberRouteExecutionContext<E, E>
    ): Promise<E | undefined>;
    onAfterGetMany?(
        context: IApiSubscriberRouteExecutionContext<E, Array<E>>
    ): Promise<Array<E> | undefined>;

    onBeforeErrorCreate?(context: IApiSubscriberRouteExecutionContext<E, never, unknown>, error: Error): Promise<void>;
    onAfterErrorCreate?(context: IApiSubscriberRouteExecutionContext<E, never, unknown>, error: Error): Promise<void>;
    onBeforeErrorUpdate?(context: IApiSubscriberRouteExecutionContext<E, never, unknown>, error: Error): Promise<void>;
    onAfterErrorUpdate?(context: IApiSubscriberRouteExecutionContext<E, never, unknown>, error: Error): Promise<void>;
    onBeforeErrorDelete?(context: IApiSubscriberRouteExecutionContext<E, never, unknown>, error: Error): Promise<void>;
    onAfterErrorDelete?(context: IApiSubscriberRouteExecutionContext<E, never, unknown>, error: Error): Promise<void>;
    onBeforeErrorGet?(context: IApiSubscriberRouteExecutionContext<E, never, unknown>, error: Error): Promise<void>;
    onAfterErrorGet?(context: IApiSubscriberRouteExecutionContext<E, never, unknown>, error: Error): Promise<void>;
    onBeforeErrorGetList?(context: IApiSubscriberRouteExecutionContext<E, never, unknown>, error: Error): Promise<void>;
    onAfterErrorGetList?(context: IApiSubscriberRouteExecutionContext<E, never, unknown>, error: Error): Promise<void>;
    onBeforeErrorGetMany?(context: IApiSubscriberRouteExecutionContext<E, never, unknown>, error: Error): Promise<void>;
    onAfterErrorGetMany?(context: IApiSubscriberRouteExecutionContext<E, never, unknown>, error: Error): Promise<void>;
} 