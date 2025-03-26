import type { IApiGetListResponseResult } from "@interface/decorator/api";
import type { TApiControllerGetListQuery } from "@type/decorator/api/controller";
import type { DeepPartial } from "typeorm/index";

export type TApiControllerTransformDataObjectToTransform<E> = {
	body?: DeepPartial<E>;
	parameters?: Partial<E>;
	query?: TApiControllerGetListQuery<E>;
	response?: IApiGetListResponseResult<E> | Partial<E>;
};
