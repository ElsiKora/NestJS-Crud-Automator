import type { ApiServiceBase } from "@class/api";

export type TApiControllerConstructor = new (...arguments_: Array<unknown>) => { service: ApiServiceBase<unknown> };
