import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { ColumnType } from "typeorm";

export interface IApiEntityColumn<E> {
	isPrimary: boolean;
	metadata?: Record<string, unknown>;
	name: keyof E;
	relation?: {
		target: IApiBaseEntity;
	};
	type: ColumnType;
}
