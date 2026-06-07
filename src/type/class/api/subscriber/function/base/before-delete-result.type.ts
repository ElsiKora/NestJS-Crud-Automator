import type { EApiFunctionSubscriberTransactionExpectation } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiFunctionDeleteCriteria } from "@type/decorator/api/function";

export type TApiSubscriberFunctionBaseBeforeDeleteResult<E extends IApiBaseEntity, BeforeDeleteResultOrTransactionExpectation extends EApiFunctionSubscriberTransactionExpectation | TApiFunctionDeleteCriteria<E>> = BeforeDeleteResultOrTransactionExpectation extends EApiFunctionSubscriberTransactionExpectation ? TApiFunctionDeleteCriteria<E> : Extract<BeforeDeleteResultOrTransactionExpectation, TApiFunctionDeleteCriteria<E>>;
