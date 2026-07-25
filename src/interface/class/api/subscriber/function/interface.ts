import type { EApiFunctionSubscriberTransactionExpectation } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiFunctionTransactionFailure } from "@interface/class/api/function";
import type { IApiSubscriberFunctionErrorExecutionContext } from "@interface/class/api/subscriber/function/error-execution-context.interface";
import type { IApiSubscriberFunctionExecutionContext } from "@interface/class/api/subscriber/function/execution/context";
import type { IApiSubscriberFunctionTransactionContext } from "@interface/class/api/subscriber/function/transaction";
import type { IApiSubscriber } from "@interface/class/api/subscriber/interface";
import type { IApiGetListResponseResult } from "@interface/decorator/api";
import type { TApiSubscriberFunctionExecutionContextData } from "@type/class/api/subscriber/function/execution-context-data.type";
import type { TApiFunctionCreateProperties, TApiFunctionDeleteCriteria, TApiFunctionGetListProperties, TApiFunctionGetManyProperties, TApiFunctionGetProperties, TApiFunctionUpdateProperties } from "@type/decorator/api/function";

export interface IApiSubscriberFunction<
	E extends IApiBaseEntity,
	BeforeCreateResult extends TApiFunctionCreateProperties<E> = TApiFunctionCreateProperties<E>,
	BeforeDeleteResult extends TApiFunctionDeleteCriteria<E> = TApiFunctionDeleteCriteria<E>,
	BeforeGetResult extends TApiFunctionGetProperties<E> = TApiFunctionGetProperties<E>,
	BeforeGetListResult extends TApiFunctionGetListProperties<E> = TApiFunctionGetListProperties<E>,
	BeforeGetManyResult extends TApiFunctionGetManyProperties<E> = TApiFunctionGetManyProperties<E>,
	BeforeUpdateResult extends TApiFunctionUpdateProperties<E> = TApiFunctionUpdateProperties<E>,
	TTransactionExpectation extends EApiFunctionSubscriberTransactionExpectation = EApiFunctionSubscriberTransactionExpectation.SUPPORTS,
