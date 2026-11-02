import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Column, Entity, PrimaryColumn, Repository } from "typeorm";

import { ApiAuthorizationPolicy, ApiAuthorizationPolicyBase, ApiController, ApiControllerSecurable, ApiPropertyDescribe, ApiService, ApiServiceBase, EApiAuthenticationType, EApiAuthorizationMode, EApiPolicyEffect, EApiPolicySourceType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType, GetDefaultStringFormatProperties } from "../../../src/index";

export type TE2ePathParameterKeySpellingDeny = "condition" | "resource";

export interface IE2ePathParameterKeySpellingCase {
	allowed: Array<string>;
	column: Record<string, unknown>;
	denied: Array<string>;
	describe: Record<string, unknown>;
	invalid: Array<string>;
	name: string;
	rows: Array<number | string>;
	value: string;
}

export interface IE2ePathParameterKeySpellingRoute {
	controller: new () => unknown;
	entity: new () => unknown;
	namespace: string;
	rows: Array<number | string>;
	service: new () => unknown;
}

const DISABLED_ROUTE: Record<string, unknown> = { generation: { isEnabled: false } };
const LABEL_PROPERTY: never = { description: "label", exampleValue: "Label", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING } as never;
const TEXT_PROPERTY: Record<string, unknown> = { description: "key", exampleValue: "16", format: EApiPropertyStringType.STRING, maxLength: 20, minLength: 1, type: EApiPropertyDescribeType.STRING };
const BIGINT_PROPERTY: Record<string, unknown> = { type: EApiPropertyDescribeType.STRING, ...GetDefaultStringFormatProperties(EApiPropertyStringType.BIGINT_STRING) };
const INTEGER_PROPERTY: Record<string, unknown> = { description: "key", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 2_147_483_647, minimum: -2_147_483_647, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER };
const DOUBLE_PROPERTY: Record<string, unknown> = { description: "key", exampleValue: 1.5, format: EApiPropertyNumberType.DOUBLE, maximum: 1000, minimum: -1000, multipleOf: 0.01, type: EApiPropertyDescribeType.NUMBER };
const AMOUNT_TEXT_PROPERTY: Record<string, unknown> = { ...TEXT_PROPERTY, exampleValue: "1.50", pattern: String.raw`/^\d+(\.\d+)?$/` };

class E2ePathParameterKeySpellingAuthenticationGuard {
	public canActivate(context: { switchToHttp: () => { getRequest: () => { url: string; user?: unknown } } }): boolean {
		const request: { url: string; user?: unknown } = context.switchToHttp().getRequest();
		request.user = { id: /\/key-spelling\/([\w-]+)/.exec(request.url)?.[1] ?? "anonymous" };

		return true;
	}
}

// Each key is read by the database as a number, so every spelling of the denied key finds the denied row unless the guard refuses it. A text key keeps its leading zeros.
export const E2E_PATH_PARAMETER_KEY_SPELLING_CASES: Array<IE2ePathParameterKeySpellingCase> = [
	{ allowed: ["17"], column: { type: "bigint" }, denied: ["0"], describe: BIGINT_PROPERTY, invalid: ["-0", "00", "016"], name: "bigint-default", rows: ["0", "17"], value: "0" },
	{ allowed: ["17", "-5"], column: { type: "bigint" }, denied: ["16"], describe: { ...TEXT_PROPERTY, pattern: String.raw`/^-?\d+$/` }, invalid: ["016", "0016", "-016", "-0", "00"], name: "bigint-loose", rows: ["16", "17", "-5"], value: "16" },
	{ allowed: ["17"], column: { type: "int" }, denied: ["16"], describe: { ...TEXT_PROPERTY, pattern: String.raw`/^\d+$/` }, invalid: ["016", "0016"], name: "int-text", rows: [16, 17], value: "16" },
	{ allowed: ["16"], column: { type: "int" }, denied: ["0", "-0"], describe: INTEGER_PROPERTY, invalid: ["00", "016"], name: "int-number", rows: [0, 16], value: "0" },
	{ allowed: ["016"], column: { type: "varchar" }, denied: ["16"], describe: { ...TEXT_PROPERTY, pattern: String.raw`/^\d+$/` }, invalid: ["abc"], name: "text-digits", rows: ["16", "016"], value: "16" },
];

