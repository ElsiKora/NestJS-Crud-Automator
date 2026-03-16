import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPolicySubscriberContextData } from "@interface/class/api/authorization/policy/subscriber/context";
import type { IApiAuthorizationPolicySubscriberContext } from "@interface/class/api/authorization/policy/subscriber/context/interface";
import type { IApiAuthorizationRequestMetadata } from "@interface/class/api/authorization/request-metadata.interface";

export type TApiAuthorizationPolicyContextWithRequestMetadata<E extends IApiBaseEntity, TRequestMetadata extends IApiAuthorizationRequestMetadata<E>> = {
	readonly DATA: Omit<IApiAuthorizationPolicySubscriberContextData<E>, keyof TRequestMetadata> & TRequestMetadata;
} & Omit<IApiAuthorizationPolicySubscriberContext<E>, "DATA" | keyof TRequestMetadata> &
	TRequestMetadata;
