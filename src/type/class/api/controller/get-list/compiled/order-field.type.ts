import type { EApiPropertyDescribeType } from "@enum/decorator/api";
import type { IApiControllerGetListQueryPlanOrderField } from "@interface/class/api/controller/get-list/query";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

export type TApiControllerGetListQueryCompiledOrderField = {
	columnMode: string;
	columnType: string;
	hasTransformer: boolean;
	isColumnArray: boolean;
	isNullable: boolean;
	isSelected: boolean;
	isUnsigned: boolean;
	metadata: Readonly<TApiPropertyDescribeProperties>;
	precision?: null | number;
	scale?: number;
	type: EApiPropertyDescribeType;
} & IApiControllerGetListQueryPlanOrderField;
