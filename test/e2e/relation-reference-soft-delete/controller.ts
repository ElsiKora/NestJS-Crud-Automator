import type { Type } from "@nestjs/common";

import { Inject } from "@nestjs/common";

import { ApiController, EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRelationReferenceShape, EApiControllerRequestTarget, EApiRouteType, EFilterOrderDirection } from "../../../src/index";

import { E2eRelationSoftPostEntity } from "./entity";
import { E2eRelationSoftPostService } from "./service";

const DISABLED = { generation: { isEnabled: false } } as const;

export interface IE2eRelationSoftCase {
	key: string;
	path: string;
	shape: EApiControllerRelationReferenceShape;
}

export const E2E_RELATION_SOFT_CASES: ReadonlyArray<IE2eRelationSoftCase> = [
	{ key: "id", path: "relation-soft-object-id-posts", shape: EApiControllerRelationReferenceShape.OBJECT },
	{ key: "code", path: "relation-soft-object-code-posts", shape: EApiControllerRelationReferenceShape.OBJECT },
	{ key: "id", path: "relation-soft-scalar-id-posts", shape: EApiControllerRelationReferenceShape.SCALAR },
	{ key: "code", path: "relation-soft-scalar-code-posts", shape: EApiControllerRelationReferenceShape.SCALAR },
];

export const E2E_RELATION_SOFT_CURSOR_PATH: string = "relation-soft-cursor-posts";

/**
 * Creates a controller class with the given name over the soft-delete fixture.
 * @param {string} name - Class name.
 * @param {string} path - Route path.
 * @param {object} routes - Controller routes.
 * @returns {Type<unknown>} Controller class.
 */
function createController(name: string, path: string, routes: object): Type<unknown> {
	const controller: Type<{ service: E2eRelationSoftPostService }> = {
		[name]: class {
			public readonly service!: E2eRelationSoftPostService;
		},
	}[name] as Type<{ service: E2eRelationSoftPostService }>;

	Inject(E2eRelationSoftPostService)(controller.prototype as object, "service");
	ApiController<E2eRelationSoftPostEntity>({ entity: E2eRelationSoftPostEntity, name, path, routes } as never)(controller);

	return controller;
}

export const E2E_RELATION_SOFT_CONTROLLERS: ReadonlyArray<Type<unknown>> = E2E_RELATION_SOFT_CASES.map(({ key, path, shape }: IE2eRelationSoftCase): Type<unknown> => {
	const relations: object = { response: { load: { include: { target: true } }, reference: { key, shape } } };

	return createController(`E2eRelationSoft${shape}${key}Controller`, path, {
		[EApiRouteType.CREATE]: DISABLED,
		[EApiRouteType.DELETE]: DISABLED,
		[EApiRouteType.GET]: { relations },
		[EApiRouteType.GET_LIST]: { relations },
		[EApiRouteType.PARTIAL_UPDATE]: DISABLED,
		[EApiRouteType.UPDATE]: DISABLED,
	});
});

export const E2E_RELATION_SOFT_CURSOR_CONTROLLER: Type<unknown> = createController("E2eRelationSoftCursorController", E2E_RELATION_SOFT_CURSOR_PATH, {
	[EApiRouteType.CREATE]: DISABLED,
	[EApiRouteType.DELETE]: DISABLED,
	[EApiRouteType.GET]: DISABLED,
	[EApiRouteType.GET_LIST]: {
		relations: { response: { load: { include: { target: true } }, reference: { key: "code", shape: EApiControllerRelationReferenceShape.OBJECT } } },
		request: {
			[EApiControllerRequestTarget.QUERY]: {
				order: {
					defaultOrder: [{ direction: EFilterOrderDirection.ASC, field: "rank" }],
					fields: { rank: { isEnabled: true } },
					tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }],
					unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
				},
				pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR },
			},
		},
	},
	[EApiRouteType.PARTIAL_UPDATE]: DISABLED,
	[EApiRouteType.UPDATE]: DISABLED,
});
