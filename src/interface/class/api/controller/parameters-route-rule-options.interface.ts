import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiRouteMetadata } from "@interface/decorator/api";
import type { Type } from "@nestjs/common";

export interface IApiControllerParametersRouteRuleOptions {
	controller: Type<unknown>;
	handler: object;
	metadata: IApiRouteMetadata<IApiBaseEntity>;
	methodName: string;
	/** Path parameters of the whole route path: global prefix, `RouterModule` path, controller path, and route path. */
	pathParameters: ReadonlyArray<string>;
}
