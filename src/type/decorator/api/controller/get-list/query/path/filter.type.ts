import type { TApiControllerGetListQueryDirectScalarPath } from "./direct-scalar.type";
import type { TApiControllerGetListQueryOneHopToOneScalarPath } from "./one-hop-to-one-scalar.type";

export type TApiControllerGetListQueryFilterPath<E> = TApiControllerGetListQueryDirectScalarPath<E> | TApiControllerGetListQueryOneHopToOneScalarPath<E>;
