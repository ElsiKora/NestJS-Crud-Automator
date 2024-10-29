import type { ApiServiceBase } from "../../../../class";

export type TApiControllerConstructor = new (...arguments_: Array<any>) => { service: ApiServiceBase<any> };
