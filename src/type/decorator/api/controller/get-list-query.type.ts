import {EFilterOrderDirection} from "../../../../enum";
import {TDateRangeKeys, TNonDateKeys} from "../../../utility";

export type TApiControllerGetListQuery<E> = Partial<TNonDateKeys<E>> &
	TDateRangeKeys<E> & {
		limit: number;
		orderBy?: keyof E;
		orderDirection?: EFilterOrderDirection;
		page: number;
	};
