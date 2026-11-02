import { Controller, HttpStatus, Inject, Query, RequestMethod } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";

import { ApiController, ApiRouteCustom, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiDtoType, EApiRouteType } from "../../../src/index";

import { E2eListLazyResponseItemEntity } from "./item.entity";
import { LIST_LAZY_RESPONSE_DISABLED_ROUTES } from "./routes";
import { E2eListLazyResponseItemService } from "./service";

class E2eListLazySameFileListDto {
	@ApiProperty({ type: () => [E2eListLazySameFileItemDto] })
	public items!: Array<unknown>;
}

class E2eListLazySameFileEmptyListDto {
	@ApiProperty({ type: () => [E2eListLazySameFileEmptyItemDto] })
	public items!: Array<unknown>;
}

class E2eListLazySameFileNestedItemDto {
	@ApiProperty({ type: String })
	public label!: string;

	@ApiProperty({ type: () => E2eListLazySameFileItemDto })
	public nested!: unknown;
}

@ApiController<E2eListLazyResponseItemEntity>({
	entity: E2eListLazyResponseItemEntity,
	name: "E2eListLazySameFile",
	path: "list-lazy-response/same-file",
	routes: { ...LIST_LAZY_RESPONSE_DISABLED_ROUTES, [EApiRouteType.GET_LIST]: { dto: { [EApiDtoType.RESPONSE]: E2eListLazySameFileListDto } } },
})
export class E2eListLazySameFileController {
	@Inject(E2eListLazyResponseItemService)
	public readonly service!: E2eListLazyResponseItemService;
}

@ApiController<E2eListLazyResponseItemEntity>({
	entity: E2eListLazyResponseItemEntity,
	name: "E2eListLazySameFileTyped",
	path: "list-lazy-response/same-file-typed",
	routes: { ...LIST_LAZY_RESPONSE_DISABLED_ROUTES, [EApiRouteType.GET_LIST]: { dto: { [EApiDtoType.RESPONSE]: E2eListLazySameFileListDto }, request: { [EApiControllerRequestTarget.QUERY]: { filter: { fields: { id: { isEnabled: false } }, unlistedFields: EApiControllerGetListQueryUnlistedFields.INHERIT }, order: { fields: {}, unlistedFields: EApiControllerGetListQueryUnlistedFields.INHERIT } } } } },
})
export class E2eListLazySameFileTypedController {
	@Inject(E2eListLazyResponseItemService)
	public readonly service!: E2eListLazyResponseItemService;
}

@ApiController<E2eListLazyResponseItemEntity>({
	entity: E2eListLazyResponseItemEntity,
	name: "E2eListLazySameFileItemConfig",
	path: "list-lazy-response/same-file-item-config",
	routes: { ...LIST_LAZY_RESPONSE_DISABLED_ROUTES, [EApiRouteType.GET_LIST]: { dto: { [EApiDtoType.RESPONSE]: { itemType: E2eListLazySameFileNestedItemDto } } } },
})
export class E2eListLazySameFileItemConfigController {
	@Inject(E2eListLazyResponseItemService)
	public readonly service!: E2eListLazyResponseItemService;
}

@ApiController<E2eListLazyResponseItemEntity>({
	entity: E2eListLazyResponseItemEntity,
	name: "E2eListLazySameFileEmpty",
	path: "list-lazy-response/same-file-empty",
	routes: { ...LIST_LAZY_RESPONSE_DISABLED_ROUTES, [EApiRouteType.GET_LIST]: { dto: { [EApiDtoType.RESPONSE]: E2eListLazySameFileEmptyListDto }, request: { [EApiControllerRequestTarget.QUERY]: { filter: { fields: {}, unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT } } } } },
})
export class E2eListLazySameFileEmptyController {
	@Inject(E2eListLazyResponseItemService)
	public readonly service!: E2eListLazyResponseItemService;
}

@Controller("list-lazy-response/same-file-custom")
export class E2eListLazySameFileCustomController {
	@ApiRouteCustom<E2eListLazyResponseItemEntity>({ autoDto: { [EApiDtoType.QUERY]: {} }, resource: { action: "list-lazy-response.same-file-custom", entity: E2eListLazyResponseItemEntity }, response: { status: HttpStatus.OK, type: E2eListLazySameFileListDto }, route: { method: RequestMethod.GET, path: "", type: EApiRouteType.GET_LIST } })
	public list(@Query() _query: unknown): { items: Array<unknown> } {
		return { items: [] };
	}
}

class E2eListLazySameFileItemDto {
	@ApiProperty({ type: String })
	public label!: string;
}

class E2eListLazySameFileEmptyItemDto {
	@ApiProperty({ type: String })
	public unrelated!: string;
}
