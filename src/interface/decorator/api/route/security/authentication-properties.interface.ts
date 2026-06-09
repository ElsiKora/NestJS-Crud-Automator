import type { EApiAuthenticationType } from "@enum/decorator/api/authentication-type.enum";
import type { Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";

import type { IApiRouteSecurityRequirement } from "./requirement.interface";

export interface IApiRouteAuthenticationProperties {
	guard: Type<IAuthGuard>;
	securityRequirements?: Array<IApiRouteSecurityRequirement>;
	type: EApiAuthenticationType | string;
}
