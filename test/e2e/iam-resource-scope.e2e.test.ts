import "reflect-metadata";

import type { ExecutionContext, INestApplication } from "@nestjs/common";
import type { TypeOrmModuleOptions } from "@nestjs/typeorm";
import type { StartedMySqlContainer } from "@testcontainers/mysql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedTestContainer } from "testcontainers";
import type { IApiAuthorizationPrincipal, IApiPolicyDocumentRecord, IApiPolicyStatement } from "../../src/index";

import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { MySqlContainer } from "@testcontainers/mysql";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { GenericContainer, Wait } from "testcontainers";
import { Column, Entity, PrimaryColumn, Repository } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiAuthorizationSimulator, ApiController, ApiControllerSecurable, ApiPropertyDescribe, ApiService, ApiServiceBase, AuthorizationResolveDefaultPrincipal, EApiAuthenticationType, EApiAuthorizationMode, EApiAuthorizationPrincipalType, EApiPolicyEffect, EApiPolicySourceType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

type TDatabase = "mariadb" | "mysql" | "postgres" | "sqlite";

// The list answer of a case: the rows it keeps, or a refusal of the whole list.
type TListAnswer = Array<string> | "refused";

const describeText = (description: string, maxLength: number): PropertyDecorator => ApiPropertyDescribe({ description, exampleValue: "a", format: EApiPropertyStringType.STRING, maxLength, minLength: 0, pattern: "/^.*$/", type: EApiPropertyDescribeType.STRING });

@Entity("e2e_iam_scope_items")
class E2eIamScopeItemEntity {
	@PrimaryColumn({ length: 36, type: "varchar" })
	@describeText("id", 36)
	public id!: string;

	@Column({ length: 36, nullable: true, type: "varchar" })
	public status?: null | string;
}

@Entity("e2e_iam_scope_tenant_items")
class E2eIamScopeTenantItemEntity {
	@PrimaryColumn({ length: 36, type: "varchar" })
	@describeText("id", 36)
	public id!: string;

	@Column({ length: 36, nullable: true, type: "varchar" })
	@describeText("tenantId", 36)
	public tenantId?: null | string;
}

@Entity("e2e_iam_scope_ranks")
class E2eIamScopeRankEntity {
	@PrimaryColumn({ type: "int" })
	@ApiPropertyDescribe({ description: "id", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 1000, minimum: -1000, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER })
	public id!: number;
}

@Entity("e2e_iam_scope_devices")
class E2eIamScopeDeviceEntity {
	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ nullable: true, type: "uuid" })
	@ApiPropertyDescribe({ description: "tenantId", type: EApiPropertyDescribeType.UUID })
	public tenantId?: null | string;
}

const USER: Record<string, unknown> = { id: "user-1", itemId: "item-1", name: "ann" };
const PRINCIPAL: IApiAuthorizationPrincipal = AuthorizationResolveDefaultPrincipal(USER);

/**
 * Authenticates every request as the one test user.
 */
@Injectable()
class E2eIamScopeGuard {
	public canActivate(context: ExecutionContext): boolean {
		context.switchToHttp().getRequest<{ user?: unknown }>().user = USER;

		return true;
	}
}

const authentication = { guard: E2eIamScopeGuard, type: EApiAuthenticationType.USER } as never;

const ITEM_AUTHORIZATION = {
	defaultMode: EApiAuthorizationMode.IAM,
	policyNamespace: "scope:item",
	resourceDefinition: {
		entity: E2eIamScopeItemEntity,
		fields: [
			{ isFilterable: true, path: "resource.id", queryPath: "id" },
			{ isFilterable: true, path: "resource.status", queryPath: "status" },
		],
		namespace: "scope:item",
		resourcePath: "scope:item/{id}",
		resourceType: "scope:item",
	},
};

const TENANT_AUTHORIZATION = {
	defaultMode: EApiAuthorizationMode.IAM,
	policyNamespace: "scopt:item",
	resourceDefinition: {
		entity: E2eIamScopeTenantItemEntity,
		fields: [
			{ isFilterable: true, path: "resource.id", queryPath: "id" },
			{ isFilterable: true, path: "resource.tenantId", queryPath: "tenantId" },
		],
		namespace: "scopt:item",
		resourcePath: "scopt:tenant/{tenantId}/item/{id}",
		resourceType: "scopt:item",
	},
};

const RANK_AUTHORIZATION = {
	defaultMode: EApiAuthorizationMode.IAM,
	policyNamespace: "scopr:item",
	resourceDefinition: {
		entity: E2eIamScopeRankEntity,
		fields: [{ isFilterable: true, path: "resource.id", queryPath: "id" }],
		namespace: "scopr:item",
		resourcePath: "scopr:rank/{id}",
		resourceType: "scopr:item",
	},
};

