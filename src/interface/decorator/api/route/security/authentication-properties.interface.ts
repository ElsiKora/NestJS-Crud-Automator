import type { EApiAuthenticationType } from "@enum/decorator/api/authentication-type.enum";
import type { IApiRouteSecurityRequirement } from "@interface/decorator/api/route/security/requirement.interface";
import type { Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";

export interface IApiRouteAuthenticationProperties {
	guard: Type<IAuthGuard>;
	securityRequirements?: Array<IApiRouteSecurityRequirement>;
	type: EApiAuthenticationType | string;
}
