import type { EApiAuthenticationType } from "@enum/decorator/api";
import type { IApiRouteSecurityRequirement } from "@interface/decorator/api/route";
import type { CanActivate, Type } from "@nestjs/common";

export interface IApiControllerPropertiesRouteAuthentication {
	guard: Type<CanActivate>;
	securityRequirements?: Array<IApiRouteSecurityRequirement>;
	type: EApiAuthenticationType | string;
}