const DEVICE_AUTHORIZATION = {
	defaultMode: EApiAuthorizationMode.IAM,
	policyNamespace: "scopd:item",
	resourceDefinition: {
		entity: E2eIamScopeDeviceEntity,
		fields: [
			{ isFilterable: true, path: "resource.id", queryPath: "id" },
			{ isFilterable: true, path: "resource.tenantId", queryPath: "tenantId" },
		],
		namespace: "scopd:item",
		resourcePath: "scopd:tenant/{tenantId}/item/{id}",
		resourceType: "scopd:item",
	},
};

@Injectable()
@ApiService({ entity: E2eIamScopeItemEntity })
class E2eIamScopeItemService extends ApiServiceBase<E2eIamScopeItemEntity> {
	@InjectRepository(E2eIamScopeItemEntity)
	public readonly repository!: Repository<E2eIamScopeItemEntity>;
}

@Injectable()
@ApiService({ entity: E2eIamScopeTenantItemEntity })
class E2eIamScopeTenantItemService extends ApiServiceBase<E2eIamScopeTenantItemEntity> {
	@InjectRepository(E2eIamScopeTenantItemEntity)
	public readonly repository!: Repository<E2eIamScopeTenantItemEntity>;
}

@Injectable()
@ApiService({ entity: E2eIamScopeRankEntity })
class E2eIamScopeRankService extends ApiServiceBase<E2eIamScopeRankEntity> {
	@InjectRepository(E2eIamScopeRankEntity)
	public readonly repository!: Repository<E2eIamScopeRankEntity>;
}

@Injectable()
@ApiService({ entity: E2eIamScopeDeviceEntity })
class E2eIamScopeDeviceService extends ApiServiceBase<E2eIamScopeDeviceEntity> {
	@InjectRepository(E2eIamScopeDeviceEntity)
	public readonly repository!: Repository<E2eIamScopeDeviceEntity>;
}

