import type { TApiControllerGetListQueryFieldDisabled } from "../../field";

import type { TApiControllerGetListQueryFilterFieldEnabled } from "./enabled.type";

export type TApiControllerGetListQueryFilterField<TValue> = TApiControllerGetListQueryFieldDisabled | TApiControllerGetListQueryFilterFieldEnabled<TValue>;
