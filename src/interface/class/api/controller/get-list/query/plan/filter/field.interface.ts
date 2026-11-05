import type { EApiControllerGetListQueryFilterMissingBehavior, EApiPropertyDescribeType } from "@enum/decorator/api";
import type { EFilterOperation } from "@enum/filter";
import type { IApiControllerGetListQueryPlanCondition } from "@interface/class/api/controller/get-list/query/plan/condition.interface";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

export interface IApiControllerGetListQueryPlanFilterField {
	allowedOperations: ReadonlyArray<EFilterOperation>;
	/** TypeORM type of the filtered column, as `IApiEntityColumn.type` holds it; a value of a signed 64-bit integer column is checked for that range. */
	columnType?: unknown;
	defaultCondition?: IApiControllerGetListQueryPlanCondition;
	isEnabled: boolean;
	isNullable: boolean;
	metadata: Readonly<TApiPropertyDescribeProperties>;
	missingBehavior: EApiControllerGetListQueryFilterMissingBehavior;
	path: string;
	type: EApiPropertyDescribeType;
}
