import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationRuleContext } from "@interface/class/api/authorization/rule/context.interface";
import type { TApiAuthorizationRuleTransformPayload } from "@type/class/api/authorization/rule/transform-payload.type";

export type TApiAuthorizationRuleResultTransform<E extends IApiBaseEntity, R = TApiAuthorizationRuleTransformPayload<E>> = (result: R, context: IApiAuthorizationRuleContext<E>) => Promise<R> | R;
