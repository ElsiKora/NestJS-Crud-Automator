import type { ColumnType } from "typeorm";

export interface IApiEntityColumn {
	isPrimary: boolean;
	metadata?: Record<string, any> | undefined;
	name: string;
	type: ColumnType;
}
