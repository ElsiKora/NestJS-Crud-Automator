import type { FindOperator } from "typeorm/find-options/FindOperator";
import type { FindOptionsWhere } from "typeorm/index";

export type TApiFunctionGetListPropertiesWhere<E> = {
	createdAt?: FindOperator<Date>;
	receivedAt?: FindOperator<Date>;
	updatedAt?: FindOperator<Date>;
} & FindOptionsWhere<E>;
