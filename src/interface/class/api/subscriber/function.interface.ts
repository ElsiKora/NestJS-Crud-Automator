import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunctionErrorExecutionContext } from "@interface/class/api/subscriber/function/error-execution-context.interface";
import type { IApiSubscriberFunctionExecutionContextData } from "@interface/class/api/subscriber/function/execution/context-data.interface";
import type { IApiSubscriberFunctionExecutionContext } from "@interface/class/api/subscriber/function/execution/context.interface";
import type { IApiSubscriber } from "@interface/class/api/subscriber/interface";
import type { IApiGetListResponseResult } from "@interface/decorator/api";
import type { TApiFunctionCreateProperties, TApiFunctionDeleteCriteria, TApiFunctionGetListProperties, TApiFunctionGetManyProperties, TApiFunctionGetProperties, TApiFunctionUpdateProperties } from "@type/decorator/api/function";

export interface IApiSubscriberFunction<
	E extends IApiBaseEntity,
	BeforeCreateResult extends TApiFunctionCreateProperties<E> = TApiFunctionCreateProperties<E>,
	BeforeDeleteResult extends TApiFunctionDeleteCriteria<E> = TApiFunctionDeleteCriteria<E>,
	BeforeGetResult extends TApiFunctionGetProperties<E> = TApiFunctionGetProperties<E>,
	BeforeGetListResult extends TApiFunctionGetListProperties<E> = TApiFunctionGetListProperties<E>,
	BeforeGetManyResult extends TApiFunctionGetManyProperties<E> = TApiFunctionGetManyProperties<E>,
	BeforeUpdateResult extends TApiFunctionUpdateProperties<E> = TApiFunctionUpdateProperties<E>,
> extends IApiSubscriber {
	onAfterCreate?(context: IApiSubscriberFunctionExecutionContext<E, E, IApiSubscriberFunctionExecutionContextData<E>>): Promise<E | undefined>;
	onAfterCustom?(context: IApiSubscriberFunctionExecutionContext<E, unknown, IApiSubscriberFunctionExecutionContextData<E>>): Promise<unknown>;
	onAfterDelete?(context: IApiSubscriberFunctionExecutionContext<E, E, IApiSubscriberFunctionExecutionContextData<E>>): Promise<E | undefined>;

	onAfterErrorCreate?(context: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>>, error: Error): Promise<void>;
	onAfterErrorCustom?(context: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>>, error: Error): Promise<void>;
	onAfterErrorDelete?(context: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>>, error: Error): Promise<void>;

	onAfterErrorGet?(context: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>>, error: Error): Promise<void>;
	onAfterErrorGetList?(context: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>>, error: Error): Promise<void>;

	onAfterErrorGetMany?(context: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>>, error: Error): Promise<void>;
	onAfterErrorUpdate?(context: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>>, error: Error): Promise<void>;

	onAfterGet?(context: IApiSubscriberFunctionExecutionContext<E, E, IApiSubscriberFunctionExecutionContextData<E>>): Promise<E | undefined>;
	onAfterGetList?(context: IApiSubscriberFunctionExecutionContext<E, IApiGetListResponseResult<E>, IApiSubscriberFunctionExecutionContextData<E>>): Promise<IApiGetListResponseResult<E> | undefined>;

	onAfterGetMany?(context: IApiSubscriberFunctionExecutionContext<E, Array<E>, IApiSubscriberFunctionExecutionContextData<E>>): Promise<Array<E> | undefined>;
	onAfterUpdate?(context: IApiSubscriberFunctionExecutionContext<E, E, IApiSubscriberFunctionExecutionContextData<E>>): Promise<E | undefined>;

	onBeforeCreate?(context: IApiSubscriberFunctionExecutionContext<E, BeforeCreateResult, IApiSubscriberFunctionExecutionContextData<E>>): Promise<BeforeCreateResult | undefined>;
	onBeforeCustom?(context: IApiSubscriberFunctionExecutionContext<E, unknown, IApiSubscriberFunctionExecutionContextData<E>>): Promise<unknown>;
	onBeforeDelete?(context: IApiSubscriberFunctionExecutionContext<E, BeforeDeleteResult, IApiSubscriberFunctionExecutionContextData<E>>): Promise<BeforeDeleteResult | undefined>;
	onBeforeErrorCreate?(context: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>>, error: Error): Promise<void>;
	onBeforeErrorCustom?(context: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>>, error: Error): Promise<void>;
	onBeforeErrorDelete?(context: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>>, error: Error): Promise<void>;
	onBeforeErrorGet?(context: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>>, error: Error): Promise<void>;
	onBeforeErrorGetList?(context: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>>, error: Error): Promise<void>;
	onBeforeErrorGetMany?(context: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>>, error: Error): Promise<void>;
	onBeforeErrorUpdate?(context: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>>, error: Error): Promise<void>;
	onBeforeGet?(context: IApiSubscriberFunctionExecutionContext<E, BeforeGetResult, IApiSubscriberFunctionExecutionContextData<E>>): Promise<BeforeGetResult | undefined>;
	onBeforeGetList?(context: IApiSubscriberFunctionExecutionContext<E, BeforeGetListResult, IApiSubscriberFunctionExecutionContextData<E>>): Promise<BeforeGetListResult | undefined>;
	onBeforeGetMany?(context: IApiSubscriberFunctionExecutionContext<E, BeforeGetManyResult, IApiSubscriberFunctionExecutionContextData<E>>): Promise<BeforeGetManyResult | undefined>;
	onBeforeUpdate?(context: IApiSubscriberFunctionExecutionContext<E, BeforeUpdateResult, IApiSubscriberFunctionExecutionContextData<E>>): Promise<BeforeUpdateResult | undefined>;
}
