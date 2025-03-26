import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiEntityColumn } from "@interface/entity/column.interface";

export interface IApiEntity<E> extends IApiBaseEntity {
	columns: Array<IApiEntityColumn<E>>;
	primaryKey: IApiEntityColumn<E> | undefined;
	tableName: string;
}
