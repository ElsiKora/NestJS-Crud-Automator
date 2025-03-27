import type { EErrorStringAction } from "@enum/utility";
import type { TApiException } from "@type/class";
import type { TApiControllerGetListQuery } from "@type/decorator/api/controller";

export interface IApiRequestValidator<E> {
	errorType: EErrorStringAction;
	exception: TApiException;
	validationFunction: (entity: Partial<E> | TApiControllerGetListQuery<E>) => boolean | Promise<boolean>;
}
