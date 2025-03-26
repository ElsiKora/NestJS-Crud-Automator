import type { ApiServiceBase } from "@class/api";
import type { TApiServiceKeys } from "@type/decorator/api/service";

export type TApiControllerMethod<E> = {
	service: ApiServiceBase<E>;
} & Partial<TApiServiceKeys<E>>;
