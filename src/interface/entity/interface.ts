import type { IApiEntityColumn } from "./column.interface";
import type { IApiBaseEntity } from "../api-base-entity.interface";

export interface IApiEntity<E> extends IApiBaseEntity {
	columns: Array<IApiEntityColumn<E>>;
	primaryKey: IApiEntityColumn<E> | undefined;
	tableName: string;
}
