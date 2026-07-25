import type { IApiAuthorizationModuleOptionsFactory } from "@interface/class/api/authorization/module-options/factory.interface";
import type { IApiAuthorizationModuleOptions } from "@interface/class/api/authorization/module-options/interface";
import type { FactoryProvider, ModuleMetadata, Type } from "@nestjs/common";

export interface IApiAuthorizationModuleAsyncOptions extends Pick<ModuleMetadata, "imports"> {
	inject?: FactoryProvider["inject"];
	useClass?: Type<IApiAuthorizationModuleOptionsFactory>;
	useExisting?: Type<IApiAuthorizationModuleOptionsFactory>;
	useFactory?: FactoryProvider<IApiAuthorizationModuleOptions>["useFactory"];
}
