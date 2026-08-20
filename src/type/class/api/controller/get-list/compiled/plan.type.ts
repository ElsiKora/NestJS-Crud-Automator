import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { IApiControllerGetListQueryPlan } from "@interface/class/api/controller/get-list/query";
import type { IApiControllerGetListQueryPlanPagination } from "@interface/class/api/controller/get-list/query/plan/pagination.interface";
import type { TApiControllerGetListQueryCompiledOrder } from "@type/class/api/controller/get-list/compiled/order.type";

export type TApiControllerGetListQueryCompiledPlan<M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode> = {
	order: TApiControllerGetListQueryCompiledOrder;
	pagination: IApiControllerGetListQueryPlanPagination<M>;
} & Omit<IApiControllerGetListQueryPlan, "order">;
