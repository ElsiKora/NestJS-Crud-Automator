import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunctionErrorExecutionContext } from "@interface/class/api/subscriber/function/error-execution-context.interface";
import type { IApiSubscriberFunctionExecutionContextData } from "@interface/class/api/subscriber/function/execution/context-data.interface";
import type { IApiSubscriberFunctionExecutionContext } from "@interface/class/api/subscriber/function/execution/context.interface";
import type { IApiSubscriber } from "@interface/class/api/subscriber/interface";
import type { IApiGetListResponseResult } from "@interface/decorator/api";
import type { TApiFunctionCreateProperties, TApiFunctionDeleteCriteria, TApiFunctionGetListProperties, TApiFunctionGetManyProperties, TApiFunctionGetProperties, TApiFunctionUpdateProperties } from "@type/decorator/api/function";

export interface IApiSubscriberFunction<E extends IApiBaseEntity> extends IApiSubscriber {
	onAfterCreate?(context: IApiSubscriberFunctionExecutionContext<E, E, IApiSubscriberFunctionExecutionContextData<E>>): Promise<E | undefined>;
	onAfterDelete?(context: IApiSubscriberFunctionExecutionContext<E, E, IApiSubscriberFunctionExecutionContextData<E>>): Promise<E | undefined>;

	onAfterErrorCreate?(context: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>>, error: Error): Promise<void>;
	onAfterErrorDelete?(context: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>>, error: Error): Promise<void>;

	onAfterErrorGet?(context: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>>, error: Error): Promise<void>;
	onAfterErrorGetList?(context: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>>, error: Error): Promise<void>;

	onAfterErrorGetMany?(context: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>>, error: Error): Promise<void>;
	onAfterErrorUpdate?(context: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>>, error: Error): Promise<void>;

	onAfterGet?(context: IApiSubscriberFunctionExecutionContext<E, E, IApiSubscriberFunctionExecutionContextData<E>>): Promise<E | undefined>;
	onAfterGetList?(context: IApiSubscriberFunctionExecutionContext<E, IApiGetListResponseResult<E>, IApiSubscriberFunctionExecutionContextData<E>>): Promise<IApiGetListResponseResult<E> | undefined>;

	onAfterGetMany?(context: IApiSubscriberFunctionExecutionContext<E, Array<E>, IApiSubscriberFunctionExecutionContextData<E>>): Promise<Array<E> | undefined>;
	onAfterUpdate?(context: IApiSubscriberFunctionExecutionContext<E, E, IApiSubscriberFunctionExecutionContextData<E>>): Promise<E | undefined>;

	onBeforeCreate?(context: IApiSubscriberFunctionExecutionContext<E, TApiFunctionCreateProperties<E>, IApiSubscriberFunctionExecutionContextData<E>>): Promise<TApiFunctionCreateProperties<E> | undefined>;
	onBeforeDelete?(context: IApiSubscriberFunctionExecutionContext<E, TApiFunctionDeleteCriteria<E>, IApiSubscriberFunctionExecutionContextData<E>>): Promise<TApiFunctionDeleteCriteria<E> | undefined>;
	onBeforeErrorCreate?(context: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>>, error: Error): Promise<void>;
	onBeforeErrorDelete?(context: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>>, error: Error): Promise<void>;
	onBeforeErrorGet?(context: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>>, error: Error): Promise<void>;
	onBeforeErrorGetList?(context: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>>, error: Error): Promise<void>;
	onBeforeErrorGetMany?(context: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>>, error: Error): Promise<void>;
	onBeforeErrorUpdate?(context: IApiSubscriberFunctionErrorExecutionContext<E, IApiSubscriberFunctionExecutionContextData<E>>, error: Error): Promise<void>;
	onBeforeGet?(context: IApiSubscriberFunctionExecutionContext<E, TApiFunctionGetProperties<E>, IApiSubscriberFunctionExecutionContextData<E>>): Promise<TApiFunctionGetProperties<E> | undefined>;
	onBeforeGetList?(context: IApiSubscriberFunctionExecutionContext<E, TApiFunctionGetListProperties<E>, IApiSubscriberFunctionExecutionContextData<E>>): Promise<TApiFunctionGetListProperties<E> | undefined>;
	onBeforeGetMany?(context: IApiSubscriberFunctionExecutionContext<E, TApiFunctionGetManyProperties<E>, IApiSubscriberFunctionExecutionContextData<E>>): Promise<TApiFunctionGetManyProperties<E> | undefined>;
	onBeforeUpdate?(context: IApiSubscriberFunctionExecutionContext<E, TApiFunctionUpdateProperties<E>, IApiSubscriberFunctionExecutionContextData<E>>): Promise<TApiFunctionUpdateProperties<E> | undefined>;
}
