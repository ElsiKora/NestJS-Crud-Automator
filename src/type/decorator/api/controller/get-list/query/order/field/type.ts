import type { TApiControllerGetListQueryFieldDisabled } from "../../field";

import type { TApiControllerGetListQueryOrderFieldEnabled } from "./enabled.type";

export type TApiControllerGetListQueryOrderField = TApiControllerGetListQueryFieldDisabled | TApiControllerGetListQueryOrderFieldEnabled;
