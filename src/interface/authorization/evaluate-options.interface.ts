import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPolicy } from "@interface/authorization/policy/interface";
import type { IApiAuthorizationSubject } from "@interface/authorization/subject.interface";

export interface IApiAuthorizationEngineEvaluateOptions<E extends IApiBaseEntity, R> {
	action: string;
	policy: IApiAuthorizationPolicy<E, R>;
	resource?: E;
	subject: IApiAuthorizationSubject;
}
