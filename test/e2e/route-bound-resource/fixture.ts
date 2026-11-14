import "reflect-metadata";

import type { IApiAuthorizationDecision } from "../../../src/index";

import { Body, HttpStatus, Inject, Injectable, Param, RequestMethod } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { InjectRepository } from "@nestjs/typeorm";
import { Column, Entity, PrimaryColumn, Repository } from "typeorm";

import { ApiAuthorizationDecision, ApiController, ApiControllerSecurable, ApiPropertyString, ApiPropertyUUID, ApiRouteCustom, ApiService, ApiServiceBase, EApiAuthenticationType, EApiAuthorizationMode, EApiDtoType, EApiPolicyEffect, EApiPropertyStringType, EApiRouteType } from "../../../src/index";

// The IAM namespace and resource type of the settings, which are rows of no entity of the application.
export const E2E_ROUTE_BOUND_NAMESPACE: string = "rb:config-data";

// Two settings: the one the policies name, and another.
export const E2E_ROUTE_BOUND_NAMED_ID: string = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const E2E_ROUTE_BOUND_OTHER_ID: string = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

// The settings, kept outside the database as a package keeps its own rows.
export const E2E_ROUTE_BOUND_SETTINGS: ReadonlyArray<{ id: string; section: string; value: string }> = [
	{ id: E2E_ROUTE_BOUND_NAMED_ID, section: "withdrawal", value: "10" },
	{ id: E2E_ROUTE_BOUND_OTHER_ID, section: "delivery", value: "20" },
];

const allowAction: { Action: Array<string> } = { Action: [`${E2E_ROUTE_BOUND_NAMESPACE}:*`] };
const named: string = `${E2E_ROUTE_BOUND_NAMESPACE}/${E2E_ROUTE_BOUND_NAMED_ID}`;
const everyRow: string = `${E2E_ROUTE_BOUND_NAMESPACE}/*`;

// The IAM namespace and resource type of the settings addressed by a key, a string path value.
export const E2E_ROUTE_BOUND_KEY_NAMESPACE: string = "rb:config-key";

const keyAction: { Action: Array<string> } = { Action: [`${E2E_ROUTE_BOUND_KEY_NAMESPACE}:*`] };
const keyOf = (key: string): string => `${E2E_ROUTE_BOUND_KEY_NAMESPACE}/${key}`;

// The statements of each policy of the settings; the principal of a request is named after the policy it holds.
export const E2E_ROUTE_BOUND_POLICIES: Readonly<Record<string, ReadonlyArray<unknown>>> = {
	"allow-glob": [{ ...allowAction, Effect: EApiPolicyEffect.ALLOW, Resource: [`${E2E_ROUTE_BOUND_NAMESPACE}/aaaa*`] }],
	"allow-one": [{ ...allowAction, Effect: EApiPolicyEffect.ALLOW, Resource: [named] }],
	"allow-one-and-every-row": [
		{ ...allowAction, Effect: EApiPolicyEffect.ALLOW, Resource: [named] },
		{ ...allowAction, Effect: EApiPolicyEffect.ALLOW, Resource: [everyRow] },
	],
	"deny-one": [
		{ ...allowAction, Effect: EApiPolicyEffect.ALLOW, Resource: [everyRow] },
		{ ...allowAction, Effect: EApiPolicyEffect.DENY, Resource: [named] },
	],
	"deny-glob": [
		{ ...allowAction, Effect: EApiPolicyEffect.ALLOW, Resource: [everyRow] },
		{ ...allowAction, Effect: EApiPolicyEffect.DENY, Resource: [`${E2E_ROUTE_BOUND_NAMESPACE}/aaaa*`] },
	],
	"deny-not-resource": [
		{ ...allowAction, Effect: EApiPolicyEffect.ALLOW, Resource: [everyRow] },
		{ ...allowAction, Effect: EApiPolicyEffect.DENY, NotResource: [named] },
	],
	section: [{ ...allowAction, Condition: { StringEquals: { "resource.section.name": "withdrawal" } }, Effect: EApiPolicyEffect.ALLOW, Resource: [everyRow] }],
	wildcard: [{ ...allowAction, Effect: EApiPolicyEffect.ALLOW, Resource: [everyRow] }],
};

