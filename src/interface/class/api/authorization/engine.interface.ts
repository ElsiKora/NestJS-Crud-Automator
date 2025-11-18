import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationDecision } from "@interface/class/api/authorization/decision.interface";

import type { IApiAuthorizationEngineEvaluateOptions } from "./evaluate-options.interface";

export interface IApiAuthorizationEngine<E extends IApiBaseEntity> {
	evaluate<R>(options: IApiAuthorizationEngineEvaluateOptions<E, R>): Promise<IApiAuthorizationDecision<E, R>>;
}
