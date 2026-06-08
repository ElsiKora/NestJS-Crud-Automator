import type { EApiRouteSubscriberAuthorizationExpectation } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriber } from "@interface/class/api/subscriber/interface";
import type { IApiSubscriberRouteErrorExecutionContext } from "@interface/class/api/subscriber/route/error-execution-context.interface";
import type { IApiSubscriberRouteExecutionContextData, IApiSubscriberRouteExecutionContextDataExtended } from "@interface/class/api/subscriber/route/execution/context";
import type { IApiSubscriberRouteExecutionContext } from "@interface/class/api/subscriber/route/execution/context";
import type { IApiGetListResponseResult } from "@interface/decorator/api";
import type { TApiSubscriberRouteBeforeCreateContext, TApiSubscriberRouteBeforeDeleteContext, TApiSubscriberRouteBeforeGetContext, TApiSubscriberRouteBeforeGetListContext, TApiSubscriberRouteBeforePartialUpdateContext, TApiSubscriberRouteBeforeUpdateContext } from "@type/class/api/subscriber/route";

export interface IApiSubscriberRoute<E extends IApiBaseEntity, TAuthorizationExpectation extends EApiRouteSubscriberAuthorizationExpectation = EApiRouteSubscriberAuthorizationExpectation.OPTIONAL> extends IApiSubscriber {
	onAfterCreate?(context: IApiSubscriberRouteExecutionContext<E, E, IApiSubscriberRouteExecutionContextDataExtended<E, E>>): Promise<E | undefined>;
	onAfterCustom?(context: IApiSubscriberRouteExecutionContext<E, unknown, IApiSubscriberRouteExecutionContextDataExtended<E, unknown>>): Promise<unknown>;
	onAfterDelete?(context: IApiSubscriberRouteExecutionContext<E, Partial<E>, IApiSubscriberRouteExecutionContextDataExtended<E, undefined>>): Promise<Partial<E> | undefined>;

	onAfterErrorCreate?(context: IApiSubscriberRouteErrorExecutionContext<E, IApiSubscriberRouteExecutionContextDataExtended<E, E>>, error: Error): Promise<void>;
	onAfterErrorCustom?(context: IApiSubscriberRouteErrorExecutionContext<E, IApiSubscriberRouteExecutionContextDataExtended<E, unknown>>, error: Error): Promise<void>;
	onAfterErrorDelete?(context: IApiSubscriberRouteErrorExecutionContext<E, IApiSubscriberRouteExecutionContextDataExtended<E, undefined>>, error: Error): Promise<void>;

	onAfterErrorGet?(context: IApiSubscriberRouteErrorExecutionContext<E, IApiSubscriberRouteExecutionContextDataExtended<E, E>>, error: Error): Promise<void>;
	onAfterErrorGetList?(context: IApiSubscriberRouteErrorExecutionContext<E, IApiSubscriberRouteExecutionContextDataExtended<E, IApiGetListResponseResult<E>>>, error: Error): Promise<void>;
	onAfterErrorPartialUpdate?(context: IApiSubscriberRouteErrorExecutionContext<E, IApiSubscriberRouteExecutionContextDataExtended<E, E>>, error: Error): Promise<void>;
	onAfterErrorUpdate?(context: IApiSubscriberRouteErrorExecutionContext<E, IApiSubscriberRouteExecutionContextDataExtended<E, E>>, error: Error): Promise<void>;

	onAfterGet?(context: IApiSubscriberRouteExecutionContext<E, E, IApiSubscriberRouteExecutionContextDataExtended<E, E>>): Promise<E | undefined>;
	onAfterGetList?(context: IApiSubscriberRouteExecutionContext<E, IApiGetListResponseResult<E>, IApiSubscriberRouteExecutionContextDataExtended<E, IApiGetListResponseResult<E>>>): Promise<IApiGetListResponseResult<E> | undefined>;
	onAfterPartialUpdate?(context: IApiSubscriberRouteExecutionContext<E, E, IApiSubscriberRouteExecutionContextDataExtended<E, E>>): Promise<E | undefined>;
	onAfterUpdate?(context: IApiSubscriberRouteExecutionContext<E, E, IApiSubscriberRouteExecutionContextDataExtended<E, E>>): Promise<E | undefined>;

	onBeforeCreate?(context: TApiSubscriberRouteBeforeCreateContext<E, TAuthorizationExpectation>): Promise<TApiSubscriberRouteBeforeCreateContext<E, TAuthorizationExpectation>["result"] | undefined>;
	onBeforeCustom?(context: IApiSubscriberRouteExecutionContext<E, unknown, IApiSubscriberRouteExecutionContextData<E, unknown>>): Promise<unknown>;
	onBeforeDelete?(context: TApiSubscriberRouteBeforeDeleteContext<E, TAuthorizationExpectation>): Promise<TApiSubscriberRouteBeforeDeleteContext<E, TAuthorizationExpectation>["result"] | undefined>;
	onBeforeErrorCreate?(context: IApiSubscriberRouteErrorExecutionContext<E, IApiSubscriberRouteExecutionContextData<E, E>>, error: Error): Promise<void>;
	onBeforeErrorCustom?(context: IApiSubscriberRouteErrorExecutionContext<E, IApiSubscriberRouteExecutionContextData<E, unknown>>, error: Error): Promise<void>;
	onBeforeErrorDelete?(context: IApiSubscriberRouteErrorExecutionContext<E, IApiSubscriberRouteExecutionContextData<E, undefined>>, error: Error): Promise<void>;
	onBeforeErrorGet?(context: IApiSubscriberRouteErrorExecutionContext<E, IApiSubscriberRouteExecutionContextData<E, E>>, error: Error): Promise<void>;
	onBeforeErrorGetList?(context: IApiSubscriberRouteErrorExecutionContext<E, IApiSubscriberRouteExecutionContextData<E, IApiGetListResponseResult<E>>>, error: Error): Promise<void>;
	onBeforeErrorPartialUpdate?(context: IApiSubscriberRouteErrorExecutionContext<E, IApiSubscriberRouteExecutionContextData<E, E>>, error: Error): Promise<void>;
	onBeforeErrorUpdate?(context: IApiSubscriberRouteErrorExecutionContext<E, IApiSubscriberRouteExecutionContextData<E, E>>, error: Error): Promise<void>;
	onBeforeGet?(context: TApiSubscriberRouteBeforeGetContext<E, TAuthorizationExpectation>): Promise<TApiSubscriberRouteBeforeGetContext<E, TAuthorizationExpectation>["result"] | undefined>;
	onBeforeGetList?(context: TApiSubscriberRouteBeforeGetListContext<E, TAuthorizationExpectation>): Promise<TApiSubscriberRouteBeforeGetListContext<E, TAuthorizationExpectation>["result"] | undefined>;
	onBeforePartialUpdate?(context: TApiSubscriberRouteBeforePartialUpdateContext<E, TAuthorizationExpectation>): Promise<TApiSubscriberRouteBeforePartialUpdateContext<E, TAuthorizationExpectation>["result"] | undefined>;
	onBeforeUpdate?(context: TApiSubscriberRouteBeforeUpdateContext<E, TAuthorizationExpectation>): Promise<TApiSubscriberRouteBeforeUpdateContext<E, TAuthorizationExpectation>["result"] | undefined>;
}
