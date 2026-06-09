import type { EApiAuthenticationType } from "@enum/decorator/api";
import type { IApiRouteSecurityRequirement } from "@interface/decorator/api/route";
import type { Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";

export interface IApiControllerPropertiesRouteAuthentication {
	guard: Type<IAuthGuard>;
	securityRequirements?: Array<IApiRouteSecurityRequirement>;
	type: EApiAuthenticationType | string;
}
