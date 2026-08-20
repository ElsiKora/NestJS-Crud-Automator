import type { IApiControllerGetListQueryPlanOrder } from "@interface/class/api/controller/get-list/query";
import type { TApiControllerGetListQueryCompiledOrderField } from "@type/class/api/controller/get-list/compiled/order-field.type";

export type TApiControllerGetListQueryCompiledOrder = {
	fields: Readonly<Record<string, TApiControllerGetListQueryCompiledOrderField>>;
	serverFields: Readonly<Record<string, TApiControllerGetListQueryCompiledOrderField>>;
} & Omit<IApiControllerGetListQueryPlanOrder, "fields">;
