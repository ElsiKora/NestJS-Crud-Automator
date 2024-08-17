import type { BaseApiService } from "../../../class";

export interface IBaseApiController<E> {
	service: BaseApiService<E>;
}
