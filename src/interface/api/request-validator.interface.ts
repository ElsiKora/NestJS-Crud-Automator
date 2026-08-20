import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { EErrorStringAction } from "@enum/utility";
import type { TApiException } from "@type/class";
import type { TApiControllerGetListQuery } from "@type/decorator/api/controller";

export interface IApiRequestValidator<E, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE> {
	errorType: EErrorStringAction;
	exception: TApiException;
	validationFunction: (entity: Partial<E> | TApiControllerGetListQuery<E, M>) => boolean | Promise<boolean>;
}
