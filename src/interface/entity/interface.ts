import type { IApiEntityColumn } from "./column.interface";
import type { IApiBaseEntity } from "../api-base-entity.interface";

export interface IApiEntity extends IApiBaseEntity {
	columns: Array<IApiEntityColumn>;
	primaryKey: IApiEntityColumn | undefined;
	tableName: string;
}
