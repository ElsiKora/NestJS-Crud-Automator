import type { EApiControllerRequestTarget, EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import type { IApiControllerPropertiesRouteBaseRead, IApiControllerPropertiesRouteIdentity, IApiControllerPropertiesRouteReadParametersRequestTarget, IApiControllerPropertiesRouteWithAutoDto, IApiControllerPropertiesRouteWithDto } from "@interface/decorator/api";

import type { TApiControllerGetListQueryDtoContract } from "./get-list/query";

export type TApiControllerPropertiesRoute<E, R extends EApiRouteType> = (R extends EApiRouteType.GET ? TApiControllerPropertiesRouteWithIdentity<E, TApiControllerPropertiesRouteContract<E, R>> : never) | TApiControllerPropertiesRouteWithoutIdentity<TApiControllerPropertiesRouteContract<E, R>>;

type TApiControllerPropertiesRouteContract<E, R extends EApiRouteType> =
	| (R extends EApiRouteType.GET | EApiRouteType.GET_LIST ? TApiControllerPropertiesRouteWithRead<E, IApiControllerPropertiesRouteWithAutoDto<E, R> | (R extends EApiRouteType.GET_LIST ? TApiControllerGetListQueryDtoContract<E> : IApiControllerPropertiesRouteWithDto<E, R>)> : never)
	| TApiControllerPropertiesRouteWithoutRead<IApiControllerPropertiesRouteWithAutoDto<E, R>>
	| TApiControllerPropertiesRouteWithoutRead<R extends EApiRouteType.GET_LIST ? TApiControllerGetListQueryDtoContract<E> : IApiControllerPropertiesRouteWithDto<E, R>>;

type TApiControllerPropertiesRouteWithIdentity<E, T extends { request?: unknown }> = T extends unknown
	? {
			identity: IApiControllerPropertiesRouteIdentity;
			request?: {
				[EApiControllerRequestTarget.PARAMETERS]?: IApiControllerPropertiesRouteReadParametersRequestTarget<E>;
			} & Omit<NonNullable<T["request"]>, EApiControllerRequestTarget.PARAMETERS>;
		} & Omit<T, "dto" | "identity" | "request"> &
			TApiControllerPropertiesRouteWithReadDto<T>
	: never;

type TApiControllerPropertiesRouteWithoutIdentity<T> = T extends unknown ? { identity?: never } & T : never;

type TApiControllerPropertiesRouteWithoutParametersDto<D> = D extends object ? { [EApiDtoType.PARAMETERS]?: never } & Omit<D, EApiDtoType.PARAMETERS> : D;

type TApiControllerPropertiesRouteWithoutRead<T> = T extends unknown ? { read?: never } & T : never;

type TApiControllerPropertiesRouteWithRead<E, T extends { request?: unknown }> = T extends unknown
	? {
			read: IApiControllerPropertiesRouteBaseRead<E>;
			request?: {
				[EApiControllerRequestTarget.PARAMETERS]?: IApiControllerPropertiesRouteReadParametersRequestTarget<E>;
			} & Omit<NonNullable<T["request"]>, EApiControllerRequestTarget.PARAMETERS>;
		} & Omit<T, "dto" | "request"> &
			TApiControllerPropertiesRouteWithReadDto<T>
	: never;
type TApiControllerPropertiesRouteWithReadDto<T> = T extends { dto: infer D } ? { dto: TApiControllerPropertiesRouteWithoutParametersDto<D> } : T extends { dto?: infer D } ? { dto?: TApiControllerPropertiesRouteWithoutParametersDto<D> } : object;
