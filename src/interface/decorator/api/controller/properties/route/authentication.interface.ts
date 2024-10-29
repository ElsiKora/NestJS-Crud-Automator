import type { EApiAuthenticationType } from "../../../../../../enum";

import type { Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";

export interface IApiControllerPropertiesRouteAuthentication {
	bearerStrategies?: Array<string>;
	guard: Type<IAuthGuard>;
	securityStrategies?: Array<string>;
	type: EApiAuthenticationType;
}