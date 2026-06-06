import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunction } from "@interface/class/api/subscriber/function.interface";
import type { TApiFunctionCreateProperties, TApiFunctionDeleteCriteria, TApiFunctionGetListProperties, TApiFunctionGetManyProperties, TApiFunctionGetProperties, TApiFunctionUpdateProperties } from "@type/decorator/api/function";

import { ApiSubscriberBase } from "./base.class";

/**
 * Abstract base class for function-level subscribers.
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/api-reference/classes#apifunctionsubscriberbase | API Reference - ApiFunctionSubscriberBase}
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/subscriber-system/function-subscribers | Subscriber System - Function Subscribers}
 */
export abstract class ApiFunctionSubscriberBase<
	E extends IApiBaseEntity,
	BeforeCreateResult extends TApiFunctionCreateProperties<E> = TApiFunctionCreateProperties<E>,
	BeforeDeleteResult extends TApiFunctionDeleteCriteria<E> = TApiFunctionDeleteCriteria<E>,
	BeforeGetResult extends TApiFunctionGetProperties<E> = TApiFunctionGetProperties<E>,
	BeforeGetListResult extends TApiFunctionGetListProperties<E> = TApiFunctionGetListProperties<E>,
	BeforeGetManyResult extends TApiFunctionGetManyProperties<E> = TApiFunctionGetManyProperties<E>,
	BeforeUpdateResult extends TApiFunctionUpdateProperties<E> = TApiFunctionUpdateProperties<E>,
>
	extends ApiSubscriberBase
	implements IApiSubscriberFunction<E, BeforeCreateResult, BeforeDeleteResult, BeforeGetResult, BeforeGetListResult, BeforeGetManyResult, BeforeUpdateResult> {}
