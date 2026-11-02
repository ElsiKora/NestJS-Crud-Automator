import type { ApiServiceBase } from "@class/api";
import type { EApiControllerGetListQueryPaginationMode, EApiRouteType } from "@enum/decorator/api";
import type { TApiControllerMethodMap, TApiControllerMethodName } from "@type/factory/api/controller/method";

/**
 * The instance of a controller class once its generated methods are written, named by `ApiControllerGetMethodName`.
 * It lists all six route types, including routes disabled with `generation.isEnabled: false`, because a type cannot see a controller's `routes`: calling a disabled route's method compiles and throws a `TypeError`.
 * Remove such a method from the type with `Omit<InstanceType<TApiControllerTargetMethod<E>>, "delete">`.
 * @template E - Entity type.
 * @template M - List pagination mode.
 */
// eslint-disable-next-line @elsikora/typescript/no-explicit-any
export type TApiControllerTargetMethod<E, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE> = new (...arguments_: Array<any>) => {
	[K in EApiRouteType as TApiControllerMethodName<K>]: TApiControllerMethodMap<E, M>[K];
} & {
	service: ApiServiceBase<E>;
};
