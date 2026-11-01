import { Body, HttpStatus, Inject, Param, RequestMethod } from "@nestjs/common";

import { ApiController, ApiRouteCustom, EApiRouteType } from "../../../../src/index";
import { E2eHydrationPostEntity } from "../../to-many-relation-request/entity";
import { E2eHydrationPostService } from "../../to-many-relation-request/service";

const NO_GENERATED_ROUTES = {
	[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
	[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
	[EApiRouteType.GET]: { generation: { isEnabled: false } },
	[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
	[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
	[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
} as const;

export class E2eDtoNameRenamePostBase {
	@Inject(E2eHydrationPostService)
	public readonly service!: E2eHydrationPostService;

	@ApiRouteCustom<E2eHydrationPostEntity>({
		resource: { action: "custom.rename-post", entity: E2eHydrationPostEntity },
		response: { status: HttpStatus.OK, type: undefined },
		route: { method: RequestMethod.PATCH, path: "rename/:id", type: EApiRouteType.PARTIAL_UPDATE },
	} as never)
	public async rename(@Param("id") id: string, @Body() body: Record<string, unknown>): Promise<unknown> {
		await this.service.update({ id }, body as never);

		return { id };
	}
}

@ApiController<E2eHydrationPostEntity>({ entity: E2eHydrationPostEntity, path: "rename-a/dto-name-posts", routes: NO_GENERATED_ROUTES } as never)
export class E2eDtoNameRenamePostAController extends E2eDtoNameRenamePostBase {}

@ApiController<E2eHydrationPostEntity>({ entity: E2eHydrationPostEntity, path: "rename-b/dto-name-posts", routes: NO_GENERATED_ROUTES } as never)
export class E2eDtoNameRenamePostBController extends E2eDtoNameRenamePostBase {}
