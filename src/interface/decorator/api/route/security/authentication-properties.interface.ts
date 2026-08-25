import type { EApiAuthenticationType } from "@enum/decorator/api/authentication-type.enum";
import type { IApiRouteSecurityRequirement } from "@interface/decorator/api/route/security/requirement.interface";
import type { CanActivate, Type } from "@nestjs/common";

export interface IApiRouteAuthenticationProperties {
	guard: Type<CanActivate>;
	securityRequirements?: Array<IApiRouteSecurityRequirement>;
	type: EApiAuthenticationType | string;
}
