import type { EApiDtoType } from "@enum/decorator/api";
import type { IApiControllerPropertiesRouteGetListResponseDtoConfig } from "@interface/decorator/api/controller/properties/route";
import type { Type } from "@nestjs/common";

import type { TApiRouteDiscriminatedDtoProperties } from "../discriminated";

export type TApiRouteCustomDtoProperties = Partial<
	{
		[EApiDtoType.BODY]: TApiRouteDiscriminatedDtoProperties | Type<unknown>;
		[EApiDtoType.RESPONSE]: IApiControllerPropertiesRouteGetListResponseDtoConfig | Type<unknown>;
	} & Record<EApiDtoType.PARAMETERS | EApiDtoType.QUERY, Type<unknown>>
>;
