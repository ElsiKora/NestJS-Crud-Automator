import type { EApiFunctionSubscriberTransactionExpectation } from "@enum/decorator/api";
import type { EntityManager } from "typeorm";

import type { TApiSubscriberFunctionRequiredTransactionExpectation } from "./required-expectation.type";

export type TApiSubscriberFunctionTransactionData<TTransactionExpectation extends EApiFunctionSubscriberTransactionExpectation = EApiFunctionSubscriberTransactionExpectation.SUPPORTS> = [TTransactionExpectation] extends [TApiSubscriberFunctionRequiredTransactionExpectation] ? { eventManager: EntityManager } : { eventManager?: EntityManager };
