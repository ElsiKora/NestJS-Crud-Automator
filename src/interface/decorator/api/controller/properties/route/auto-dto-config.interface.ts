import type { IApiDtoValidator } from "@interface/api-dto-validator.interface";

export interface IApiControllerPropertiesRouteAutoDtoConfig {
	validators?: Array<IApiDtoValidator>;
}
