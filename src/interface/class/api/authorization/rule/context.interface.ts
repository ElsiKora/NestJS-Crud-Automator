import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationSubject } from "@interface/class/api/authorization/subject.interface";

export interface IApiAuthorizationRuleContext<E extends IApiBaseEntity> {
	resource?: E;
	subject: IApiAuthorizationSubject;
}
