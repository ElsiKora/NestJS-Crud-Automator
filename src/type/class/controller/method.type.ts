import type { BaseApiService } from "../../../class";
import type { TApiServiceKeys } from "../../decorator";

export type TApiControllerMethod<E> = {
	service: BaseApiService<E>;
} & Partial<TApiServiceKeys<E>>;
