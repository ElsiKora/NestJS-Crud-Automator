import type { ApiServiceBase } from "@class/api";
import type { TApiServiceKeys } from "@type/decorator/api/service";
import type { Repository } from "typeorm";

export type TApiControllerMethod<E> = {
	service: { repository?: Repository<E & object> } & ApiServiceBase<E>;
} & Partial<TApiServiceKeys<E>>;
