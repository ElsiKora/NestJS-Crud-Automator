import type { IApiHookPermissionSource } from "../hook-permission-source.interface";
import type { IApiAuthorizationIamModuleOptions } from "../iam-module-options.interface";
import type { IApiAuthorizationPrincipalResolver } from "../principal";

export interface IApiAuthorizationModuleOptions {
	hookPermissionSources?: ReadonlyArray<IApiHookPermissionSource>;
	iam?: IApiAuthorizationIamModuleOptions;
	principalResolver?: IApiAuthorizationPrincipalResolver;
}
