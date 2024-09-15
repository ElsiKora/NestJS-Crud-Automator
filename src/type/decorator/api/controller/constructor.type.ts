import type { BaseApiService } from "../../../../class";

export type TApiControllerConstructor = new (...arguments_: Array<any>) => { service: BaseApiService<any> };
