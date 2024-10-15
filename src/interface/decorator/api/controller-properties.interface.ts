import type { EApiAuthenticationType, EApiDtoType, EApiRouteType } from "../../../enum";

import type { IApiBaseEntity } from "../../api-base-entity.interface";

import type { Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { FindOptionsRelations } from "typeorm";

export interface IApiControllerPropertiesRouteAuthentication {
	bearerStrategies?: Array<string>;
	guard: Type<IAuthGuard>;
	securityStrategies?: Array<string>;
	type: EApiAuthenticationType;
}

export interface IApiControllerPropertiesRoute<E> {
	authentication?: IApiControllerPropertiesRouteAuthentication;
	decorators?: Array<MethodDecorator> | Array<PropertyDecorator>;
	dto?: {
		[key in EApiDtoType]?: Type<unknown>;
	};
	isEnabled?: boolean;
	relations?: FindOptionsRelations<E>;
}

export interface IApiControllerProperties<E> {
	entity: IApiBaseEntity;
	routes: {
		[key in EApiRouteType]?: IApiControllerPropertiesRoute<E>;
	};
}
