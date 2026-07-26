import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiAuthorizationPolicyContextWithRequestMetadata } from "@type/class/api/authorization/policy/context/with-request-metadata.type";
import type { DeepPartial } from "typeorm";

export type TApiAuthorizationPolicyBeforeCreateContext<E extends IApiBaseEntity> = TApiAuthorizationPolicyContextWithRequestMetadata<
	E,
	{
		body: DeepPartial<E>;
		headers: Record<string, string>;
		ip: string;
	}
>;
