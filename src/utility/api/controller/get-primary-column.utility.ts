import type { DeepPartial } from "typeorm";

import type { IApiControllerPrimaryColumn, IApiEntity, IApiEntityColumn } from "../../../interface";

export function ApiControllerGetPrimaryColumn<E>(parameters: DeepPartial<E> | Partial<E>, entityMetadata: IApiEntity<E>): IApiControllerPrimaryColumn<E> | undefined {
	const primaryKeyColumn: IApiEntityColumn<E> | undefined = entityMetadata.columns.find((column: IApiEntityColumn<E>): column is IApiEntityColumn<E> => column.isPrimary);

	if (!primaryKeyColumn) {
		return undefined;
	}

	return {
		key: primaryKeyColumn.name,
		value: parameters[primaryKeyColumn.name as keyof DeepPartial<E>] as string,
	};
}
