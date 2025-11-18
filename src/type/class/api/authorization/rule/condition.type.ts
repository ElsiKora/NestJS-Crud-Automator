import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationRuleContext } from "@interface/class/api/authorization/rule/context.interface";

export type TApiAuthorizationRuleCondition<E extends IApiBaseEntity> = (context: IApiAuthorizationRuleContext<E>) => boolean | Promise<boolean>;
