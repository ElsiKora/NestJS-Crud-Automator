import { Inject } from "@nestjs/common";

import { ApiController, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiRouteType } from "../../../src/index";

import { E2eInheritedOrderRecordEntity } from "./record.entity";
import { E2eInheritedOrderRecordService } from "./record.service";
import { E2eInheritedOrderStiChildEntity } from "./sti-child.entity";
import { E2eInheritedOrderStiChildService } from "./sti-child.service";

const disabledRoute = { generation: { isEnabled: false } } as const;
const disabledRoutes = {
	[EApiRouteType.CREATE]: disabledRoute,
	[EApiRouteType.DELETE]: disabledRoute,
	[EApiRouteType.GET]: disabledRoute,
	[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
	[EApiRouteType.UPDATE]: disabledRoute,
} as const;

@ApiController<E2eInheritedOrderRecordEntity>({
	entity: E2eInheritedOrderRecordEntity,
	name: "E2eInheritedOrderRecords",
	path: "inherited-order/records",
	routes: { ...disabledRoutes, [EApiRouteType.GET_LIST]: {} },
})
export class E2eInheritedOrderRecordController {
	@Inject(E2eInheritedOrderRecordService)
	public readonly service!: E2eInheritedOrderRecordService;
}

@ApiController<E2eInheritedOrderRecordEntity>({
	entity: E2eInheritedOrderRecordEntity,
	name: "E2eInheritedOrderTypedRecords",
	path: "inherited-order/typed-records",
	routes: { ...disabledRoutes, [EApiRouteType.GET_LIST]: { request: { [EApiControllerRequestTarget.QUERY]: { order: { fields: { createdAt: { isEnabled: true }, rank: { isEnabled: true } }, unlistedFields: EApiControllerGetListQueryUnlistedFields.INHERIT } } } } },
})
export class E2eInheritedOrderTypedRecordController {
	@Inject(E2eInheritedOrderRecordService)
	public readonly service!: E2eInheritedOrderRecordService;
}

@ApiController<E2eInheritedOrderStiChildEntity>({
	entity: E2eInheritedOrderStiChildEntity,
	name: "E2eInheritedOrderStiChildren",
	path: "inherited-order/sti-children",
	routes: { ...disabledRoutes, [EApiRouteType.GET_LIST]: {} },
})
export class E2eInheritedOrderStiChildController {
	@Inject(E2eInheritedOrderStiChildService)
	public readonly service!: E2eInheritedOrderStiChildService;
}

@ApiController<E2eInheritedOrderStiChildEntity>({
	entity: E2eInheritedOrderStiChildEntity,
	name: "E2eInheritedOrderTypedStiChildren",
	path: "inherited-order/typed-sti-children",
	routes: { ...disabledRoutes, [EApiRouteType.GET_LIST]: { request: { [EApiControllerRequestTarget.QUERY]: { order: { fields: { name: { isEnabled: true }, rank: { isEnabled: true } }, unlistedFields: EApiControllerGetListQueryUnlistedFields.INHERIT } } } } },
})
export class E2eInheritedOrderTypedStiChildController {
	@Inject(E2eInheritedOrderStiChildService)
	public readonly service!: E2eInheritedOrderStiChildService;
}
