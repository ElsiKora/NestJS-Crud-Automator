import type { ApiServiceBase } from "../../../../class";

export interface IApiControllerBase<E> {
	service: ApiServiceBase<E>;
}
