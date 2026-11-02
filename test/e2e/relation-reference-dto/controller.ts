import { Inject } from "@nestjs/common";

import { ApiController, EApiControllerRelationReferenceShape, EApiRouteType } from "../../../src/index";

import { E2eRelationReferenceObjectCodePostEntity, E2eRelationReferenceScalarCodePostEntity, E2eRelationReferenceScalarIdPostEntity } from "./entity";
import { E2eRelationReferenceObjectCodePostService, E2eRelationReferenceScalarCodePostService, E2eRelationReferenceScalarIdPostService } from "./service";

const DISABLED = { generation: { isEnabled: false } } as const;

/**
 * Builds GET and GET_LIST routes that load author, editor and tags and project them into one reference shape.
 * The eager reviewer relation is left out of the include, so it is never projected.
 * @param {EApiControllerRelationReferenceShape} shape - Response reference shape.
 * @param {string} key - Response reference key.
 * @returns {object} Controller routes.
 */
const buildRoutes = (shape: EApiControllerRelationReferenceShape, key: string): object => {
	const relations: object = { response: { load: { include: { author: true, editor: true, tags: true } }, reference: { key, shape } } };

	return {
		[EApiRouteType.CREATE]: DISABLED,
		[EApiRouteType.DELETE]: DISABLED,
		[EApiRouteType.GET]: { relations },
		[EApiRouteType.GET_LIST]: { relations },
		[EApiRouteType.PARTIAL_UPDATE]: DISABLED,
		[EApiRouteType.UPDATE]: DISABLED,
	};
};

@ApiController<E2eRelationReferenceScalarIdPostEntity>({
	entity: E2eRelationReferenceScalarIdPostEntity,
	name: "E2eRelationReferenceScalarIdPosts",
	path: "relation-reference-scalar-id-posts",
	routes: buildRoutes(EApiControllerRelationReferenceShape.SCALAR, "id"),
} as never)
export class E2eRelationReferenceScalarIdPostController {
	public constructor(@Inject(E2eRelationReferenceScalarIdPostService) public readonly service: E2eRelationReferenceScalarIdPostService) {}
}

@ApiController<E2eRelationReferenceScalarCodePostEntity>({
	entity: E2eRelationReferenceScalarCodePostEntity,
	name: "E2eRelationReferenceScalarCodePosts",
	path: "relation-reference-scalar-code-posts",
	routes: buildRoutes(EApiControllerRelationReferenceShape.SCALAR, "code"),
} as never)
export class E2eRelationReferenceScalarCodePostController {
	public constructor(@Inject(E2eRelationReferenceScalarCodePostService) public readonly service: E2eRelationReferenceScalarCodePostService) {}
}

@ApiController<E2eRelationReferenceObjectCodePostEntity>({
	entity: E2eRelationReferenceObjectCodePostEntity,
	name: "E2eRelationReferenceObjectCodePosts",
	path: "relation-reference-object-code-posts",
	routes: buildRoutes(EApiControllerRelationReferenceShape.OBJECT, "code"),
} as never)
export class E2eRelationReferenceObjectCodePostController {
	public constructor(@Inject(E2eRelationReferenceObjectCodePostService) public readonly service: E2eRelationReferenceObjectCodePostService) {}
}
