import type { Type } from "@nestjs/common";

import { Inject } from "@nestjs/common";

import { ApiController, ApiControllerObservable, ApiControllerSecurable, EApiAuthenticationType, EApiAuthorizationMode, EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRelationReferenceShape, EApiControllerRequestTarget, EApiRouteType, EFilterOrderDirection } from "../../../src/index";

import { E2eEagerAuthGuard } from "./auth-guard";
import { E2eEagerPostEntity } from "./entity";
import { E2eEagerAuthorService, E2eEagerCommentService, E2eEagerPostService, E2eEagerTagService } from "./service";

export type TE2eEagerVariant = "include" | "none" | "object" | "scalar";

export const E2E_EAGER_VARIANTS: ReadonlyArray<TE2eEagerVariant> = ["none", "object", "scalar", "include"];

const ALL_RELATIONS = { author: true, comments: true, tags: true } as const;
const DISABLED_ROUTE = { generation: { isEnabled: false } } as const;
const SECURITY = { authentication: { guard: E2eEagerAuthGuard, type: EApiAuthenticationType.USER } } as const;

/**
 * Builds the route relations of a variant.
 * @param {TE2eEagerVariant} variant - Relation configuration variant.
 * @returns {object | undefined} Route relations, or none for the variant without relations.
 */
function buildRelations(variant: TE2eEagerVariant): object | undefined {
	switch (variant) {
		case "include": {
			return {
				request: { load: { include: { author: true, tags: true } }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.SCALAR } },
				response: { load: { include: { comments: true } }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.OBJECT } },
			};
		}

		case "none": {
			return undefined;
		}

		case "object": {
			return { response: { load: { include: ALL_RELATIONS }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.OBJECT } } };
		}

		case "scalar": {
			return { response: { load: { include: ALL_RELATIONS }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.SCALAR } } };
		}
	}
}

/**
 * Creates a controller class with injected post, author, comment and tag services.
 * @param {string} name - Controller class name.
 * @param {object} options - Controller options.
 * @param {boolean} isScoped - Whether the controller runs under HOOKS authorization.
 * @returns {Type<unknown>} Decorated controller class.
 */
function createController(name: string, options: object, isScoped: boolean): Type<unknown> {
	const controller: Type<{ service: E2eEagerPostService }> = {
		[name]: class {
			public readonly service!: E2eEagerPostService;
		},
	}[name] as Type<{ service: E2eEagerPostService }>;

	Inject(E2eEagerPostService)(controller.prototype as object, "service");
	Inject(E2eEagerAuthorService)(controller.prototype as object, "authorService");
	Inject(E2eEagerCommentService)(controller.prototype as object, "commentsService");
	Inject(E2eEagerTagService)(controller.prototype as object, "tagsService");
	ApiController<E2eEagerPostEntity>({ ...(isScoped && { authorization: { defaultMode: EApiAuthorizationMode.HOOKS } }), ...options } as never)(controller);

	if (isScoped) {
		ApiControllerSecurable()(controller);
		ApiControllerObservable()(controller);
	}

	return controller;
}

/**
 * Creates the controllers of one variant: GET, PAGE GET_LIST, CREATE, UPDATE and PARTIAL_UPDATE on one path and CURSOR GET_LIST on another.
 * @param {TE2eEagerVariant} variant - Relation configuration variant.
 * @param {boolean} isScoped - Whether the routes run under HOOKS authorization with an owner scope.
 * @returns {[Type<unknown>, Type<unknown>]} Main and CURSOR controller classes; CURSOR GET_LIST requires PostgreSQL.
 */
function createVariantControllers(variant: TE2eEagerVariant, isScoped: boolean): [Type<unknown>, Type<unknown>] {
	const relations: object | undefined = buildRelations(variant);
	const prefix: string = isScoped ? "scoped-" : "";
	const route: object = { ...(relations && { relations }), ...(isScoped && { security: SECURITY }) };
	const suffix: string = `${isScoped ? "Scoped" : ""}${variant.charAt(0).toUpperCase()}${variant.slice(1)}`;

	return [
		createController(
			`E2eEager${suffix}Controller`,
			{
				entity: E2eEagerPostEntity,
				name: `E2eEager${suffix}`,
				path: `eager/${prefix}${variant}`,
				routes: {
					[EApiRouteType.CREATE]: route,
					[EApiRouteType.DELETE]: DISABLED_ROUTE,
					[EApiRouteType.GET]: route,
					[EApiRouteType.GET_LIST]: route,
					[EApiRouteType.PARTIAL_UPDATE]: route,
					[EApiRouteType.UPDATE]: route,
				},
			},
			isScoped,
		),
		createController(
			`E2eEager${suffix}CursorController`,
			{
				entity: E2eEagerPostEntity,
				name: `E2eEager${suffix}Cursor`,
				path: `eager/${prefix}${variant}-cursor`,
				routes: {
					[EApiRouteType.CREATE]: DISABLED_ROUTE,
					[EApiRouteType.DELETE]: DISABLED_ROUTE,
					[EApiRouteType.GET]: DISABLED_ROUTE,
					[EApiRouteType.GET_LIST]: {
						...route,
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
					[EApiRouteType.PARTIAL_UPDATE]: DISABLED_ROUTE,
					[EApiRouteType.UPDATE]: DISABLED_ROUTE,
				},
			},
			isScoped,
		),
	];
}

const VARIANT_CONTROLLERS: Array<[Type<unknown>, Type<unknown>]> = [false, true].flatMap((isScoped: boolean): Array<[Type<unknown>, Type<unknown>]> => E2E_EAGER_VARIANTS.map((variant: TE2eEagerVariant): [Type<unknown>, Type<unknown>] => createVariantControllers(variant, isScoped)));

export const E2E_EAGER_CONTROLLERS: Array<Type<unknown>> = VARIANT_CONTROLLERS.map(([controller]: [Type<unknown>, Type<unknown>]): Type<unknown> => controller);

export const E2E_EAGER_CURSOR_CONTROLLERS: Array<Type<unknown>> = VARIANT_CONTROLLERS.map(([, cursorController]: [Type<unknown>, Type<unknown>]): Type<unknown> => cursorController);
