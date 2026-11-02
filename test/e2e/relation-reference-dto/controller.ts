import type { Type } from "@nestjs/common";

import { Inject } from "@nestjs/common";

import { ApiController, EApiControllerRelationReferenceShape, EApiRouteType } from "../../../src/index";

import { E2eRelationReferenceIntegerPostEntity, E2eRelationReferenceObjectCodePostEntity, E2eRelationReferenceScalarCodePostEntity, E2eRelationReferenceScalarIdPostEntity } from "./entity";
import { E2eRelationReferenceIntegerPostService, E2eRelationReferenceObjectCodePostService, E2eRelationReferenceScalarCodePostService, E2eRelationReferenceScalarIdPostService } from "./service";

const DISABLED = { generation: { isEnabled: false } } as const;

/**
 * Builds read and write routes that load author, editor and tags and project them into one reference shape.
 * The eager reviewer and the lazy reader are left out of the include, so they are never projected.
 * @param {EApiControllerRelationReferenceShape} shape - Response reference shape.
 * @param {string} key - Response reference key.
 * @returns {object} Controller routes.
 */
const buildRoutes = (shape: EApiControllerRelationReferenceShape, key: string): object => {
	const relations: object = { response: { load: { include: { author: true, editor: true, tags: true } }, reference: { key, shape } } };

	return {
		[EApiRouteType.CREATE]: { relations },
		[EApiRouteType.DELETE]: DISABLED,
		[EApiRouteType.GET]: { relations },
		[EApiRouteType.GET_LIST]: { relations },
		[EApiRouteType.PARTIAL_UPDATE]: { relations },
		[EApiRouteType.UPDATE]: { relations },
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

/**
 * Builds GET and GET_LIST routes for a controller that shares its entity with another controller.
 * @param {object} include - Relations the routes load.
 * @param {EApiControllerRelationReferenceShape} shape - Response reference shape.
 * @param {string} key - Response reference key.
 * @returns {object} Controller routes.
 */
const buildReadRoutes = (include: object, shape: EApiControllerRelationReferenceShape, key: string): object => {
	const relations: object = { response: { load: { include }, reference: { key, shape } } };

	return {
		[EApiRouteType.CREATE]: DISABLED,
		[EApiRouteType.DELETE]: DISABLED,
		[EApiRouteType.GET]: { relations },
		[EApiRouteType.GET_LIST]: { relations },
		[EApiRouteType.PARTIAL_UPDATE]: DISABLED,
		[EApiRouteType.UPDATE]: DISABLED,
	};
};

@ApiController<E2eRelationReferenceObjectCodePostEntity>({
	entity: E2eRelationReferenceObjectCodePostEntity,
	name: "E2eRelationReferenceTwoObjectPosts",
	path: "relation-reference-two-object-posts",
	routes: buildReadRoutes({ author: true }, EApiControllerRelationReferenceShape.OBJECT, "code"),
} as never)
export class E2eRelationReferenceTwoObjectController {
	public constructor(@Inject(E2eRelationReferenceObjectCodePostService) public readonly service: E2eRelationReferenceObjectCodePostService) {}
}

@ApiController<E2eRelationReferenceObjectCodePostEntity>({
	entity: E2eRelationReferenceObjectCodePostEntity,
	name: "E2eRelationReferenceTwoScalarPosts",
	path: "relation-reference-two-scalar-posts",
	routes: buildReadRoutes({ editor: true, tags: true }, EApiControllerRelationReferenceShape.SCALAR, "id"),
} as never)
export class E2eRelationReferenceTwoScalarController {
	public constructor(@Inject(E2eRelationReferenceObjectCodePostService) public readonly service: E2eRelationReferenceObjectCodePostService) {}
}

@ApiController<E2eRelationReferenceIntegerPostEntity>({
	entity: E2eRelationReferenceIntegerPostEntity,
	name: "E2eRelationReferenceIntegerObjectPosts",
	path: "relation-reference-integer-object-posts",
	routes: buildReadRoutes({ target: true, targets: true }, EApiControllerRelationReferenceShape.OBJECT, "id"),
} as never)
export class E2eRelationReferenceIntegerObjectController {
	public constructor(@Inject(E2eRelationReferenceIntegerPostService) public readonly service: E2eRelationReferenceIntegerPostService) {}
}

@ApiController<E2eRelationReferenceIntegerPostEntity>({
	entity: E2eRelationReferenceIntegerPostEntity,
	name: "E2eRelationReferenceIntegerScalarPosts",
	path: "relation-reference-integer-scalar-posts",
	routes: buildReadRoutes({ target: true, targets: true }, EApiControllerRelationReferenceShape.SCALAR, "id"),
} as never)
export class E2eRelationReferenceIntegerScalarController {
	public constructor(@Inject(E2eRelationReferenceIntegerPostService) public readonly service: E2eRelationReferenceIntegerPostService) {}
}

/**
 * Creates a controller class with one fixed name, for applications in one process that configure it differently.
 * @param {object} include - Relations the routes load.
 * @returns {Type<unknown>} Controller class named E2eRelationReferenceTwinController.
 */
export const createE2eRelationReferenceTwinController = (include: object): Type<unknown> => {
	@ApiController<E2eRelationReferenceObjectCodePostEntity>({
		entity: E2eRelationReferenceObjectCodePostEntity,
		name: "E2eRelationReferenceTwinPosts",
		path: "relation-reference-twin-posts",
		routes: buildReadRoutes(include, EApiControllerRelationReferenceShape.SCALAR, "code"),
	} as never)
	class E2eRelationReferenceTwinController {
		public constructor(@Inject(E2eRelationReferenceObjectCodePostService) public readonly service: E2eRelationReferenceObjectCodePostService) {}
	}

	return E2eRelationReferenceTwinController;
};
