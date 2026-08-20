import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiAuthorizationPolicyContextWithRequestMetadata } from "@type/class/api/authorization/policy/context/with-request-metadata.type";
import type { TApiControllerGetListQuery } from "@type/decorator/api/controller";

export type TApiAuthorizationPolicyBeforeGetListContext<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE> = TApiAuthorizationPolicyContextWithRequestMetadata<
	E,
	{
		headers: Record<string, string>;
		ip: string;
		query: TApiControllerGetListQuery<E, M>;
	},
	M
>;
