import type { EApiControllerRequestTarget } from "@enum/decorator/api";
import type { IApiControllerPropertiesRouteBaseRead, IApiControllerPropertiesRouteReadParametersRequestTarget } from "@interface/decorator/api";

import type { TApiControllerPropertiesRouteWithReadDto } from "./dto.type";

export type TApiControllerPropertiesRouteWithRead<E, T extends { request?: unknown }> = T extends unknown
	? {
			read: IApiControllerPropertiesRouteBaseRead<E>;
			request?: {
				[EApiControllerRequestTarget.PARAMETERS]?: IApiControllerPropertiesRouteReadParametersRequestTarget<E>;
			} & Omit<NonNullable<T["request"]>, EApiControllerRequestTarget.PARAMETERS>;
		} & Omit<T, "dto" | "request"> &
			TApiControllerPropertiesRouteWithReadDto<T>
	: never;
