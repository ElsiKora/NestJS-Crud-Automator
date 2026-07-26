import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiAuthorizationPolicyContextWithRequestMetadata } from "@type/class/api/authorization/policy/context/with-request-metadata.type";

export type TApiAuthorizationPolicyBeforeGetContext<E extends IApiBaseEntity> = TApiAuthorizationPolicyContextWithRequestMetadata<
	E,
	{
		headers: Record<string, string>;
		ip: string;
		parameters: Partial<E>;
	}
>;
