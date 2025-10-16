import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberRoute } from "@interface/class/api/subscriber/route.interface";

import { ApiSubscriberBase } from "./base.class";

/**
 * Abstract base class for route-level subscribers.
 *
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/api-reference/classes#apiroutesubscriberbase | API Reference - ApiRouteSubscriberBase}
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/subscriber-system/route-subscribers | Subscriber System - Route Subscribers}
 */
export abstract class ApiRouteSubscriberBase<E extends IApiBaseEntity> extends ApiSubscriberBase implements IApiSubscriberRoute<E> {}
