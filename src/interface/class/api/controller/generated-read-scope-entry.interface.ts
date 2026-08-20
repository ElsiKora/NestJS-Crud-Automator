import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiAuthorizationScopeWhere } from "@type/class/api/authorization/scope-where.type";
import type { TApiControllerGeneratedScopeFunctionType } from "@type/class/api/controller/generated/scope-function-type.type";

export interface IApiControllerGeneratedReadScopeEntry {
	functionType: TApiControllerGeneratedScopeFunctionType;
	input: object;
	isClaimed: boolean;
	isWriteHydration: boolean;
	where: TApiAuthorizationScopeWhere<IApiBaseEntity>;
}
