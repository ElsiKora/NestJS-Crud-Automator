import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationDecision } from "@interface/authorization/decision.interface";

import type { IApiAuthorizationEngineEvaluateOptions } from "./evaluate-options.interface";

export interface IApiAuthorizationEngine<E extends IApiBaseEntity> {
	evaluate(options: IApiAuthorizationEngineEvaluateOptions<E>): Promise<IApiAuthorizationDecision<E>>;
}
