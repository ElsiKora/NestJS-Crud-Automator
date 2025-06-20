import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunction } from "@interface/class/api/subscriber/function.interface";

import { ApiSubscriberBase } from "./base.class";

export abstract class ApiFunctionSubscriberBase<E extends IApiBaseEntity> extends ApiSubscriberBase implements IApiSubscriberFunction<E> {}
