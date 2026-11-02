import type { EApiRouteType } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerAuthorizationProperties } from "@interface/decorator/api/controller/properties/authorization.interface";
import type { IApiControllerPropertiesRowPath } from "@interface/decorator/api/controller/properties/row-path.interface";
import type { TApiEntityReference } from "@type/api-entity-reference.type";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";

export interface IApiControllerProperties<E extends IApiBaseEntity> {
	authorization?: IApiControllerAuthorizationProperties<E>;
	entity: TApiEntityReference;
	name?: string;
	path?: string;
	routes: {
		[R in EApiRouteType]?: TApiControllerPropertiesRoute<E, R>;
	};
	/** The primary key columns a generated row route takes as path parameters, in path order. All key columns in declaration order by default. */
	rowPath?: IApiControllerPropertiesRowPath<E>;
}
