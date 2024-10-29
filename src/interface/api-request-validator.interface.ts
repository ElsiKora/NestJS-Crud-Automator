import type { EErrorStringAction } from "../enum";
import type { TApiControllersGetListQuery, TApiException } from "../type";

export interface IApiRequestValidator<E> {
	errorType: EErrorStringAction;
	exception: TApiException;
	validationFunction: (entity: Partial<E> | TApiControllersGetListQuery<E>) => boolean | Promise<boolean>;
}
