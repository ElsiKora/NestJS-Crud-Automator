import type { EApiFunctionSubscriberTransactionExpectation } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunctionExecutionContextData } from "@interface/class/api/subscriber/function/execution/context/data";
import type { TApiSubscriberFunctionTransactionData } from "@type/class/api/subscriber/function/transaction/data.type";

export type TApiSubscriberFunctionExecutionContextData<E extends IApiBaseEntity, TTransactionExpectation extends EApiFunctionSubscriberTransactionExpectation = EApiFunctionSubscriberTransactionExpectation.SUPPORTS> = IApiSubscriberFunctionExecutionContextData<E> & TApiSubscriberFunctionTransactionData<TTransactionExpectation>;
