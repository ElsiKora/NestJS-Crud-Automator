import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationRuleContext } from "@interface/class/api/authorization/rule/context.interface";
import type { IApiAuthorizationScope } from "@interface/class/api/authorization/scope.interface";

export type TApiAuthorizationRuleScopeResolver<E extends IApiBaseEntity> = (context: IApiAuthorizationRuleContext<E>) => IApiAuthorizationScope<E> | Promise<IApiAuthorizationScope<E> | undefined> | undefined;
