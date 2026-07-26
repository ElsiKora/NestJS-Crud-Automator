import type { FindOperator, FindOptionsWhere } from "typeorm";

export type TApiFunctionGetListPropertiesWhere<E> = {
	createdAt?: FindOperator<Date>;
	receivedAt?: FindOperator<Date>;
	updatedAt?: FindOperator<Date>;
} & FindOptionsWhere<E>;
