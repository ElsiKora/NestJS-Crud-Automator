import { Inject } from "@nestjs/common";

import { ApiController, EApiAuthenticationType, EApiRouteType } from "../../../../src/index";
import { E2eDtoNameItemEntity } from "../entity";
import { E2eDtoNameAdminGuard, E2eDtoNamePublicGuard } from "../guard";
import { E2eDtoNameItemService } from "../service";

const GET_ONLY_ROUTES = {
	[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
	[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
	[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
	[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
	[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
} as const;

/**
 * Wraps a controller class in a named subclass, as a logging mixin would.
 * @param {T} base - Decorated controller class.
 * @returns {T} The subclass, always named Logged.
 * @template T - Controller class type.
 */
// eslint-disable-next-line @elsikora/typescript/no-explicit-any
function Logged<T extends new (...arguments_: Array<any>) => object>(base: T): T {
	return class Logged extends base {};
}

@ApiController<E2eDtoNameItemEntity>({
	entity: E2eDtoNameItemEntity,
	path: "mixin/dto-name-items",
	routes: { ...GET_ONLY_ROUTES, [EApiRouteType.GET]: { security: { authentication: { guard: E2eDtoNameAdminGuard, type: EApiAuthenticationType.USER } } } },
})
export class E2eDtoNameMixinBaseController {
	@Inject(E2eDtoNameItemService)
	public readonly service!: E2eDtoNameItemService;
}

export const E2eDtoNameAnonymousMixinController: typeof E2eDtoNameMixinBaseController = (() => class extends E2eDtoNameMixinBaseController {})();

@ApiController<E2eDtoNameItemEntity>({
	entity: E2eDtoNameItemEntity,
	path: "ka/dto-name-items",
	routes: { ...GET_ONLY_ROUTES, [EApiRouteType.GET]: { security: { authentication: { guard: E2eDtoNameAdminGuard, type: EApiAuthenticationType.USER } } } },
})
class E2eDtoNameKaController {
	@Inject(E2eDtoNameItemService)
	public readonly service!: E2eDtoNameItemService;
}

@ApiController<E2eDtoNameItemEntity>({
	entity: E2eDtoNameItemEntity,
	path: "kb/dto-name-items",
	routes: { ...GET_ONLY_ROUTES, [EApiRouteType.GET]: { security: { authentication: { guard: E2eDtoNamePublicGuard, type: EApiAuthenticationType.USER } } } },
})
class E2eDtoNameKbController {
	@Inject(E2eDtoNameItemService)
	public readonly service!: E2eDtoNameItemService;
}

export const E2eDtoNameLoggedKaController: typeof E2eDtoNameKaController = Logged(E2eDtoNameKaController);

export const E2eDtoNameLoggedKbController: typeof E2eDtoNameKbController = Logged(E2eDtoNameKbController);

@ApiController<E2eDtoNameItemEntity>({
	entity: E2eDtoNameItemEntity,
	path: "base-crud/dto-name-items",
	routes: { ...GET_ONLY_ROUTES, [EApiRouteType.GET]: { security: { authentication: { guard: E2eDtoNameAdminGuard, type: EApiAuthenticationType.USER } } } },
})
export class E2eDtoNameBaseCrudController {
	@Inject(E2eDtoNameItemService)
	public readonly service!: E2eDtoNameItemService;
}

export class E2eDtoNameChildCrudController extends E2eDtoNameBaseCrudController {}
