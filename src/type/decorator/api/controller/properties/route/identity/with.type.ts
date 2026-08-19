import type { EApiControllerRequestTarget } from "@enum/decorator/api";
import type { IApiControllerPropertiesRouteIdentity, IApiControllerPropertiesRouteReadParametersRequestTarget } from "@interface/decorator/api";

import type { TApiControllerPropertiesRouteWithReadDto } from "../read";

export type TApiControllerPropertiesRouteWithIdentity<E, T extends { request?: unknown }> = T extends unknown
	? {
			identity: IApiControllerPropertiesRouteIdentity;
			request?: {
				[EApiControllerRequestTarget.PARAMETERS]?: IApiControllerPropertiesRouteReadParametersRequestTarget<E>;
			} & Omit<NonNullable<T["request"]>, EApiControllerRequestTarget.PARAMETERS>;
		} & Omit<T, "dto" | "identity" | "request"> &
			TApiControllerPropertiesRouteWithReadDto<T>
	: never;
