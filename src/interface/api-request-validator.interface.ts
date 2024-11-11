import type { EErrorStringAction } from "../enum";
import type { TApiControllerGetListQuery, TApiException } from "../type";

export interface IApiRequestValidator<E> {
	errorType: EErrorStringAction;
	exception: TApiException;
	validationFunction: (entity: Partial<E> | TApiControllerGetListQuery<E>) => boolean | Promise<boolean>;
}