// A database reads every spelling of a decimal as the same key, and a stored value such as `1.50` has more than one text, so no Deny value can name it.
export const E2E_PATH_PARAMETER_KEY_SPELLING_DECIMAL_REFUSED: Array<Pick<IE2ePathParameterKeySpellingCase, "column" | "describe" | "name">> = [
	{ column: { precision: 10, scale: 2, type: "decimal" }, describe: AMOUNT_TEXT_PROPERTY, name: "decimal-text" },
	{ column: { precision: 10, scale: 2, type: "numeric" }, describe: AMOUNT_TEXT_PROPERTY, name: "numeric-text" },
	{ column: { type: "float" }, describe: AMOUNT_TEXT_PROPERTY, name: "float-text" },
	{ column: { precision: 10, scale: 2, type: "decimal" }, describe: DOUBLE_PROPERTY, name: "decimal-number" },
	{ column: { type: "float" }, describe: DOUBLE_PROPERTY, name: "float-number" },
];

export const E2E_PATH_PARAMETER_KEY_SPELLING_DOCUMENTS: Array<Record<string, unknown>> = [];

const namePart = (name: string): string => name.replaceAll("-", "");

/**
 * Builds the entity of one case, with its key column named `key`.
 * @param {Pick<IE2ePathParameterKeySpellingCase, "column" | "describe" | "name">} keyCase - Key column and description.
 * @returns {new () => unknown} Entity class.
 */
const buildEntity = (keyCase: Pick<IE2ePathParameterKeySpellingCase, "column" | "describe" | "name">): new () => unknown => {
	class KeySpellingEntity {
		public key!: unknown;

		public label!: string;
	}

	Object.defineProperty(KeySpellingEntity, "name", { value: `E2eKeySpelling${namePart(keyCase.name)}Entity` });
	Entity(`e2e_key_spelling_${namePart(keyCase.name)}`)(KeySpellingEntity);
	PrimaryColumn(keyCase.column as never)(KeySpellingEntity.prototype, "key");
	ApiPropertyDescribe(keyCase.describe as never)(KeySpellingEntity.prototype, "key");
	Column({ type: "varchar" })(KeySpellingEntity.prototype, "label");
	ApiPropertyDescribe(LABEL_PROPERTY)(KeySpellingEntity.prototype, "label");

	return KeySpellingEntity;
};

/**
 * Builds the service of an entity.
 * @param {new () => unknown} entity - Entity class.
 * @returns {new () => unknown} Service class.
 */
const buildService = (entity: new () => unknown): new () => unknown => {
	class KeySpellingService extends ApiServiceBase<never> {
		@InjectRepository(entity)
		public readonly repository!: Repository<never>;
	}

	Object.defineProperty(KeySpellingService, "name", { value: `${entity.name}Service` });
	const decorated: unknown = ApiService({ entity: entity as never })(KeySpellingService as never);
	const service: new () => unknown = (decorated ?? KeySpellingService) as new () => unknown;
	Injectable()(service);

	return service;
};

/**
 * Builds a securable controller whose only route is the generated `GET :key`.
 * @param {new () => unknown} entity - Entity class.
 * @param {new () => unknown} service - Service class.
 * @param {string} namespace - Policy namespace and route path segment.
 * @param {EApiAuthorizationMode} mode - Authorization mode of the route.
 * @returns {new () => unknown} Controller class.
 */
const buildController = (entity: new () => unknown, service: new () => unknown, namespace: string, mode: EApiAuthorizationMode): new () => unknown => {
	class KeySpellingController {
		@Inject(service)
		public readonly service!: unknown;
	}

	Object.defineProperty(KeySpellingController, "name", { value: `E2eKeySpelling${namePart(namespace)}Controller` });
	const route: Record<string, unknown> = { security: { authentication: { guard: E2ePathParameterKeySpellingAuthenticationGuard, type: EApiAuthenticationType.USER }, authorization: { mode } } };
	const decorated: unknown = ApiController({
		authorization: { defaultMode: mode, policyNamespace: namespace, resourceDefinition: { entity, fields: [{ isFilterable: true, path: "resource.key", queryPath: "key" }], namespace, resourcePath: `${namespace}/{key}`, resourceType: namespace } },
		entity,
		name: `E2eKeySpelling${namePart(namespace)}`,
		path: `key-spelling/${namespace}`,
		routes: { [EApiRouteType.CREATE]: DISABLED_ROUTE, [EApiRouteType.DELETE]: DISABLED_ROUTE, [EApiRouteType.GET]: route, [EApiRouteType.GET_LIST]: DISABLED_ROUTE, [EApiRouteType.PARTIAL_UPDATE]: DISABLED_ROUTE, [EApiRouteType.UPDATE]: DISABLED_ROUTE },
	} as never)(KeySpellingController as never);
	const controller: new () => unknown = (decorated ?? KeySpellingController) as new () => unknown;
	ApiControllerSecurable()(controller);

	return controller;
};

