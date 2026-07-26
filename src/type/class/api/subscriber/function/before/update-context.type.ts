import type { EApiFunctionSubscriberTransactionExpectation } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunctionExecutionContext } from "@interface/class/api/subscriber/function/execution/context";
import type { IApiSubscriberFunctionExecutionContextUpdateData } from "@interface/class/api/subscriber/function/execution/context/update-data.interface";
import type { TApiSubscriberFunctionTransactionData } from "@type/class/api/subscriber/function/transaction/data.type";
import type { TApiFunctionUpdateProperties } from "@type/decorator/api/function";

export type TApiSubscriberFunctionBeforeUpdateContext<E extends IApiBaseEntity, Result extends TApiFunctionUpdateProperties<E> = TApiFunctionUpdateProperties<E>, TTransactionExpectation extends EApiFunctionSubscriberTransactionExpectation = EApiFunctionSubscriberTransactionExpectation.SUPPORTS> = IApiSubscriberFunctionExecutionContext<E, Result, IApiSubscriberFunctionExecutionContextUpdateData<E> & TApiSubscriberFunctionTransactionData<TTransactionExpectation>>;
