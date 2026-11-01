import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerTableInheritancePlan } from "@interface/class/api/controller/table-inheritance";
import type { IApiEntityColumn } from "@interface/entity/column.interface";

export interface IApiEntity<E> extends IApiBaseEntity {
	columns: Array<IApiEntityColumn<E>>;
	primaryKey: IApiEntityColumn<E> | undefined;
	tableInheritance?: IApiControllerTableInheritancePlan;
	tableName: string;
}
