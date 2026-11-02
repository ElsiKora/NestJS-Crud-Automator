import { Inject } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";

import { ApiController, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiDtoType, EApiRouteType } from "../../../../src/index";

import { E2eListLazyResponseItemEntity } from "../item.entity";
import { LIST_LAZY_RESPONSE_DISABLED_ROUTES } from "../routes";
import { E2eListLazyResponseItemService } from "../service";

import { E2eListLazyCycleItemDto } from "./index";

class E2eListLazyCycleListDto {
	@ApiProperty({ type: () => [E2eListLazyCycleItemDto] })
	public items!: Array<unknown>;
}

@ApiController<E2eListLazyResponseItemEntity>({
	entity: E2eListLazyResponseItemEntity,
	name: "E2eListLazyCycle",
	path: "list-lazy-response/cycle",
	routes: { ...LIST_LAZY_RESPONSE_DISABLED_ROUTES, [EApiRouteType.GET_LIST]: { dto: { [EApiDtoType.RESPONSE]: E2eListLazyCycleListDto } } },
})
export class E2eListLazyCycleController {
	@Inject(E2eListLazyResponseItemService)
	public readonly service!: E2eListLazyResponseItemService;
}

@ApiController<E2eListLazyResponseItemEntity>({
	entity: E2eListLazyResponseItemEntity,
	name: "E2eListLazyCycleTyped",
	path: "list-lazy-response/cycle-typed",
	routes: { ...LIST_LAZY_RESPONSE_DISABLED_ROUTES, [EApiRouteType.GET_LIST]: { dto: { [EApiDtoType.RESPONSE]: E2eListLazyCycleListDto }, request: { [EApiControllerRequestTarget.QUERY]: { filter: { fields: {}, unlistedFields: EApiControllerGetListQueryUnlistedFields.INHERIT }, order: { fields: {}, unlistedFields: EApiControllerGetListQueryUnlistedFields.INHERIT } } } } },
})
export class E2eListLazyCycleTypedController {
	@Inject(E2eListLazyResponseItemService)
	public readonly service!: E2eListLazyResponseItemService;
}
