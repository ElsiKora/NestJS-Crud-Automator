import type { FindOptionsWhere } from "typeorm/index";
import {FindOperator} from "typeorm/find-options/FindOperator";

export type TApiFunctionGetListPropertiesWhere<E> = {
	createdAt?: FindOperator<Date>;
    updatedAt?: FindOperator<Date>;
    receivedAt?: FindOperator<Date>;
} & FindOptionsWhere<E>;
