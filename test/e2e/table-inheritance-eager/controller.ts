import type { Type } from "@nestjs/common";

import { Inject } from "@nestjs/common";

import { ApiController, ApiControllerObservable, ApiControllerSecurable, EApiAuthenticationType, EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRelationReferenceShape, EApiControllerRequestTarget, EApiRouteType, EFilterOrderDirection } from "../../../src/index";
import { TestAuthGuard } from "../app/auth-guard";
import { integrationDetailAuthorization } from "../table-inheritance-integration/iam";
import { IntegrationDetailEntity } from "../table-inheritance-integration/root.entity";
import { IntegrationDetailService } from "../table-inheritance-integration/service";

import "../table-inheritance-integration/card.entity";
import "../table-inheritance-integration/form.entity";

export type TStiEagerVariant = "include" | "none" | "object" | "scalar";

export const STI_EAGER_VARIANTS: ReadonlyArray<TStiEagerVariant> = ["none", "object", "scalar", "include"];

const ALL_RELATIONS = { issuer: true, network: true, notes: true, tags: true, vendor: true } as const;
const DISABLED_ROUTE = { generation: { isEnabled: false } } as const;
const SECURITY = { authentication: { guard: TestAuthGuard, type: EApiAuthenticationType.USER } } as const;
const ORDER = {
	[EApiControllerRequestTarget.QUERY]: {
		order: {
			defaultOrder: [{ direction: EFilterOrderDirection.ASC, field: "rank" }],
			fields: { rank: { isEnabled: true } },
			tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }],
			unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
		},
	},
} as const;

/**
 * Builds the response relations of a variant.
 * @param {TStiEagerVariant} variant - Relation configuration variant.
 * @returns {object | undefined} Route relations, or none for the variant without relations.
 */
function buildRelations(variant: TStiEagerVariant): object | undefined {
	switch (variant) {
		case "include": {
			return { response: { load: { include: { issuer: true } }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.OBJECT } } };
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
 * Creates a decorated controller class over the table inheritance root.
 * @param {string} name - Controller class name.
 * @param {object} options - Controller options.
 * @param {boolean} isScoped - Whether the controller runs under the IAM scope.
 * @returns {Type<unknown>} Decorated controller class.
 */
function createController(name: string, options: object, isScoped: boolean): Type<unknown> {
	const controller: Type<{ service: IntegrationDetailService }> = {
		[name]: class {
			public readonly service!: IntegrationDetailService;
		},
	}[name] as Type<{ service: IntegrationDetailService }>;

	Inject(IntegrationDetailService)(controller.prototype as object, "service");
	// Register the class ApiController returns: it carries the bootstrap checks.
	const decorated: Type<{ service: IntegrationDetailService }> = ApiController<IntegrationDetailEntity>({ ...(isScoped && { authorization: integrationDetailAuthorization }), ...options } as never)(controller) as Type<{ service: IntegrationDetailService }>;

	if (isScoped) {
		ApiControllerSecurable()(decorated);
		ApiControllerObservable()(decorated);
	}

	return decorated;
}

/**
 * Creates the controllers of one variant: GET, PAGE GET_LIST and the writes on one path, CURSOR GET_LIST on another.
 * Writes stay on the unscoped controller, because the IAM policy of the fixture grants reads only.
 * @param {TStiEagerVariant} variant - Relation configuration variant.
 * @param {boolean} isScoped - Whether the routes run under the IAM scope.
 * @returns {Array<Type<unknown>>} Controller classes.
 */
function createVariantControllers(variant: TStiEagerVariant, isScoped: boolean): Array<Type<unknown>> {
	const relations: object | undefined = buildRelations(variant);
	const prefix: string = isScoped ? "scoped-" : "";
	const route: object = { ...(relations && { relations }), ...(isScoped && { security: SECURITY }) };
	const writeRoute: object = isScoped ? DISABLED_ROUTE : route;
	const suffix: string = `${isScoped ? "Scoped" : ""}${variant.charAt(0).toUpperCase()}${variant.slice(1)}`;

	return [
		createController(
			`StiEager${suffix}Controller`,
			{
				entity: IntegrationDetailEntity,
				name: `StiEager${suffix}`,
				path: `sti-eager/${prefix}${variant}`,
				routes: {
					[EApiRouteType.CREATE]: writeRoute,
					[EApiRouteType.DELETE]: DISABLED_ROUTE,
					[EApiRouteType.GET]: route,
					[EApiRouteType.GET_LIST]: { ...route, request: { [EApiControllerRequestTarget.QUERY]: { ...ORDER[EApiControllerRequestTarget.QUERY], pagination: { mode: EApiControllerGetListQueryPaginationMode.PAGE } } } },
					[EApiRouteType.PARTIAL_UPDATE]: writeRoute,
					[EApiRouteType.UPDATE]: writeRoute,
				},
			},
			isScoped,
		),
		createController(
			`StiEager${suffix}CursorController`,
			{
				entity: IntegrationDetailEntity,
				name: `StiEager${suffix}Cursor`,
				path: `sti-eager/${prefix}${variant}-cursor`,
				routes: {
					[EApiRouteType.CREATE]: DISABLED_ROUTE,
					[EApiRouteType.DELETE]: DISABLED_ROUTE,
					[EApiRouteType.GET]: DISABLED_ROUTE,
					[EApiRouteType.GET_LIST]: { ...route, request: { [EApiControllerRequestTarget.QUERY]: { ...ORDER[EApiControllerRequestTarget.QUERY], pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR } } } },
					[EApiRouteType.PARTIAL_UPDATE]: DISABLED_ROUTE,
					[EApiRouteType.UPDATE]: DISABLED_ROUTE,
				},
			},
			isScoped,
		),
	];
}

export const STI_EAGER_CONTROLLERS: Array<Type<unknown>> = [false, true].flatMap((isScoped: boolean): Array<Type<unknown>> => STI_EAGER_VARIANTS.flatMap((variant: TStiEagerVariant): Array<Type<unknown>> => createVariantControllers(variant, isScoped)));
