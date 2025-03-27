import type { ApiServiceBase } from "@class/api";

export type TApiControllerConstructor = new (...arguments_: Array<any>) => { service: ApiServiceBase<any> };
