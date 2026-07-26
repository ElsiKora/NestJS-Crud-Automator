import type { EApiFunctionSubscriberTransactionExpectation } from "@enum/decorator/api";
import type { TApiSubscriberFunctionRequiredTransactionExpectation } from "@type/class/api/subscriber/function/transaction/required-expectation.type";
import type { EntityManager } from "typeorm";

export type TApiSubscriberFunctionTransactionData<TTransactionExpectation extends EApiFunctionSubscriberTransactionExpectation = EApiFunctionSubscriberTransactionExpectation.SUPPORTS> = [TTransactionExpectation] extends [TApiSubscriberFunctionRequiredTransactionExpectation] ? { eventManager: EntityManager } : { eventManager?: EntityManager };
