import type { EErrorStringAction } from "../enum";
import {TApiException, TApiFunctionGetListProperties} from "../type";

export interface IApiRequestValidator<E> {
	errorType: EErrorStringAction;
	exception: TApiException;
	validationFunction: (entity: Partial<E> | TApiFunctionGetListProperties<E>) => boolean | Promise<boolean>;
}
