import type { IApiHookPermissionSource } from "@interface/class/api/authorization/hook-permission-source.interface";
import type { IApiAuthorizationIamModuleOptions } from "@interface/class/api/authorization/iam-module-options.interface";
import type { IApiAuthorizationPrincipalResolver } from "@interface/class/api/authorization/principal";
import type { TApiAuthorizationCacheOptions } from "@type/class/api/authorization/cache-options.type";

export interface IApiAuthorizationModuleOptions {
	cache?: TApiAuthorizationCacheOptions;
	hookPermissionSources?: ReadonlyArray<IApiHookPermissionSource>;
	iam?: IApiAuthorizationIamModuleOptions;
	principalResolver?: IApiAuthorizationPrincipalResolver;
}
