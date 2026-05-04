import type { EApiRouteType } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerPropertiesRouteBaseRelations, IApiControllerPropertiesRouteBaseRequest, IApiControllerPropertiesRouteBaseResponse } from "@interface/decorator/api/controller/properties/route/base";
import type { IApiControllerPropertiesRouteWithAutoDto, IApiControllerPropertiesRouteWithDto } from "@interface/decorator/api/controller/properties/route/with";

export interface IApiRouteRuntimeProperties<E extends IApiBaseEntity, R extends EApiRouteType | undefined = EApiRouteType | undefined> {
	autoDto?: R extends EApiRouteType ? IApiControllerPropertiesRouteWithAutoDto<E, R>["autoDto"] : IApiControllerPropertiesRouteWithAutoDto<E, EApiRouteType>["autoDto"];
	dto?: R extends EApiRouteType ? IApiControllerPropertiesRouteWithDto<E, R>["dto"] : IApiControllerPropertiesRouteWithDto<E, EApiRouteType>["dto"];
	relations?: IApiControllerPropertiesRouteBaseRelations<E>;
	request?: R extends EApiRouteType ? IApiControllerPropertiesRouteBaseRequest<E, R> : Partial<IApiControllerPropertiesRouteBaseRequest<E, EApiRouteType.CREATE> & IApiControllerPropertiesRouteBaseRequest<E, EApiRouteType.DELETE> & IApiControllerPropertiesRouteBaseRequest<E, EApiRouteType.GET_LIST> & IApiControllerPropertiesRouteBaseRequest<E, EApiRouteType.GET> & IApiControllerPropertiesRouteBaseRequest<E, EApiRouteType.UPDATE>>;
	response?: R extends EApiRouteType ? IApiControllerPropertiesRouteBaseResponse<E, R> : IApiControllerPropertiesRouteBaseResponse<E, EApiRouteType.CREATE>;
}
