import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiControllerGetListQuery } from "@type/decorator/api/controller";

import type { TApiAuthorizationPolicyContextWithRequestMetadata } from "../../with-request-metadata.type";

export type TApiAuthorizationPolicyBeforeGetListContext<E extends IApiBaseEntity> = TApiAuthorizationPolicyContextWithRequestMetadata<
	E,
	{
		headers: Record<string, string>;
		ip: string;
		query: TApiControllerGetListQuery<E>;
	}
>;
