import { HttpStatus, Inject, Param, RequestMethod } from "@nestjs/common";

import { ApiController, ApiRouteCustom, EApiAuthenticationType, EApiDtoType, EApiRouteType } from "../../../src/index";

import { E2eDtoNameItemEntity } from "./entity";
import { E2eDtoNameAdminGuard, E2eDtoNamePublicGuard } from "./guard";
import { E2eDtoNameItemService } from "./service";

@ApiController<E2eDtoNameItemEntity>({
	entity: E2eDtoNameItemEntity,
	name: "E2eDtoNameCustomItems",
	path: "custom/dto-name-items",
	routes: {
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { security: { authentication: { guard: E2eDtoNameAdminGuard, type: EApiAuthenticationType.USER } } },
		[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})
export class E2eDtoNameCustomItemController {
	@Inject(E2eDtoNameItemService)
	public readonly service!: E2eDtoNameItemService;

	@ApiRouteCustom<E2eDtoNameItemEntity>({
		autoDto: { [EApiDtoType.PARAMETERS]: {} },
		resource: { action: "custom.getPublic", entity: E2eDtoNameItemEntity },
		response: { status: HttpStatus.NO_CONTENT, type: undefined },
		route: { method: RequestMethod.GET, path: "public/:id", type: EApiRouteType.GET },
		security: { authentication: { guard: E2eDtoNamePublicGuard, type: EApiAuthenticationType.USER } },
	})
	public getPublic(@Param() _parameters: Record<string, string>): void {}

	@ApiRouteCustom<E2eDtoNameItemEntity>({
		autoDto: { [EApiDtoType.PARAMETERS]: {} },
		resource: { action: "custom.getMine", entity: E2eDtoNameItemEntity },
		response: { status: HttpStatus.NO_CONTENT, type: undefined },
		route: { method: RequestMethod.GET, path: "mine/:id", type: EApiRouteType.GET },
		security: { authentication: { guard: E2eDtoNamePublicGuard, type: EApiAuthenticationType.USER } },
	})
	public getMine(@Param() _parameters: Record<string, string>): void {}
}
