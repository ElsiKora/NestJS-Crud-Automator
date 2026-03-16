import type { IApiAuthorizationModuleOptions } from "./interface";

export interface IApiAuthorizationModuleOptionsFactory {
	createApiAuthorizationModuleOptions(): IApiAuthorizationModuleOptions | Promise<IApiAuthorizationModuleOptions>;
}
