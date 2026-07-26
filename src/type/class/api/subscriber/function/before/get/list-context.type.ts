import type { EApiFunctionSubscriberTransactionExpectation } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunctionExecutionContext } from "@interface/class/api/subscriber/function/execution/context";
import type { TApiSubscriberFunctionExecutionContextData } from "@type/class/api/subscriber/function/execution-context-data.type";
import type { TApiFunctionGetListProperties } from "@type/decorator/api/function";

export type TApiSubscriberFunctionBeforeGetListContext<E extends IApiBaseEntity, Result extends TApiFunctionGetListProperties<E> = TApiFunctionGetListProperties<E>, TTransactionExpectation extends EApiFunctionSubscriberTransactionExpectation = EApiFunctionSubscriberTransactionExpectation.SUPPORTS> = IApiSubscriberFunctionExecutionContext<E, Result, TApiSubscriberFunctionExecutionContextData<E, TTransactionExpectation>>;
