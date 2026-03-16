import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

import type { IApiAuthorizationDecision } from "./decision";

export interface IApiAuthorizationAuditSink {
	record<E extends IApiBaseEntity, R>(decision: IApiAuthorizationDecision<E, R>): Promise<void> | void;
}
