import type { EApiAuthenticationType } from "@enum/decorator/api/authentication-type.enum";
import type { Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";

export interface IApiRouteAuthenticationProperties {
	bearerStrategies?: Array<string>;
	guard: Type<IAuthGuard>;
	securityStrategies?: Array<string>;
	type: EApiAuthenticationType | string;
}
