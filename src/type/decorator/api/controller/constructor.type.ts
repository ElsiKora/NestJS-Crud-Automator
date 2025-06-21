import type { ApiServiceBase } from "@class/api";

// eslint-disable-next-line @elsikora/typescript/no-explicit-any
export type TApiControllerConstructor = new (...arguments_: Array<any>) => { service: ApiServiceBase<any> };
