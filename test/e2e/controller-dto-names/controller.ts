import { Inject } from "@nestjs/common";

import { ApiController, EApiAuthenticationType, EApiRouteType } from "../../../src/index";

import { E2eDtoNameItemEntity } from "./entity";
import { E2eDtoNameAdminGuard, E2eDtoNamePublicGuard } from "./guard";
import { E2eDtoNameItemService } from "./service";

const adminAuthentication = { guard: E2eDtoNameAdminGuard, type: EApiAuthenticationType.USER };
const publicAuthentication = { guard: E2eDtoNamePublicGuard, type: EApiAuthenticationType.USER };

@ApiController<E2eDtoNameItemEntity>({
	entity: E2eDtoNameItemEntity,
	name: "E2eDtoNameAdminItems",
	path: "admin/dto-name-items",
	routes: {
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { security: { authentication: adminAuthentication } },
		[EApiRouteType.GET_LIST]: { security: { authentication: adminAuthentication } },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})
export class E2eDtoNameAdminItemController {
	@Inject(E2eDtoNameItemService)
	public readonly service!: E2eDtoNameItemService;
}

@ApiController<E2eDtoNameItemEntity>({
	entity: E2eDtoNameItemEntity,
	name: "E2eDtoNamePublicItems",
	path: "public/dto-name-items",
	routes: {
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { security: { authentication: publicAuthentication } },
		[EApiRouteType.GET_LIST]: { security: { authentication: publicAuthentication } },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})
export class E2eDtoNamePublicItemController {
	@Inject(E2eDtoNameItemService)
	public readonly service!: E2eDtoNameItemService;
}
