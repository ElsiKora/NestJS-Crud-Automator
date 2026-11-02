import { Inject } from "@nestjs/common";

import { ApiController, EApiControllerRelationReferenceShape, EApiRouteType } from "../../../src/index";

import { E2eRelationWriteCompositeEntity, E2eRelationWritePostEntity } from "./entity";
import { E2eRelationWriteCompositeService, E2eRelationWritePostService } from "./service";

const DISABLED = { generation: { isEnabled: false } } as const;

/**
 * Builds the read and update routes of a controller with one relation config.
 * @param {object} [relations] - Relation config of every route.
 * @returns {object} Controller routes.
 */
const buildRoutes = (relations?: object): object => ({
	[EApiRouteType.CREATE]: DISABLED,
	[EApiRouteType.DELETE]: DISABLED,
	[EApiRouteType.GET]: { relations },
	[EApiRouteType.GET_LIST]: DISABLED,
	[EApiRouteType.PARTIAL_UPDATE]: { relations },
	[EApiRouteType.UPDATE]: { relations },
});

@ApiController<E2eRelationWritePostEntity>({
	entity: E2eRelationWritePostEntity,
	name: "E2eRelationWriteDefaultPosts",
	path: "relation-write-default-posts",
	routes: buildRoutes(),
} as never)
export class E2eRelationWriteDefaultController {
	public constructor(@Inject(E2eRelationWritePostService) public readonly service: E2eRelationWritePostService) {}
}

@ApiController<E2eRelationWritePostEntity>({
	entity: E2eRelationWritePostEntity,
	name: "E2eRelationWriteIncludePosts",
	path: "relation-write-include-posts",
	routes: buildRoutes({ response: { load: { include: { author: true, tags: true } }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.OBJECT } } }),
} as never)
export class E2eRelationWriteIncludeController {
	public constructor(@Inject(E2eRelationWritePostService) public readonly service: E2eRelationWritePostService) {}
}

@ApiController<E2eRelationWriteCompositeEntity>({
	entity: E2eRelationWriteCompositeEntity,
	name: "E2eRelationWriteCompositeRows",
	path: "relation-write-composite-rows",
	routes: buildRoutes(),
} as never)
export class E2eRelationWriteCompositeController {
	public constructor(@Inject(E2eRelationWriteCompositeService) public readonly service: E2eRelationWriteCompositeService) {}
}
