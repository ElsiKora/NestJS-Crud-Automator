import type { CanActivate, Type } from "@nestjs/common";

import { HttpStatus, Inject, Param, RequestMethod } from "@nestjs/common";

import { ApiController, ApiRouteCustom, EApiAuthenticationType, EApiDtoType, EApiRouteType } from "../../../../src/index";
import { E2eDtoNameItemEntity } from "../entity";
import { E2eDtoNameAdminGuard, E2eDtoNamePublicGuard } from "../guard";
import { E2eDtoNameItemService } from "../service";

const NO_GENERATED_ROUTES = {
	[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
	[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
	[EApiRouteType.GET]: { generation: { isEnabled: false } },
	[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
	[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
	[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
} as const;

export class E2eDtoNameSharedMineBase {
	@Inject(E2eDtoNameItemService)
	public readonly service!: E2eDtoNameItemService;

	@ApiRouteCustom<E2eDtoNameItemEntity>({
		autoDto: { [EApiDtoType.PARAMETERS]: {} },
		resource: { action: "custom.mine", entity: E2eDtoNameItemEntity },
		response: { status: HttpStatus.NO_CONTENT, type: undefined },
		route: { method: RequestMethod.GET, path: "mine/:id", type: EApiRouteType.GET },
		security: { authentication: { guard: E2eDtoNamePublicGuard, type: EApiAuthenticationType.USER } },
	})
	public mine(@Param() _parameters: Record<string, string>): void {}
}

@ApiController<E2eDtoNameItemEntity>({ entity: E2eDtoNameItemEntity, path: "shared-a/dto-name-items", routes: NO_GENERATED_ROUTES })
export class E2eDtoNameSharedAController extends E2eDtoNameSharedMineBase {}

@ApiController<E2eDtoNameItemEntity>({ entity: E2eDtoNameItemEntity, path: "shared-b/dto-name-items", routes: NO_GENERATED_ROUTES })
export class E2eDtoNameSharedBController extends E2eDtoNameSharedMineBase {}

/**
 * Declares a class with one custom route under the given guard, as a mixin factory shared by several controllers would.
 * @param {Type<CanActivate>} guard - Guard of the custom route.
 * @returns {Type<{ service: E2eDtoNameItemService }>} The class, always named MineMixin.
 */
function WithMine(guard: Type<CanActivate>): Type<{ service: E2eDtoNameItemService }> {
	class MineMixin {
		@Inject(E2eDtoNameItemService)
		public readonly service!: E2eDtoNameItemService;

		@ApiRouteCustom<E2eDtoNameItemEntity>({
			autoDto: { [EApiDtoType.PARAMETERS]: {} },
			resource: { action: "custom.mine", entity: E2eDtoNameItemEntity },
			response: { status: HttpStatus.NO_CONTENT, type: undefined },
			route: { method: RequestMethod.GET, path: "mine/:id", type: EApiRouteType.GET },
			security: { authentication: { guard, type: EApiAuthenticationType.USER } },
		})
		public mine(@Param() _parameters: Record<string, string>): void {}
	}

	return MineMixin;
}

@ApiController<E2eDtoNameItemEntity>({ entity: E2eDtoNameItemEntity, path: "mine-mixin-a/dto-name-items", routes: NO_GENERATED_ROUTES })
export class E2eDtoNameMineMixinAController extends WithMine(E2eDtoNameAdminGuard) {}

@ApiController<E2eDtoNameItemEntity>({ entity: E2eDtoNameItemEntity, path: "mine-mixin-b/dto-name-items", routes: NO_GENERATED_ROUTES })
export class E2eDtoNameMineMixinBController extends WithMine(E2eDtoNamePublicGuard) {}
