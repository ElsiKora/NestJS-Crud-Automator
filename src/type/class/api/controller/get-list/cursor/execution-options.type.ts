import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerGetListQueryPlanOrderEntry } from "@interface/class/api/controller/get-list/query";
import type { TApiControllerGetListQueryCompiledOrderField } from "@type/class/api/controller/get-list/compiled/order-field.type";
import type { TApiControllerGetListQueryCompiledPlan } from "@type/class/api/controller/get-list/compiled/plan.type";
import type { TApiFunctionGetManyProperties } from "@type/decorator/api/function";

export type TApiControllerGetListCursorExecutionOptions<E extends IApiBaseEntity> = {
	baseProperties: TApiFunctionGetManyProperties<E>;
	contextHash: string;
	cursor?: string;
	direction?: "after" | "before";
	limit: number;
	onBeforeQuery: () => void;
	order: ReadonlyArray<IApiControllerGetListQueryPlanOrderEntry>;
	plan: TApiControllerGetListQueryCompiledPlan<EApiControllerGetListQueryPaginationMode.CURSOR>;
	run: (properties: TApiFunctionGetManyProperties<E>) => Promise<Array<E>>;
	validateStorageValue: (field: TApiControllerGetListQueryCompiledOrderField, value: unknown) => void;
};