// The statements of each policy of the keyed settings.
export const E2E_ROUTE_BOUND_KEY_POLICIES: Readonly<Record<string, ReadonlyArray<unknown>>> = {
	"key-allow": [{ ...keyAction, Effect: EApiPolicyEffect.ALLOW, Resource: [keyOf("Secret")] }],
	"key-allow-glob": [{ ...keyAction, Effect: EApiPolicyEffect.ALLOW, Resource: [keyOf("Sec*")] }],
	"key-deny": [
		{ ...keyAction, Effect: EApiPolicyEffect.ALLOW, Resource: [keyOf("*")] },
		{ ...keyAction, Effect: EApiPolicyEffect.DENY, Resource: [keyOf("Secret")] },
	],
};

// The anchor of the controller: it maps the section condition and has no column for `{id}`.
@Entity("e2e_route_bound_anchors")
export class E2eRouteBoundAnchorEntity {
	@Column({ default: 1, type: "integer" })
	public revision!: number;

	@PrimaryColumn({ length: 64, type: "varchar" })
	public sectionName!: string;
}

@Injectable()
@ApiService({ entity: E2eRouteBoundAnchorEntity })
export class E2eRouteBoundAnchorService extends ApiServiceBase<E2eRouteBoundAnchorEntity> {
	@InjectRepository(E2eRouteBoundAnchorEntity)
	public readonly repository!: Repository<E2eRouteBoundAnchorEntity>;
}

/**
 * Authenticates a request as the principal named by its `x-policy` header.
 */
@Injectable()
export class E2eRouteBoundGuard {
	public canActivate(context: { switchToHttp: () => { getRequest: () => { headers: Record<string, unknown>; user?: unknown } } }): boolean {
		const request: { headers: Record<string, unknown>; user?: unknown } = context.switchToHttp().getRequest();
		request.user = { id: String(request.headers["x-policy"] ?? "anonymous"), roles: [] };

		return true;
	}
}

export class E2eRouteBoundParametersDto {
	@ApiPropertyUUID({ description: "setting id", entity: { name: "ConfigData" }, isRequired: true } as never)
	public id!: string;
}

// A key described as text: the policy compares it letter by letter, so the handler must read the setting by exactly that text.
export class E2eRouteBoundKeyParametersDto {
	@ApiPropertyString({ description: "setting key", entity: { name: "ConfigKey" }, exampleValue: "Secret", format: EApiPropertyStringType.STRING, isRequired: true, maxLength: 64, minLength: 1, pattern: "/^.+$/" } as never)
	public key!: string;
}

export class E2eRouteBoundBodyDto {
	@ApiPropertyString({ description: "setting value", entity: { name: "ConfigData" }, exampleValue: "10", format: EApiPropertyStringType.STRING, isRequired: true, maxLength: 64, minLength: 1, pattern: "/^.+$/" } as never)
	public value!: string;
}

export class E2eRouteBoundResponseDto {
	@ApiProperty()
	public ids!: Array<string>;
}

const authentication: never = { guard: E2eRouteBoundGuard, type: EApiAuthenticationType.USER } as never;
const NO_GENERATED_ROUTES: never = Object.fromEntries([EApiRouteType.CREATE, EApiRouteType.DELETE, EApiRouteType.GET, EApiRouteType.GET_LIST, EApiRouteType.PARTIAL_UPDATE, EApiRouteType.UPDATE].map((routeType: EApiRouteType) => [routeType, { generation: { isEnabled: false } }])) as never;

/**
 * Reads the sections a decision's scope allows, as a route of rows that are no entity applies it.
 * @param {IApiAuthorizationDecision<E2eRouteBoundAnchorEntity>} decision - IAM decision of the request.
 * @returns {Array<string> | null} The section names, or null for every section.
 */
