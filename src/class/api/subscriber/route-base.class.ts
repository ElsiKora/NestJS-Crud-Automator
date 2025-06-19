import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberRoute } from "@interface/class/api/subscriber/route.interface";

import { ApiSubscriberBase } from "./base.class";

export abstract class ApiRouteSubscriberBase<E extends IApiBaseEntity> extends ApiSubscriberBase implements IApiSubscriberRoute<E> {}
