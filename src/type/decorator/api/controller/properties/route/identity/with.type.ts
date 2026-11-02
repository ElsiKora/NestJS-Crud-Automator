import type { EApiControllerRequestTarget } from "@enum/decorator/api";
import type { IApiControllerPropertiesRouteIdentity, IApiControllerPropertiesRoutePathParametersRequestTarget } from "@interface/decorator/api";

import type { TApiControllerPropertiesRouteWithIdentityDto } from "./dto.type";

export type TApiControllerPropertiesRouteWithIdentity<E, T extends { request?: unknown }> = T extends unknown
	? {
			identity: IApiControllerPropertiesRouteIdentity;
			request?: {
				[EApiControllerRequestTarget.PARAMETERS]?: IApiControllerPropertiesRoutePathParametersRequestTarget<E>;
			} & Omit<NonNullable<T["request"]>, EApiControllerRequestTarget.PARAMETERS>;
		} & Omit<T, "dto" | "identity" | "request"> &
			TApiControllerPropertiesRouteWithIdentityDto<T>
	: never;
