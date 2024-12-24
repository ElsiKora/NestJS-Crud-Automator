import type { ApiServiceBase } from "../../../class";
import type { TApiServiceKeys } from "../../decorator";

export type TApiControllerMethod<E> = {
	service: ApiServiceBase<E>;
} & Partial<TApiServiceKeys<E>>;