const listOnlyRoutes = {
	[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
	[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
	[EApiRouteType.GET]: { generation: { isEnabled: false } },
	[EApiRouteType.GET_LIST]: { security: { authentication } },
	[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
	[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
} as never;

@ApiControllerSecurable()
@ApiController<E2eIamScopeItemEntity>({
	authorization: ITEM_AUTHORIZATION as never,
	entity: E2eIamScopeItemEntity,
	name: "E2eIamScopeItems",
	path: "iam-scope/items",
	routes: {
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { security: { authentication } },
		[EApiRouteType.GET_LIST]: { security: { authentication } },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	} as never,
})
class E2eIamScopeItemController {
	@Inject(E2eIamScopeItemService)
	public readonly service!: E2eIamScopeItemService;
}

@ApiControllerSecurable()
@ApiController<E2eIamScopeTenantItemEntity>({ authorization: TENANT_AUTHORIZATION as never, entity: E2eIamScopeTenantItemEntity, name: "E2eIamScopeTenantItems", path: "iam-scope/tenants", routes: listOnlyRoutes })
class E2eIamScopeTenantItemController {
	@Inject(E2eIamScopeTenantItemService)
	public readonly service!: E2eIamScopeTenantItemService;
}

@ApiControllerSecurable()
@ApiController<E2eIamScopeRankEntity>({ authorization: RANK_AUTHORIZATION as never, entity: E2eIamScopeRankEntity, name: "E2eIamScopeRanks", path: "iam-scope/ranks", routes: listOnlyRoutes })
class E2eIamScopeRankController {
	@Inject(E2eIamScopeRankService)
	public readonly service!: E2eIamScopeRankService;
}

@ApiControllerSecurable()
@ApiController<E2eIamScopeDeviceEntity>({ authorization: DEVICE_AUTHORIZATION as never, entity: E2eIamScopeDeviceEntity, name: "E2eIamScopeDevices", path: "iam-scope/devices", routes: listOnlyRoutes })
class E2eIamScopeDeviceController {
	@Inject(E2eIamScopeDeviceService)
	public readonly service!: E2eIamScopeDeviceService;
}

const ITEMS: string = "/iam-scope/items";
const TENANTS: string = "/iam-scope/tenants";
const RANKS: string = "/iam-scope/ranks";
const DEVICES: string = "/iam-scope/devices";
const PAGE: string = "limit=50&page=1";
const MARIADB_PASSWORD: string = "iam-scope";
const MYSQL_PORT: number = 3306;
const DEVICE_A: string = "0b6f1c1e-7d2a-4c8e-9a51-3f4e2d1c0b9a";
const DEVICE_B: string = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const TENANT_A: string = "16fd2706-8baf-433b-82eb-8c7fada847da";

// Ids that hold LIKE metacharacters, a code point outside the Basic Multilingual Plane, and no two that differ only in letter case.
const ITEM_ROWS: Array<E2eIamScopeItemEntity> = [
	{ id: "a%b", status: "active" },
	{ id: "a_b", status: "active" },
	{ id: "axb", status: "archived" },
	{ id: "item-1", status: "active" },
	{ id: "item-10", status: "archived" },
	{ id: "item-2", status: null },
	{ id: "z", status: "active" },
	{ id: "🙂", status: "active" },
];
const ALL_ITEMS: Array<string> = ITEM_ROWS.map((row: E2eIamScopeItemEntity): string => row.id).sort();

const TENANT_ROWS: Array<E2eIamScopeTenantItemEntity> = [
	{ id: "a", tenantId: "t-1" },
	{ id: "b", tenantId: "t-2" },
	{ id: "c", tenantId: null },
	{ id: "d", tenantId: "" },
	{ id: "e", tenantId: "t-1/item/x" },
	{ id: "item-x", tenantId: "t-1" },
];
const ALL_TENANT_ITEMS: Array<string> = TENANT_ROWS.map((row: E2eIamScopeTenantItemEntity): string => row.id).sort();

const RANK_ROWS: Array<E2eIamScopeRankEntity> = [{ id: -3 }, { id: 1 }, { id: 7 }, { id: 70 }];
const ALL_RANKS: Array<string> = RANK_ROWS.map((row: E2eIamScopeRankEntity): string => String(row.id)).sort();

const DEVICE_ROWS: Array<E2eIamScopeDeviceEntity> = [
	{ id: DEVICE_A, tenantId: TENANT_A },
	{ id: DEVICE_B, tenantId: null },
];

const without = (all: Array<string>, ...ids: Array<string>): Array<string> => all.filter((id: string): boolean => !ids.includes(id));
const target = (resource: { NotResource?: Array<string>; Resource?: Array<string> }): { NotResource?: Array<string>; Resource?: Array<string> } => resource;

const allowStatement = (namespace: string, resource: { NotResource?: Array<string>; Resource?: Array<string> }, condition?: Record<string, Record<string, unknown>>): IApiPolicyStatement => ({ Action: [`${namespace}:*`], ...(condition ? { Condition: condition } : {}), Effect: EApiPolicyEffect.ALLOW, ...resource });
const denyStatement = (namespace: string, resource: { NotResource?: Array<string>; Resource?: Array<string> }, condition?: Record<string, Record<string, unknown>>): IApiPolicyStatement => ({ Action: [`${namespace}:*`], ...(condition ? { Condition: condition } : {}), Effect: EApiPolicyEffect.DENY, ...resource });
const allowEverything = (namespace: string): IApiPolicyStatement => allowStatement(namespace, { Resource: ["*"] });

// Each row of the table is one policy, and the rows it keeps: the list, the simulator on a loaded row and an HTTP read agree on them.
const ITEM_CASES: Array<[string, Array<IApiPolicyStatement>, Array<string>]> = [
	["Allow Resource exact", [allowStatement("scope:item", target({ Resource: ["scope:item/item-1"] }))], ["item-1"]],
	["Allow Resource of two rows", [allowStatement("scope:item", target({ Resource: ["scope:item/item-1", "scope:item/z"] }))], ["item-1", "z"]],
	["Allow Resource prefix", [allowStatement("scope:item", target({ Resource: ["scope:item/item-*"] }))], ["item-1", "item-10", "item-2"]],
	["Allow Resource ?", [allowStatement("scope:item", target({ Resource: ["scope:item/item-?"] }))], ["item-1", "item-2"]],
	["Allow Resource suffix", [allowStatement("scope:item", target({ Resource: ["scope:item/*-1"] }))], ["item-1"]],
	["Allow Resource interior wildcard", [allowStatement("scope:item", target({ Resource: ["scope:item/i*1"] }))], ["item-1"]],
	["Allow Resource with the LIKE metacharacter _", [allowStatement("scope:item", target({ Resource: ["scope:item/a_b"] }))], ["a_b"]],
	["Allow Resource with the LIKE metacharacter %", [allowStatement("scope:item", target({ Resource: ["scope:item/a%*"] }))], ["a%b"]],
	["Allow Resource a?b", [allowStatement("scope:item", target({ Resource: ["scope:item/a?b"] }))], ["a%b", "a_b", "axb"]],
	["Allow Resource ? over one code point", [allowStatement("scope:item", target({ Resource: ["scope:item/?"] }))], ["z", "🙂"]],
	["Allow Resource in another letter case", [allowStatement("scope:item", target({ Resource: ["scope:item/ITEM-*"] }))], []],
	["Allow Resource exact in another letter case", [allowStatement("scope:item", target({ Resource: ["scope:item/Z"] }))], []],
	["Allow Resource with a trailing space", [allowStatement("scope:item", target({ Resource: ["scope:item/z "] }))], []],
	["Allow Resource and a resource key", [allowStatement("scope:item", target({ Resource: ["scope:item/item-*"] }), { StringEquals: { "resource.status": "active" } })], ["item-1"]],
	["Allow Resource of rows and a Deny on rows", [allowStatement("scope:item", target({ Resource: ["scope:item/item-*"] })), denyStatement("scope:item", target({ Resource: ["scope:item/*0"] }))], ["item-1", "item-2"]],
	["Allow Resource by a variable", [allowStatement("scope:item", target({ Resource: ["scope:item/${principal.attributes.itemId}"] }))], ["item-1"]],
	["Allow Resource by a default", [allowStatement("scope:item", target({ Resource: ["scope:item/${principal.attributes.missing, 'z'}"] }))], ["z"]],
	["Allow NotResource exact", [allowStatement("scope:item", target({ NotResource: ["scope:item/item-1"] }))], without(ALL_ITEMS, "item-1")],
	["Allow NotResource prefix", [allowStatement("scope:item", target({ NotResource: ["scope:item/item-*"] }))], without(ALL_ITEMS, "item-1", "item-10", "item-2")],
	["Allow NotResource ?", [allowStatement("scope:item", target({ NotResource: ["scope:item/?"] }))], without(ALL_ITEMS, "z", "🙂")],
	["Allow NotResource of two patterns", [allowStatement("scope:item", target({ NotResource: ["scope:item/item-*", "scope:item/a*"] }))], ["z", "🙂"]],
	["Allow NotResource of another resource type", [allowStatement("scope:item", target({ NotResource: ["scope:other/*"] }))], ALL_ITEMS],
	["Allow NotResource and a resource key", [allowStatement("scope:item", target({ NotResource: ["scope:item/item-1"] }), { StringEquals: { "resource.status": "active" } })], ["a%b", "a_b", "z", "🙂"]],
	["Allow NotResource by a variable", [allowStatement("scope:item", target({ NotResource: ["scope:item/${principal.attributes.itemId}"] }))], without(ALL_ITEMS, "item-1")],
	["Allow NotResource by a default", [allowStatement("scope:item", target({ NotResource: ["scope:item/${principal.attributes.missing, 'z'}"] }))], without(ALL_ITEMS, "z")],
	["Deny Resource exact", [allowEverything("scope:item"), denyStatement("scope:item", target({ Resource: ["scope:item/item-1"] }))], without(ALL_ITEMS, "item-1")],
	["Deny Resource prefix", [allowEverything("scope:item"), denyStatement("scope:item", target({ Resource: ["scope:item/item-*"] }))], without(ALL_ITEMS, "item-1", "item-10", "item-2")],
	["Deny Resource ?", [allowEverything("scope:item"), denyStatement("scope:item", target({ Resource: ["scope:item/item-?"] }))], without(ALL_ITEMS, "item-1", "item-2")],
	["Deny Resource suffix", [allowEverything("scope:item"), denyStatement("scope:item", target({ Resource: ["scope:item/*b"] }))], without(ALL_ITEMS, "a%b", "a_b", "axb")],
	["Deny Resource in another letter case", [allowEverything("scope:item"), denyStatement("scope:item", target({ Resource: ["scope:item/ITEM-?"] }))], ALL_ITEMS],
	["Deny Resource and a resource key", [allowEverything("scope:item"), denyStatement("scope:item", target({ Resource: ["scope:item/item-*"] }), { StringEquals: { "resource.status": "archived" } })], without(ALL_ITEMS, "item-10")],
	["Deny NotResource exact", [allowEverything("scope:item"), denyStatement("scope:item", target({ NotResource: ["scope:item/item-1"] }))], ["item-1"]],
	["Deny NotResource prefix", [allowEverything("scope:item"), denyStatement("scope:item", target({ NotResource: ["scope:item/item-*"] }))], ["item-1", "item-10", "item-2"]],
	["Deny NotResource ?", [allowEverything("scope:item"), denyStatement("scope:item", target({ NotResource: ["scope:item/?"] }))], ["z", "🙂"]],
	["Deny NotResource of two patterns", [allowEverything("scope:item"), denyStatement("scope:item", target({ NotResource: ["scope:item/item-1", "scope:item/a?b"] }))], ["a%b", "a_b", "axb", "item-1"]],
	["Deny NotResource that covers every row", [allowEverything("scope:item"), denyStatement("scope:item", target({ NotResource: ["scope:item/*"] }))], ALL_ITEMS],
	["Deny NotResource and a resource key", [allowEverything("scope:item"), denyStatement("scope:item", target({ NotResource: ["scope:item/item-1"] }), { StringEquals: { "resource.status": "archived" } })], without(ALL_ITEMS, "axb", "item-10")],
	["Deny NotResource by a variable", [allowEverything("scope:item"), denyStatement("scope:item", target({ NotResource: ["scope:item/${principal.attributes.itemId}"] }))], ["item-1"]],
	["Allow with NotAction", [{ Effect: EApiPolicyEffect.ALLOW, NotAction: ["scope:item:delete"], Resource: ["scope:item/item-1"] }], ["item-1"]],
	["Deny with NotAction", [allowEverything("scope:item"), { Effect: EApiPolicyEffect.DENY, NotAction: ["scope:item:delete"], Resource: ["scope:item/item-1"] }], without(ALL_ITEMS, "item-1")],
];

// Policies that refuse the whole list, and every read as well.
const REFUSING_ITEM_CASES: Array<[string, Array<IApiPolicyStatement>]> = [
	["Allow NotResource that covers every row", [allowStatement("scope:item", target({ NotResource: ["scope:item/*"] }))]],
	["Allow NotResource with an unresolved variable", [allowStatement("scope:item", target({ NotResource: ["scope:item/${principal.attributes.missing}"] }))]],
	["Allow NotResource where one of two patterns is unresolved", [allowStatement("scope:item", target({ NotResource: ["scope:other/x", "scope:item/${principal.attributes.missing}"] }))]],
	["Allow Resource with an unresolved variable", [allowStatement("scope:item", target({ Resource: ["scope:item/${principal.attributes.missing}"] }))]],
	["Deny NotResource with an unresolved variable", [allowEverything("scope:item"), denyStatement("scope:item", target({ NotResource: ["scope:item/${principal.attributes.missing}"] }))]],
	["Deny NotResource where one of two patterns is unresolved", [allowEverything("scope:item"), denyStatement("scope:item", target({ NotResource: ["scope:other/x", "scope:item/${principal.attributes.missing}"] }))]],
	["Deny Resource with an unresolved variable", [allowEverything("scope:item"), denyStatement("scope:item", target({ Resource: ["scope:item/${principal.attributes.missing}"] }))]],
	["Deny NotResource of another resource type", [allowEverything("scope:item"), denyStatement("scope:item", target({ NotResource: ["scope:other/*"] }))]],
];

const TENANT_CASES: Array<[string, Array<IApiPolicyStatement>, TListAnswer, Array<string>]> = [
	["Allow both slots exact", [allowStatement("scopt:item", target({ Resource: ["scopt:tenant/t-1/item/a"] }))], ["a"], ["a"]],
	["Allow a prefix of the first slot, which holds the separator in one row", [allowStatement("scopt:item", target({ Resource: ["scopt:tenant/t-1*"] }))], ["a", "e", "item-x"], ["a", "e", "item-x"]],
	["Allow the rows of an empty tenant, NULL and empty alike", [allowStatement("scopt:item", target({ Resource: ["scopt:tenant//item/c", "scopt:tenant//item/d"] }))], ["c", "d"], ["c", "d"]],
	["Allow a wildcard across both placeholders", [allowStatement("scopt:item", target({ Resource: ["scopt:tenant/t-1*item-x"] }))], ["item-x"], ["item-x"]],
	["Allow NotResource of one row", [allowStatement("scopt:item", target({ NotResource: ["scopt:tenant/t-1/item/a"] }))], without(ALL_TENANT_ITEMS, "a"), without(ALL_TENANT_ITEMS, "a")],
	["Allow NotResource of an empty tenant's row", [allowStatement("scopt:item", target({ NotResource: ["scopt:tenant//item/c"] }))], without(ALL_TENANT_ITEMS, "c"), without(ALL_TENANT_ITEMS, "c")],
	["Allow NotResource of a prefix", [allowStatement("scopt:item", target({ NotResource: ["scopt:tenant/t-1*"] }))], ["b", "c", "d"], ["b", "c", "d"]],
	["Deny one row", [allowEverything("scopt:item"), denyStatement("scopt:item", target({ Resource: ["scopt:tenant/t-1/item/a"] }))], without(ALL_TENANT_ITEMS, "a"), without(ALL_TENANT_ITEMS, "a")],
	["Deny an empty tenant's row", [allowEverything("scopt:item"), denyStatement("scopt:item", target({ Resource: ["scopt:tenant//item/d"] }))], without(ALL_TENANT_ITEMS, "d"), without(ALL_TENANT_ITEMS, "d")],
	["Deny a wildcard across both placeholders", [allowEverything("scopt:item"), denyStatement("scopt:item", target({ Resource: ["scopt:tenant/t-1*item-x"] }))], without(ALL_TENANT_ITEMS, "item-x"), without(ALL_TENANT_ITEMS, "item-x")],
	["Deny NotResource of one row", [allowEverything("scopt:item"), denyStatement("scopt:item", target({ NotResource: ["scopt:tenant/t-1/item/a"] }))], ["a"], ["a"]],
	["Deny NotResource of a prefix", [allowEverything("scopt:item"), denyStatement("scopt:item", target({ NotResource: ["scopt:tenant/t-1*"] }))], ["a", "e", "item-x"], ["a", "e", "item-x"]],
	// A glob that maps to rows in more than one way never reaches SQL: the list fails closed, while a loaded row still reads as the glob says.
	["Allow an ambiguous glob", [allowStatement("scopt:item", target({ Resource: ["scopt:tenant/*/item/a"] }))], "refused", ["a"]],
	["Allow NotResource of an ambiguous glob", [allowStatement("scopt:item", target({ NotResource: ["scopt:tenant/*/item/a"] }))], "refused", without(ALL_TENANT_ITEMS, "a")],
	["Deny an ambiguous glob", [allowEverything("scopt:item"), denyStatement("scopt:item", target({ Resource: ["scopt:tenant/*/item/a"] }))], "refused", without(ALL_TENANT_ITEMS, "a")],
	["Deny NotResource of an ambiguous glob", [allowEverything("scopt:item"), denyStatement("scopt:item", target({ NotResource: ["scopt:tenant/*/item/a"] }))], "refused", ["a"]],
];

const RANK_CASES: Array<[string, Array<IApiPolicyStatement>, TListAnswer, Array<string>]> = [
	["Allow an integer", [allowStatement("scopr:item", target({ Resource: ["scopr:rank/7"] }))], ["7"], ["7"]],
	["Allow a negative integer", [allowStatement("scopr:item", target({ Resource: ["scopr:rank/-3"] }))], ["-3"], ["-3"]],
	["Allow two integers", [allowStatement("scopr:item", target({ Resource: ["scopr:rank/7", "scopr:rank/1"] }))], ["1", "7"], ["1", "7"]],
	["Allow text no integer renders", [allowStatement("scopr:item", target({ Resource: ["scopr:rank/07"] }))], "refused", []],
	["Allow text that is no number", [allowStatement("scopr:item", target({ Resource: ["scopr:rank/abc"] }))], "refused", []],
	["Allow a wildcard over an integer", [allowStatement("scopr:item", target({ Resource: ["scopr:rank/7*"] }))], "refused", ["7", "70"]],
	["Allow NotResource of an integer", [allowStatement("scopr:item", target({ NotResource: ["scopr:rank/7"] }))], without(ALL_RANKS, "7"), without(ALL_RANKS, "7")],
	["Allow NotResource of text that is no number", [allowStatement("scopr:item", target({ NotResource: ["scopr:rank/abc"] }))], ALL_RANKS, ALL_RANKS],
	["Deny an integer", [allowEverything("scopr:item"), denyStatement("scopr:item", target({ Resource: ["scopr:rank/7"] }))], without(ALL_RANKS, "7"), without(ALL_RANKS, "7")],
	["Deny text no integer renders", [allowEverything("scopr:item"), denyStatement("scopr:item", target({ Resource: ["scopr:rank/07"] }))], ALL_RANKS, ALL_RANKS],
	["Deny a wildcard over an integer", [allowEverything("scopr:item"), denyStatement("scopr:item", target({ Resource: ["scopr:rank/7*"] }))], "refused", without(ALL_RANKS, "7", "70")],
	["Deny NotResource of an integer", [allowEverything("scopr:item"), denyStatement("scopr:item", target({ NotResource: ["scopr:rank/7"] }))], ["7"], ["7"]],
	["Deny NotResource of text that is no number", [allowEverything("scopr:item"), denyStatement("scopr:item", target({ NotResource: ["scopr:rank/abc"] }))], "refused", []],
];

const startMariaDb = async (): Promise<StartedTestContainer> =>
	await new GenericContainer("mariadb:11")
		.withEnvironment({ MARIADB_DATABASE: "iam", MARIADB_ROOT_PASSWORD: MARIADB_PASSWORD })
		.withExposedPorts(MYSQL_PORT)
		// The image first runs a temporary server on port 0 to initialize the database.
		.withWaitStrategy(Wait.forLogMessage(/port: 3306\s/u))
		.withStartupTimeout(240_000)
		.start();

describe.each<{ database: TDatabase; databaseName: string }>([
	{ database: "sqlite", databaseName: "SQLite" },
	{ database: "postgres", databaseName: "PostgreSQL 17" },
	{ database: "mysql", databaseName: "MySQL 8.4" },
	{ database: "mariadb", databaseName: "MariaDB 11" },
])("IAM resource targets give one answer on the list, a loaded row and a read on $databaseName (E2E)", ({ database }: { database: TDatabase; databaseName: string }) => {
	let app: INestApplication | undefined;
	let fastify: { inject: (options: { method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };
	let mariaDbContainer: StartedTestContainer | undefined;
	let mysqlContainer: StartedMySqlContainer | undefined;
	let namespace: string = "scope:item";
	let statements: ReadonlyArray<IApiPolicyStatement> = [];
	let postgresContainer: StartedPostgreSqlContainer | undefined;
	let simulator: ApiAuthorizationSimulator;

	const connection = (entities: Array<new () => unknown>): TypeOrmModuleOptions => {
		if (mariaDbContainer) {
			return { database: "iam", dropSchema: true, entities, host: mariaDbContainer.getHost(), password: MARIADB_PASSWORD, port: mariaDbContainer.getMappedPort(MYSQL_PORT), synchronize: true, type: "mysql", username: "root" };
		}

		if (mysqlContainer) {
			return { database: mysqlContainer.getDatabase(), dropSchema: true, entities, host: mysqlContainer.getHost(), password: mysqlContainer.getUserPassword(), port: mysqlContainer.getPort(), synchronize: true, type: "mysql", username: mysqlContainer.getUsername() };
		}

		if (postgresContainer) {
			return { dropSchema: true, entities, synchronize: true, type: "postgres", url: postgresContainer.getConnectionUri() };
		}

		return { database: ":memory:", dropSchema: true, entities, synchronize: true, type: "better-sqlite3" };
	};

	const listIds = async (url: string): Promise<TListAnswer> => {
		const response = await fastify.inject({ method: "GET", url: `${url}?${PAGE}` });

		if (response.statusCode === HttpStatus.FORBIDDEN) {
			return "refused";
		}

		expect(response.statusCode).toBe(HttpStatus.OK);

		return (response.json() as { items: Array<{ id: number | string }> }).items.map((item: { id: number | string }): string => String(item.id)).sort();
	};

	const readIds = async (ids: ReadonlyArray<string>): Promise<Array<string>> => {
		const allowed: Array<string> = [];

		for (const id of ids) {
			const response = await fastify.inject({ method: "GET", url: `${ITEMS}/${encodeURIComponent(id)}` });

			expect([HttpStatus.OK, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND]).toContain(response.statusCode);

			if (response.statusCode === HttpStatus.OK) {
				allowed.push(id);
			}
		}

		return allowed.sort();
	};

	const simulateIds = async (authorization: unknown, entity: new () => unknown, rows: ReadonlyArray<{ id: number | string }>): Promise<Array<string>> => {
		const allowed: Array<string> = [];

		for (const row of rows) {
			const decision = await simulator.evaluate({ action: EApiRouteType.GET, authorization: authorization as never, entity: entity as never, principal: PRINCIPAL, resource: row as never, routeType: EApiRouteType.GET });

			if (decision.effect === EApiPolicyEffect.ALLOW) {
				allowed.push(String(row.id));
			}
		}

		return allowed.sort();
	};

	const simulateCreate = async (): Promise<EApiPolicyEffect> => (await simulator.evaluate({ action: EApiRouteType.CREATE, authorization: ITEM_AUTHORIZATION as never, entity: E2eIamScopeItemEntity as never, principal: PRINCIPAL, routeType: EApiRouteType.CREATE })).effect;

	beforeAll(async () => {
		if (database === "postgres") {
			postgresContainer = await new PostgreSqlContainer("postgres:17-alpine").start();
		}

		if (database === "mysql") {
			mysqlContainer = await new MySqlContainer("mysql:8.4").start();
		}

		if (database === "mariadb") {
			mariaDbContainer = await startMariaDb();
		}

		const entities: Array<new () => unknown> = [E2eIamScopeItemEntity, E2eIamScopeTenantItemEntity, E2eIamScopeRankEntity, E2eIamScopeDeviceEntity];
		const moduleReference = await Test.createTestingModule({
			controllers: [E2eIamScopeItemController, E2eIamScopeTenantItemController, E2eIamScopeRankController, E2eIamScopeDeviceController],
			imports: [
				TypeOrmModule.forRoot(connection(entities)),
				TypeOrmModule.forFeature(entities),
				ApiAuthorizationModule.forRoot({
					iam: {
						attachmentSources: [{ getAttachments: async () => await Promise.resolve({ attachments: [{ policyId: "scope-policy", principalId: PRINCIPAL.id, principalType: EApiAuthorizationPrincipalType.USER }], boundaries: [] }) }],
						documentSources: [
							{
								getDocumentsByIds: async (ids: ReadonlyArray<string>): Promise<ReadonlyArray<IApiPolicyDocumentRecord>> => await Promise.resolve(ids.includes("scope-policy") ? [{ document: { Statement: statements, Version: "2012-10-17" }, id: "scope-policy", namespace, sourceType: EApiPolicySourceType.DATABASE, version: "1" }] : []),
							},
						],
					},
					principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) },
				} as never),
			],
			providers: [E2eIamScopeItemService, E2eIamScopeTenantItemService, E2eIamScopeRankService, E2eIamScopeDeviceService, E2eIamScopeGuard],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		fastify = app.getHttpAdapter().getInstance();
		simulator = app.get(ApiAuthorizationSimulator);

		await app.get(E2eIamScopeItemService).repository.save(ITEM_ROWS);
		await app.get(E2eIamScopeTenantItemService).repository.save(TENANT_ROWS);
		await app.get(E2eIamScopeRankService).repository.save(RANK_ROWS);
		await app.get(E2eIamScopeDeviceService).repository.save(DEVICE_ROWS);
	}, 300_000);

	afterAll(async () => {
		await app?.close();
		await postgresContainer?.stop();
		await mysqlContainer?.stop();
		await mariaDbContainer?.stop();
	});

	it.each(ITEM_CASES)("keeps the same rows on a list, a loaded row and a read for %s", async (_name: string, caseStatements: Array<IApiPolicyStatement>, kept: Array<string>) => {
		namespace = "scope:item";
		statements = caseStatements;

		expect(await simulateIds(ITEM_AUTHORIZATION, E2eIamScopeItemEntity, ITEM_ROWS)).toEqual(kept);
		expect(await listIds(ITEMS)).toEqual(kept);
		expect(await readIds(ALL_ITEMS)).toEqual(kept);
	});

	it.each(REFUSING_ITEM_CASES)("refuses the list and every read for %s", async (_name: string, caseStatements: Array<IApiPolicyStatement>) => {
		namespace = "scope:item";
		statements = caseStatements;

		expect(await listIds(ITEMS)).toBe("refused");
		expect(await readIds(ALL_ITEMS)).toEqual([]);
		expect(await simulateIds(ITEM_AUTHORIZATION, E2eIamScopeItemEntity, ITEM_ROWS)).toEqual([]);
	});

	it.each(TENANT_CASES)("agrees on a list of two placeholders and on a loaded row for %s", async (_name: string, caseStatements: Array<IApiPolicyStatement>, listed: TListAnswer, loaded: Array<string>) => {
		namespace = "scopt:item";
		statements = caseStatements;

		expect(await simulateIds(TENANT_AUTHORIZATION, E2eIamScopeTenantItemEntity, TENANT_ROWS)).toEqual(loaded);
		expect(await listIds(TENANTS)).toEqual(listed);
	});

	it.each(RANK_CASES)("agrees on a list of an integer placeholder and on a loaded row for %s", async (_name: string, caseStatements: Array<IApiPolicyStatement>, listed: TListAnswer, loaded: Array<string>) => {
		namespace = "scopr:item";
		statements = caseStatements;

		expect(await simulateIds(RANK_AUTHORIZATION, E2eIamScopeRankEntity, RANK_ROWS)).toEqual(loaded);
		expect(await listIds(RANKS)).toEqual(listed);
	});

	it("compares both slots of a uuid placeholder pair exactly", async () => {
		namespace = "scopd:item";
		statements = [allowStatement("scopd:item", target({ Resource: [`scopd:tenant/${TENANT_A}/item/${DEVICE_A}`] }))];
		expect(await listIds(DEVICES)).toEqual([DEVICE_A]);

		statements = [allowStatement("scopd:item", target({ Resource: [`scopd:tenant//item/${DEVICE_B}`] }))];
		expect(await listIds(DEVICES)).toEqual([DEVICE_B]);

		statements = [allowStatement("scopd:item", target({ Resource: [`scopd:tenant/${TENANT_A.toUpperCase()}/item/${DEVICE_A}`] }))];
		expect(await listIds(DEVICES)).toEqual([]);

		statements = [allowEverything("scopd:item"), denyStatement("scopd:item", target({ NotResource: [`scopd:tenant/${TENANT_A}/item/${DEVICE_A}`] }))];
		expect(await listIds(DEVICES)).toEqual([DEVICE_A]);
	});

	it("decomposes a wildcard over a uuid slot only where the column cannot hold the separator", async () => {
		namespace = "scopd:item";
		statements = [allowStatement("scopd:item", target({ Resource: [`scopd:tenant/*/item/${DEVICE_A}`] }))];
		expect(await simulateIds(DEVICE_AUTHORIZATION, E2eIamScopeDeviceEntity, DEVICE_ROWS)).toEqual([DEVICE_A]);
		expect(await listIds(DEVICES)).toEqual(database === "postgres" ? [DEVICE_A] : "refused");

		statements = [allowEverything("scopd:item"), denyStatement("scopd:item", target({ Resource: [`scopd:tenant/*/item/${DEVICE_A}`] }))];
		expect(await simulateIds(DEVICE_AUTHORIZATION, E2eIamScopeDeviceEntity, DEVICE_ROWS)).toEqual([DEVICE_B]);
		expect(await listIds(DEVICES)).toEqual(database === "postgres" ? [DEVICE_B] : "refused");
	});

	it("reads a create, which names no row, by its rule", async () => {
		namespace = "scope:item";

		statements = [allowStatement("scope:item", target({ Resource: ["scope:item/item-1"] }))];
		expect(await simulateCreate()).toBe(EApiPolicyEffect.DENY);

		statements = [allowStatement("scope:item", target({ Resource: ["scope:item/*"] }))];
		expect(await simulateCreate()).toBe(EApiPolicyEffect.ALLOW);

		statements = [allowStatement("scope:item", target({ NotResource: ["scope:item/item-1"] }))];
		expect(await simulateCreate()).toBe(EApiPolicyEffect.DENY);

		statements = [allowStatement("scope:item", target({ NotResource: ["scope:other/*"] }))];
		expect(await simulateCreate()).toBe(EApiPolicyEffect.ALLOW);

		statements = [allowEverything("scope:item"), denyStatement("scope:item", target({ NotResource: ["scope:item/item-1"] }))];
		expect(await simulateCreate()).toBe(EApiPolicyEffect.DENY);

		statements = [allowEverything("scope:item"), denyStatement("scope:item", target({ NotResource: ["scope:other/*"] }))];
		expect(await simulateCreate()).toBe(EApiPolicyEffect.DENY);

		statements = [allowEverything("scope:item"), denyStatement("scope:item", target({ NotResource: ["scope:item/*"] }))];
		expect(await simulateCreate()).toBe(EApiPolicyEffect.ALLOW);

		statements = [allowEverything("scope:item"), denyStatement("scope:item", target({ Resource: ["scope:item/item-1"] }))];
		expect(await simulateCreate()).toBe(EApiPolicyEffect.ALLOW);
	});
});
