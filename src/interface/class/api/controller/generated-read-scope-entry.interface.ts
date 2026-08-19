import type { EApiFunctionType } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiAuthorizationScopeWhere } from "@type/class/api/authorization/scope-where.type";

export interface IApiControllerGeneratedReadScopeEntry {
	functionType: EApiFunctionType.GET | EApiFunctionType.GET_LIST;
	input: object;
	isClaimed: boolean;
	where: TApiAuthorizationScopeWhere<IApiBaseEntity>;
}
