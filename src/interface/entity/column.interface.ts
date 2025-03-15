import type { ColumnType } from "typeorm";

export interface IApiEntityColumn<E> {
	isPrimary: boolean;
	metadata?: Record<string, any>;
	name: keyof E;
	type: ColumnType;
}
