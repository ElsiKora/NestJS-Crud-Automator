import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { DeepPartial } from "typeorm";

import type { TApiAuthorizationPolicyContextWithRequestMetadata } from "../with-request-metadata.type";

export type TApiAuthorizationPolicyBeforeCreateContext<E extends IApiBaseEntity> = TApiAuthorizationPolicyContextWithRequestMetadata<
	E,
	{
		body: DeepPartial<E>;
		headers: Record<string, string>;
		ip: string;
	}
>;
