import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunction } from "@interface/class/api/subscriber/function.interface";

import { ApiSubscriberBase } from "./base.class";

/**
 * Abstract base class for function-level subscribers.
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/api-reference/classes#apifunctionsubscriberbase | API Reference - ApiFunctionSubscriberBase}
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/subscriber-system/function-subscribers | Subscriber System - Function Subscribers}
 */
export abstract class ApiFunctionSubscriberBase<E extends IApiBaseEntity> extends ApiSubscriberBase implements IApiSubscriberFunction<E> {}
