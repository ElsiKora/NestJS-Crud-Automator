import type { FactoryProvider, ModuleMetadata, Type } from "@nestjs/common";

import type { IApiAuthorizationModuleOptionsFactory } from "./factory.interface";
import type { IApiAuthorizationModuleOptions } from "./interface";

export interface IApiAuthorizationModuleAsyncOptions extends Pick<ModuleMetadata, "imports"> {
	inject?: FactoryProvider["inject"];
	useClass?: Type<IApiAuthorizationModuleOptionsFactory>;
	useExisting?: Type<IApiAuthorizationModuleOptionsFactory>;
	useFactory?: FactoryProvider<IApiAuthorizationModuleOptions>["useFactory"];
}
