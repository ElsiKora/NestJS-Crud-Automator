import type { ColumnType } from "typeorm";

export interface IApiEntityColumn<E> {
	isPrimary: boolean;
	metadata?: Record<string, any> | undefined;
	name: keyof E;
	type: ColumnType;
}
