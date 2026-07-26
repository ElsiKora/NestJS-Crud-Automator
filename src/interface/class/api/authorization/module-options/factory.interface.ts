import type { IApiAuthorizationModuleOptions } from "@interface/class/api/authorization/module-options/interface";

export interface IApiAuthorizationModuleOptionsFactory {
	createApiAuthorizationModuleOptions(): IApiAuthorizationModuleOptions | Promise<IApiAuthorizationModuleOptions>;
}