function readSections(decision: IApiAuthorizationDecision<E2eRouteBoundAnchorEntity>): Array<string> | null {
	const where: unknown = decision.scope?.where;

	if (where === undefined) {
		return null;
	}

	return (Array.isArray(where) ? where : [where]).map((branch: unknown): string => String((branch as { sectionName: unknown }).sectionName));
}

/**
 * Lists the settings a decision allows, of the given ids.
 * @param {IApiAuthorizationDecision<E2eRouteBoundAnchorEntity>} decision - IAM decision of the request.
 * @param {ReadonlyArray<string>} [ids] - Ids to read, every setting when absent.
 * @returns {{ ids: Array<string> }} The allowed ids.
 */
function readAllowed(decision: IApiAuthorizationDecision<E2eRouteBoundAnchorEntity>, ids?: ReadonlyArray<string>): { ids: Array<string> } {
	const sections: Array<string> | null = readSections(decision);

	return { ids: E2E_ROUTE_BOUND_SETTINGS.filter((setting: { id: string; section: string }): boolean => (ids === undefined || ids.includes(setting.id)) && (sections === null || sections.includes(setting.section))).map((setting: { id: string }): string => setting.id) };
}

/**
 * Builds the settings controller over its anchor, with read, update and list routes it serves itself.
 * @param {object} options - Controller options.
 * @param {string} options.name - Controller class name.
 * @param {ReadonlyArray<string>} [options.routeParameters] - The routeParameters of its resource definition.
 * @param {string} [options.resourcePath] - Resource path, `<namespace>/{id}` by default.
 * @param {Array<{ isFilterable: boolean; path: string; queryPath: string }>} [options.fields] - Extra field mappings beside the section field.
 * @returns {new () => unknown} The controller.
 */
export function E2eRouteBoundBuildController(options: { fields?: Array<{ isFilterable: boolean; path: string; queryPath: string }>; name: string; resourcePath?: string; routeParameters?: ReadonlyArray<string> }): new () => unknown {
	class SettingController {
		@Inject(E2eRouteBoundAnchorService)
		public readonly service!: E2eRouteBoundAnchorService;

		@ApiRouteCustom({
			documentation: { description: "Lists the settings", summary: "Lists the settings" },
			resource: { action: "list", entity: E2eRouteBoundAnchorEntity },
			response: { errors: {}, serialization: { isEnabled: false }, status: HttpStatus.OK, type: E2eRouteBoundResponseDto },
			route: { method: RequestMethod.GET, path: "" },
			security: { authentication },
		} as never)
		public list(@ApiAuthorizationDecision() decision: IApiAuthorizationDecision<E2eRouteBoundAnchorEntity>): { ids: Array<string> } {
			return readAllowed(decision);
		}

		@ApiRouteCustom({
			documentation: { description: "Creates a setting", summary: "Creates a setting" },
			dto: { [EApiDtoType.BODY]: E2eRouteBoundBodyDto },
			resource: { action: "create", entity: E2eRouteBoundAnchorEntity },
			response: { errors: {}, serialization: { isEnabled: false }, status: HttpStatus.CREATED, type: E2eRouteBoundResponseDto },
			route: { method: RequestMethod.POST, path: "" },
			security: { authentication },
		} as never)
		public create(@Body() _body: E2eRouteBoundBodyDto, @ApiAuthorizationDecision() decision: IApiAuthorizationDecision<E2eRouteBoundAnchorEntity>): { ids: Array<string> } {
			return { ids: readSections(decision) ?? [] };
		}

		@ApiRouteCustom({
			documentation: { description: "Reads one setting", summary: "Reads one setting" },
			dto: { [EApiDtoType.PARAMETERS]: E2eRouteBoundParametersDto },
			resource: { action: "read", entity: E2eRouteBoundAnchorEntity },
			response: { errors: {}, serialization: { isEnabled: false }, status: HttpStatus.OK, type: E2eRouteBoundResponseDto },
			route: { method: RequestMethod.GET, path: ":id" },
			security: { authentication },
		} as never)
		public read(@Param() parameters: E2eRouteBoundParametersDto, @ApiAuthorizationDecision() decision: IApiAuthorizationDecision<E2eRouteBoundAnchorEntity>): { ids: Array<string> } {
			return readAllowed(decision, [parameters.id]);
		}

		@ApiRouteCustom({
			documentation: { description: "Changes one setting", summary: "Changes one setting" },
			dto: { [EApiDtoType.BODY]: E2eRouteBoundBodyDto, [EApiDtoType.PARAMETERS]: E2eRouteBoundParametersDto },
			resource: { action: "update", entity: E2eRouteBoundAnchorEntity },
			response: { errors: {}, serialization: { isEnabled: false }, status: HttpStatus.OK, type: E2eRouteBoundResponseDto },
			route: { method: RequestMethod.PATCH, path: ":id" },
			security: { authentication },
		} as never)
		public update(@Body() _body: E2eRouteBoundBodyDto, @Param() parameters: E2eRouteBoundParametersDto, @ApiAuthorizationDecision() decision: IApiAuthorizationDecision<E2eRouteBoundAnchorEntity>): { ids: Array<string> } {
			return readAllowed(decision, [parameters.id]);
		}
	}

	Object.defineProperty(SettingController, "name", { value: options.name });
	ApiController<E2eRouteBoundAnchorEntity>({
		authorization: {
			defaultMode: EApiAuthorizationMode.IAM,
			policyNamespace: E2E_ROUTE_BOUND_NAMESPACE,
			resourceDefinition: {
				entity: E2eRouteBoundAnchorEntity,
				fields: [{ isFilterable: true, path: "resource.section.name", queryPath: "sectionName" }, ...(options.fields ?? [])],
				namespace: E2E_ROUTE_BOUND_NAMESPACE,
				resourcePath: options.resourcePath ?? `${E2E_ROUTE_BOUND_NAMESPACE}/{id}`,
				resourceType: E2E_ROUTE_BOUND_NAMESPACE,
				...(options.routeParameters ? { routeParameters: options.routeParameters } : {}),
			},
		},
		entity: E2eRouteBoundAnchorEntity,
		name: options.name,
		path: "route-bound/config-data",
		routes: NO_GENERATED_ROUTES,
	} as never)(SettingController as never);
	ApiControllerSecurable()(SettingController);

	return SettingController;
}

