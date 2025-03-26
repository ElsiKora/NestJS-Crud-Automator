import type { ApiServiceBase } from "@class/api";

export interface IApiControllerBase<E> {
	service: ApiServiceBase<E>;
}
