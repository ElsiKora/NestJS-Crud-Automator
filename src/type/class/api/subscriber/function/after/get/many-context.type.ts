import type { EApiFunctionSubscriberTransactionExpectation } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunctionExecutionContext } from "@interface/class/api/subscriber/function/execution/context";
import type { TApiSubscriberFunctionExecutionContextData } from "@type/class/api/subscriber/function/execution-context-data.type";

export type TApiSubscriberFunctionAfterGetManyContext<E extends IApiBaseEntity, TTransactionExpectation extends EApiFunctionSubscriberTransactionExpectation = EApiFunctionSubscriberTransactionExpectation.SUPPORTS> = IApiSubscriberFunctionExecutionContext<E, Array<E>, TApiSubscriberFunctionExecutionContextData<E, TTransactionExpectation>>;
