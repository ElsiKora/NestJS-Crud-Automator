import type { DeepPartial } from "typeorm/index";

import type { IApiGetListResponseResult } from "../../../../../interface";
import type { TApiControllerGetListQuery } from "../../../../decorator";

export type TApiControllerTransformDataObjectToTransform<E> = {
	body?: DeepPartial<E>;
	parameters?: Partial<E>;
	query?: TApiControllerGetListQuery<E>;
	response?: IApiGetListResponseResult<E> | Partial<E>;
};
