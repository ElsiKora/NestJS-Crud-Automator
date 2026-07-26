import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationDecision } from "@interface/class/api/authorization/decision";
import type { IApiAuthorizationEngineEvaluateOptions } from "@interface/class/api/authorization/evaluate-options.interface";

export interface IApiAuthorizationEngine<E extends IApiBaseEntity> {
	evaluate<R>(options: IApiAuthorizationEngineEvaluateOptions<E, R>): Promise<IApiAuthorizationDecision<E, R>>;
}
