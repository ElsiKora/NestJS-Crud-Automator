import type { EFilterOrderDirection } from "@enum/filter-order-direction.enum";
import type { TFilterKeys } from "@type/utility";

export type TApiControllerGetListQuery<E> = {
	limit: number;
	orderBy?: keyof E;
	orderDirection?: EFilterOrderDirection;
	page: number;
} & Partial<TFilterKeys<E>>;
