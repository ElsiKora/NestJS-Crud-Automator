import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { EFilterOrderDirection } from "@enum/filter";
import type { TFilterKeys } from "@type/utility";

export type TApiControllerGetListQuery<E, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE> = {
	limit: number;
} & (M extends EApiControllerGetListQueryPaginationMode.CURSOR
	? (
			| {
					after: string;
					before?: never;
					page?: never;
			  }
			| {
					after?: never;
					before: string;
					page?: never;
			  }
			| {
					after?: never;
					before?: never;
					page?: never;
			  }
		) &
			(
				| {
						orderBy: keyof E;
						orderDirection: EFilterOrderDirection;
				  }
				| {
						orderBy?: never;
						orderDirection?: never;
				  }
			)
	: {
			orderBy?: keyof E;
			orderDirection?: EFilterOrderDirection;
			page: number;
		}) &
	Partial<TFilterKeys<E>>;
