import type { EFilterOrderDirection } from "../../../../enum";
import type { TFilterKeys } from "../../../utility";

export type TApiControllerGetListQuery<E> = {
	limit: number;
	orderBy?: keyof E;
	orderDirection?: EFilterOrderDirection;
	page: number;
} & Partial<TFilterKeys<E>>;
