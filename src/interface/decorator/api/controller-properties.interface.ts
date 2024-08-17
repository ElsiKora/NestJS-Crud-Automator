
import type { IApiBaseEntity } from "../../api-base-entity.interface";

import type { Type } from "@nestjs/common";
import type { FindOptionsRelations } from "typeorm";
import {EApiDtoType, EApiRouteType} from "../../../enum";

export interface IApiControllerPropertiesRoute<E> {
	decorators?: Array<MethodDecorator> | Array<PropertyDecorator>;
	dto: {
		[key in EApiDtoType]?: Type<unknown>;
	};
	params?: Array<string>;
	relations?: FindOptionsRelations<E>;
	softDelete?: boolean;
}

export interface IApiControllerProperties<E> {
	entity: IApiBaseEntity;
	logging?: boolean;

	only?: Array<`${EApiRouteType}` | EApiRouteType>;
	routes: {
		[key in EApiRouteType]: IApiControllerPropertiesRoute<E>;
	};
}
