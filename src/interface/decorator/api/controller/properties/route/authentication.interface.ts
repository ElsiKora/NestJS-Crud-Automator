import type { Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";

import type { EApiAuthenticationType } from "../../../../../../enum";

export interface IApiControllerPropertiesRouteAuthentication {
	bearerStrategies?: Array<string>;
	guard: Type<IAuthGuard>;
	securityStrategies?: Array<string>;
	type: EApiAuthenticationType;
}
