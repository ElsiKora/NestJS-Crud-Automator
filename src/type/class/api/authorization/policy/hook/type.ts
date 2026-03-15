import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPolicySubscriberContext } from "@interface/class/api/authorization";

import type { TApiAuthorizationPolicySubscriberRuleResult } from "../subscriber";

import type { TApiAuthorizationPolicyHookResult } from "./result.type";

export type TApiAuthorizationPolicyHook<E extends IApiBaseEntity, TAction extends string> = (context: IApiAuthorizationPolicySubscriberContext<E>) => Promise<TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<TAction, E>>> | TApiAuthorizationPolicySubscriberRuleResult<E, TApiAuthorizationPolicyHookResult<TAction, E>>;
