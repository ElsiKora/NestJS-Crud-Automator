import type { ColumnType } from "typeorm";

export interface IApiEntityColumn<E> {
	isPrimary: boolean;
	metadata?: Record<string, unknown>;
	name: keyof E;
	type: ColumnType;
}
