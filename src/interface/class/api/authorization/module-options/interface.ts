import type { IApiHookPermissionSource } from "@interface/class/api/authorization/hook-permission-source.interface";
import type { IApiAuthorizationIamModuleOptions } from "@interface/class/api/authorization/iam-module-options.interface";
import type { IApiAuthorizationPrincipalResolver } from "@interface/class/api/authorization/principal";

export interface IApiAuthorizationModuleOptions {
	hookPermissionSources?: ReadonlyArray<IApiHookPermissionSource>;
	iam?: IApiAuthorizationIamModuleOptions;
	principalResolver?: IApiAuthorizationPrincipalResolver;
}