> extends IApiSubscriber {
	onAfterCommit?(context: IApiSubscriberFunctionTransactionContext): Promise<void>;
	onAfterCreate?(context: IApiSubscriberFunctionExecutionContext<E, E, TApiSubscriberFunctionExecutionContextData<E, TTransactionExpectation>>): Promise<E | undefined>;
	onAfterCustom?(context: IApiSubscriberFunctionExecutionContext<E, unknown, TApiSubscriberFunctionExecutionContextData<E, TTransactionExpectation>>): Promise<unknown>;
	onAfterDelete?(context: IApiSubscriberFunctionExecutionContext<E, E, TApiSubscriberFunctionExecutionContextData<E, TTransactionExpectation>>): Promise<E | undefined>;

	onAfterErrorCommit?(context: IApiSubscriberFunctionTransactionContext, error: Error): Promise<void>;
	onAfterErrorCreate?(context: IApiSubscriberFunctionErrorExecutionContext<E, TApiSubscriberFunctionExecutionContextData<E, TTransactionExpectation>>, error: Error): Promise<void>;
	onAfterErrorCustom?(context: IApiSubscriberFunctionErrorExecutionContext<E, TApiSubscriberFunctionExecutionContextData<E, TTransactionExpectation>>, error: Error): Promise<void>;
	onAfterErrorDelete?(context: IApiSubscriberFunctionErrorExecutionContext<E, TApiSubscriberFunctionExecutionContextData<E, TTransactionExpectation>>, error: Error): Promise<void>;

	onAfterErrorGet?(context: IApiSubscriberFunctionErrorExecutionContext<E, TApiSubscriberFunctionExecutionContextData<E, TTransactionExpectation>>, error: Error): Promise<void>;
	onAfterErrorGetList?(context: IApiSubscriberFunctionErrorExecutionContext<E, TApiSubscriberFunctionExecutionContextData<E, TTransactionExpectation>>, error: Error): Promise<void>;

	onAfterErrorGetMany?(context: IApiSubscriberFunctionErrorExecutionContext<E, TApiSubscriberFunctionExecutionContextData<E, TTransactionExpectation>>, error: Error): Promise<void>;
	onAfterErrorRollback?(context: IApiSubscriberFunctionTransactionContext, error: Error): Promise<void>;
	onAfterErrorUpdate?(context: IApiSubscriberFunctionErrorExecutionContext<E, TApiSubscriberFunctionExecutionContextData<E, TTransactionExpectation>>, error: Error): Promise<void>;

	onAfterGet?(context: IApiSubscriberFunctionExecutionContext<E, E, TApiSubscriberFunctionExecutionContextData<E, TTransactionExpectation>>): Promise<E | undefined>;
	onAfterGetList?(context: IApiSubscriberFunctionExecutionContext<E, IApiGetListResponseResult<E>, TApiSubscriberFunctionExecutionContextData<E, TTransactionExpectation>>): Promise<IApiGetListResponseResult<E> | undefined>;

	onAfterGetMany?(context: IApiSubscriberFunctionExecutionContext<E, Array<E>, TApiSubscriberFunctionExecutionContextData<E, TTransactionExpectation>>): Promise<Array<E> | undefined>;
	onAfterRollback?(context: IApiSubscriberFunctionTransactionContext): Promise<void>;
	onAfterUpdate?(context: IApiSubscriberFunctionExecutionContext<E, E, TApiSubscriberFunctionExecutionContextData<E, TTransactionExpectation>>): Promise<E | undefined>;

	onBeforeCreate?(context: IApiSubscriberFunctionExecutionContext<E, BeforeCreateResult, TApiSubscriberFunctionExecutionContextData<E, TTransactionExpectation>>): Promise<BeforeCreateResult | undefined>;
	onBeforeCustom?(context: IApiSubscriberFunctionExecutionContext<E, unknown, TApiSubscriberFunctionExecutionContextData<E, TTransactionExpectation>>): Promise<unknown>;
	onBeforeDelete?(context: IApiSubscriberFunctionExecutionContext<E, BeforeDeleteResult, TApiSubscriberFunctionExecutionContextData<E, TTransactionExpectation>>): Promise<BeforeDeleteResult | undefined>;
	onBeforeErrorCommit?(context: IApiSubscriberFunctionTransactionContext, failures: ReadonlyArray<Readonly<IApiFunctionTransactionFailure>>): Promise<void>;
	onBeforeErrorCreate?(context: IApiSubscriberFunctionErrorExecutionContext<E, TApiSubscriberFunctionExecutionContextData<E, TTransactionExpectation>>, error: Error): Promise<void>;
	onBeforeErrorCustom?(context: IApiSubscriberFunctionErrorExecutionContext<E, TApiSubscriberFunctionExecutionContextData<E, TTransactionExpectation>>, error: Error): Promise<void>;
	onBeforeErrorDelete?(context: IApiSubscriberFunctionErrorExecutionContext<E, TApiSubscriberFunctionExecutionContextData<E, TTransactionExpectation>>, error: Error): Promise<void>;
	onBeforeErrorGet?(context: IApiSubscriberFunctionErrorExecutionContext<E, TApiSubscriberFunctionExecutionContextData<E, TTransactionExpectation>>, error: Error): Promise<void>;
	onBeforeErrorGetList?(context: IApiSubscriberFunctionErrorExecutionContext<E, TApiSubscriberFunctionExecutionContextData<E, TTransactionExpectation>>, error: Error): Promise<void>;
	onBeforeErrorGetMany?(context: IApiSubscriberFunctionErrorExecutionContext<E, TApiSubscriberFunctionExecutionContextData<E, TTransactionExpectation>>, error: Error): Promise<void>;
	onBeforeErrorRollback?(context: IApiSubscriberFunctionTransactionContext, failures: ReadonlyArray<Readonly<IApiFunctionTransactionFailure>>): Promise<void>;
	onBeforeErrorUpdate?(context: IApiSubscriberFunctionErrorExecutionContext<E, TApiSubscriberFunctionExecutionContextData<E, TTransactionExpectation>>, error: Error): Promise<void>;
	onBeforeGet?(context: IApiSubscriberFunctionExecutionContext<E, BeforeGetResult, TApiSubscriberFunctionExecutionContextData<E, TTransactionExpectation>>): Promise<BeforeGetResult | undefined>;
	onBeforeGetList?(context: IApiSubscriberFunctionExecutionContext<E, BeforeGetListResult, TApiSubscriberFunctionExecutionContextData<E, TTransactionExpectation>>): Promise<BeforeGetListResult | undefined>;
	onBeforeGetMany?(context: IApiSubscriberFunctionExecutionContext<E, BeforeGetManyResult, TApiSubscriberFunctionExecutionContextData<E, TTransactionExpectation>>): Promise<BeforeGetManyResult | undefined>;
	onBeforeUpdate?(context: IApiSubscriberFunctionExecutionContext<E, BeforeUpdateResult, TApiSubscriberFunctionExecutionContextData<E, TTransactionExpectation>>): Promise<BeforeUpdateResult | undefined>;
}
