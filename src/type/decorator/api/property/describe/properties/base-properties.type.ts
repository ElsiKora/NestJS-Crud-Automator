import type { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import type { TApiPropertyDescribePropertiesBaseDtoProperties } from "@type/decorator/api/property";

export type TApiPropertyDescribePropertiesBaseProperties = {
	[EApiRouteType.CREATE]?: Pick<TApiPropertyDescribePropertiesBaseDtoProperties, EApiDtoType.BODY | EApiDtoType.RESPONSE>;
	[EApiRouteType.DELETE]?: Pick<TApiPropertyDescribePropertiesBaseDtoProperties, EApiDtoType.REQUEST>;
	[EApiRouteType.GET_LIST]?: Pick<TApiPropertyDescribePropertiesBaseDtoProperties, EApiDtoType.QUERY | EApiDtoType.RESPONSE>;
	[EApiRouteType.GET]?: Pick<TApiPropertyDescribePropertiesBaseDtoProperties, EApiDtoType.REQUEST | EApiDtoType.RESPONSE>;
	[EApiRouteType.PARTIAL_UPDATE]?: Pick<TApiPropertyDescribePropertiesBaseDtoProperties, EApiDtoType.BODY | EApiDtoType.REQUEST | EApiDtoType.RESPONSE>;
	[EApiRouteType.UPDATE]?: Pick<TApiPropertyDescribePropertiesBaseDtoProperties, EApiDtoType.BODY | EApiDtoType.REQUEST | EApiDtoType.RESPONSE>;
};
