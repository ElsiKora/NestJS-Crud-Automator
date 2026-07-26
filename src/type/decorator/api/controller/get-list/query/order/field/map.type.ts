import type { TApiControllerGetListQueryOrderPath } from "../../path";

import type { TApiControllerGetListQueryOrderField } from "./type";

export type TApiControllerGetListQueryOrderFields<E> = Partial<Record<TApiControllerGetListQueryOrderPath<E>, TApiControllerGetListQueryOrderField>>;
