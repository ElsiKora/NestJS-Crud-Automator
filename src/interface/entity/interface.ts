import type { IApiControllerTableInheritancePlan } from "@interface/class/api/controller/table-inheritance";
import type { IApiEntityColumn } from "@interface/entity/column.interface";

export interface IApiEntity<E> {
	columns: Array<IApiEntityColumn<E>>;
	name?: string;
	primaryKey: IApiEntityColumn<E> | undefined;
	tableInheritance?: IApiControllerTableInheritancePlan;
	tableName: string;
}