/**
 * The settings addressed by a key described as text, read by exactly the key the path carries.
 */
@ApiControllerSecurable()
@ApiController<E2eRouteBoundAnchorEntity>({
	authorization: {
		defaultMode: EApiAuthorizationMode.IAM,
		policyNamespace: E2E_ROUTE_BOUND_KEY_NAMESPACE,
		resourceDefinition: { entity: E2eRouteBoundAnchorEntity, fields: [], namespace: E2E_ROUTE_BOUND_KEY_NAMESPACE, resourcePath: `${E2E_ROUTE_BOUND_KEY_NAMESPACE}/{key}`, resourceType: E2E_ROUTE_BOUND_KEY_NAMESPACE, routeParameters: ["key"] },
	},
	entity: E2eRouteBoundAnchorEntity,
	name: "E2eRouteBoundKeySetting",
	path: "route-bound/config-key",
	routes: NO_GENERATED_ROUTES,
} as never)
export class E2eRouteBoundKeyController {
	@Inject(E2eRouteBoundAnchorService)
	public readonly service!: E2eRouteBoundAnchorService;

	@ApiRouteCustom({
		documentation: { description: "Reads one keyed setting", summary: "Reads one keyed setting" },
		dto: { [EApiDtoType.PARAMETERS]: E2eRouteBoundKeyParametersDto },
		resource: { action: "read", entity: E2eRouteBoundAnchorEntity },
		response: { errors: {}, serialization: { isEnabled: false }, status: HttpStatus.OK, type: E2eRouteBoundResponseDto },
		route: { method: RequestMethod.GET, path: ":key" },
		security: { authentication },
	} as never)
	public read(@Param() parameters: E2eRouteBoundKeyParametersDto): { ids: Array<string> } {
		return { ids: [parameters.key] };
	}
}
