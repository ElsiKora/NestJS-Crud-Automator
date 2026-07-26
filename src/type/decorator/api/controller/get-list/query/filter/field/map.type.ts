import type { TApiControllerGetListQueryFilterPath, TApiControllerGetListQueryFilterPathValue } from "../../path";

import type { TApiControllerGetListQueryFilterField } from "./type";

export type TApiControllerGetListQueryFilterFields<E> = {
	[P in TApiControllerGetListQueryFilterPath<E>]?: TApiControllerGetListQueryFilterField<TApiControllerGetListQueryFilterPathValue<E, P>>;
};