/**
 * Builds the two routes of a case: one denies the key by a condition on the path value, the other by the resource path.
 * @param {IE2ePathParameterKeySpellingCase} keyCase - Key case.
 * @returns {Array<IE2ePathParameterKeySpellingRoute>} The routes.
 */
const buildRoutes = (keyCase: IE2ePathParameterKeySpellingCase): Array<IE2ePathParameterKeySpellingRoute> => {
	const entity: new () => unknown = buildEntity(keyCase);
	const service: new () => unknown = buildService(entity);

	return (["condition", "resource"] as Array<TE2ePathParameterKeySpellingDeny>).map((deny: TE2ePathParameterKeySpellingDeny): IE2ePathParameterKeySpellingRoute => {
		const namespace: string = `${keyCase.name}-${deny}`;
		E2E_PATH_PARAMETER_KEY_SPELLING_DOCUMENTS.push({
			document: {
				Statement: [{ Action: [`${namespace}:*`], Effect: EApiPolicyEffect.ALLOW, Resource: ["*"] }, deny === "condition" ? { Action: [`${namespace}:*`], Condition: { StringEquals: { "request.parameters.key": keyCase.value } }, Effect: EApiPolicyEffect.DENY, Resource: ["*"] } : { Action: [`${namespace}:*`], Effect: EApiPolicyEffect.DENY, Resource: [`${namespace}/${keyCase.value}`] }],
				Version: "2012-10-17",
			},
			id: namespace,
			namespace,
			sourceType: EApiPolicySourceType.DATABASE,
			version: "1",
		});

		return { controller: buildController(entity, service, namespace, EApiAuthorizationMode.IAM), entity, namespace, rows: keyCase.rows, service };
	});
};

export const E2E_PATH_PARAMETER_KEY_SPELLING_ROUTES: Array<IE2ePathParameterKeySpellingRoute> = E2E_PATH_PARAMETER_KEY_SPELLING_CASES.flatMap((keyCase: IE2ePathParameterKeySpellingCase) => buildRoutes(keyCase));

/**
 * Builds a securable IAM controller over a decimal key column, which must not start.
 * @param {Pick<IE2ePathParameterKeySpellingCase, "column" | "describe" | "name">} keyCase - Key column and description.
 * @returns {Pick<IE2ePathParameterKeySpellingRoute, "controller" | "entity" | "service">} The route.
 */
export const buildE2ePathParameterKeySpellingDecimalRoute = (keyCase: Pick<IE2ePathParameterKeySpellingCase, "column" | "describe" | "name">): Pick<IE2ePathParameterKeySpellingRoute, "controller" | "entity" | "service"> => {
	const entity: new () => unknown = buildEntity(keyCase);
	const service: new () => unknown = buildService(entity);

	return { controller: buildController(entity, service, keyCase.name, EApiAuthorizationMode.IAM), entity, service };
};

/**
 * Builds a securable HOOKS controller over a decimal key column, which fails at startup: a policy compares `context.parameters` as text, and no text names every spelling of one decimal key.
 * @returns {Pick<IE2ePathParameterKeySpellingRoute, "controller" | "entity" | "service"> & { policy: new () => unknown }} The route and the hooks policy of its entity.
 */
export const buildE2ePathParameterKeySpellingDecimalHooksRoute = (): Pick<IE2ePathParameterKeySpellingRoute, "controller" | "entity" | "service"> & { policy: new () => unknown } => {
	const entity: new () => unknown = buildEntity({ column: { precision: 10, scale: 2, type: "decimal" }, describe: AMOUNT_TEXT_PROPERTY, name: "decimal-hooks" });
	const service: new () => unknown = buildService(entity);

	class KeySpellingHooksPolicy extends ApiAuthorizationPolicyBase<never> {}

	Object.defineProperty(KeySpellingHooksPolicy, "name", { value: "E2eKeySpellingHooksPolicy" });
	Injectable()(KeySpellingHooksPolicy);
	ApiAuthorizationPolicy({ entity: entity as never })(KeySpellingHooksPolicy);

	return { controller: buildController(entity, service, "decimal-hooks", EApiAuthorizationMode.HOOKS), entity, policy: KeySpellingHooksPolicy, service };
};
