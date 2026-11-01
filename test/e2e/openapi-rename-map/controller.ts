import { Body, HttpStatus, Inject, RequestMethod } from "@nestjs/common";

import { ApiController, ApiRouteCustom, EApiAuthenticationType, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiDtoType, EApiRouteType, EFilterOperation } from "../../../src/index";

import { E2eRenameMapItemEntity, E2eRenameMapRecordEntity } from "./entity";
import { E2eRenameMapAdminGuard, E2eRenameMapPublicGuard } from "./guard";
import { E2eRenameMapItemService, E2eRenameMapRecordService } from "./service";

const disabledWriteRoutes = {
	[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
	[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
	[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
	[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
} as const;

@ApiController<E2eRenameMapItemEntity>({
	entity: E2eRenameMapItemEntity,
	name: "E2eRenameMapAdminItems",
	path: "admin/rename-map-items",
	routes: {
		...disabledWriteRoutes,
		[EApiRouteType.CREATE]: { security: { authentication: { guard: E2eRenameMapAdminGuard, type: EApiAuthenticationType.USER } } },
		[EApiRouteType.GET]: { security: { authentication: { guard: E2eRenameMapAdminGuard, type: EApiAuthenticationType.USER } } },
		[EApiRouteType.GET_LIST]: {
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					filter: { fields: { name: { allowedOperations: [EFilterOperation.EQ], isEnabled: true } }, unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT },
					order: { fields: { name: { isEnabled: true } }, unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT },
				},
			},
			security: { authentication: { guard: E2eRenameMapAdminGuard, type: EApiAuthenticationType.USER } },
		},
	},
})
export class E2eRenameMapAdminItemController {
	@Inject(E2eRenameMapItemService)
	public readonly service!: E2eRenameMapItemService;
}

@ApiController<E2eRenameMapItemEntity>({
	entity: E2eRenameMapItemEntity,
	name: "E2eRenameMapPublicItems",
	path: "public/rename-map-items",
	routes: {
		...disabledWriteRoutes,
		[EApiRouteType.GET]: { security: { authentication: { guard: E2eRenameMapPublicGuard, type: EApiAuthenticationType.USER } } },
		[EApiRouteType.GET_LIST]: {
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					filter: { fields: { name: { allowedOperations: [EFilterOperation.EQ], isEnabled: true } }, unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT },
					order: { fields: { name: { isEnabled: true } }, unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT },
				},
			},
			security: { authentication: { guard: E2eRenameMapPublicGuard, type: EApiAuthenticationType.USER } },
		},
	},
})
export class E2eRenameMapPublicItemController {
	@Inject(E2eRenameMapItemService)
	public readonly service!: E2eRenameMapItemService;
}

@ApiController<E2eRenameMapRecordEntity>({
	entity: E2eRenameMapRecordEntity,
	name: "E2eRenameMapRecords",
	path: "rename-map-records",
	routes: {
		...disabledWriteRoutes,
		[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
	},
})
export class E2eRenameMapRecordController {
	@Inject(E2eRenameMapRecordService)
	public readonly service!: E2eRenameMapRecordService;

	@ApiRouteCustom<E2eRenameMapRecordEntity>({
		autoDto: { [EApiDtoType.BODY]: {} },
		resource: { action: "custom.submit", entity: E2eRenameMapRecordEntity },
		response: { status: HttpStatus.NO_CONTENT, type: undefined },
		route: { method: RequestMethod.POST, path: "submit", type: EApiRouteType.CREATE },
	})
	public submit(@Body() _body: Record<string, unknown>): void {}
}
