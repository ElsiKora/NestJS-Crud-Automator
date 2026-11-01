import { Inject } from "@nestjs/common";

import { ApiController, EApiControllerRelationReferenceShape, EApiRouteType } from "../../../src/index";

import { E2eToManyPostEntity } from "./entity";
import { E2eToManyPostService } from "./service";

const DISABLED_ROUTES = {
	[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
	[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
	[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
	[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
} as const;

const RELATIONS_INCLUDE = { author: true, comments: true, reviews: true, tags: true } as const;

@ApiController<E2eToManyPostEntity>({
	entity: E2eToManyPostEntity,
	name: "E2eToManyObjectPosts",
	path: "to-many-object-posts",
	routes: {
		...DISABLED_ROUTES,
		[EApiRouteType.CREATE]: {},
		[EApiRouteType.GET]: {
			relations: { response: { load: { include: RELATIONS_INCLUDE }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.OBJECT } } },
		},
		[EApiRouteType.GET_LIST]: {
			relations: { response: { load: { include: RELATIONS_INCLUDE }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.OBJECT } } },
		},
	},
})
export class E2eToManyObjectPostController {
	public constructor(@Inject(E2eToManyPostService) public readonly service: E2eToManyPostService) {}
}

@ApiController<E2eToManyPostEntity>({
	entity: E2eToManyPostEntity,
	name: "E2eToManyScalarPosts",
	path: "to-many-scalar-posts",
	routes: {
		...DISABLED_ROUTES,
		[EApiRouteType.GET]: {
			relations: { response: { load: { include: RELATIONS_INCLUDE }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.SCALAR } } },
		},
		[EApiRouteType.GET_LIST]: {
			relations: { response: { load: { include: RELATIONS_INCLUDE }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.SCALAR } } },
		},
	},
})
export class E2eToManyScalarPostController {
	public constructor(@Inject(E2eToManyPostService) public readonly service: E2eToManyPostService) {}
}
