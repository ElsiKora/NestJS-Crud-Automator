import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { StartedMySqlContainer } from "@testcontainers/mysql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { TypeOrmModuleOptions } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import type { IApiAuthorizationPrincipal, IApiPolicyDocumentRecord, IApiPolicyStatement } from "../../src/index";

import { HttpStatus } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MySqlContainer } from "@testcontainers/mysql";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiAuthorizationSimulator, AuthorizationResolveDefaultPrincipal, EApiAuthorizationPrincipalType, EApiPolicyEffect, EApiPolicySourceType, EApiRouteType } from "../../src/index";
import { E2E_IAM_BOOLEAN_ITEM_AUTHORIZATION, E2E_IAM_BOOLEAN_PLACEHOLDER_AUTHORIZATION, E2E_IAM_BOOLEAN_USER, E2eIamBooleanCompanyEntity, E2eIamBooleanGuard, E2eIamBooleanItemController, E2eIamBooleanItemEntity, E2eIamBooleanItemService, E2eIamBooleanOwnerEntity, E2eIamBooleanPlaceholderController } from "./iam-boolean-scope";

type TDatabase = "mysql" | "postgres" | "sqlite";

interface IPolicyCase {
	namespace: string;
	statements: Array<IApiPolicyStatement>;
}

const ITEMS: string = "/iam-boolean/items";
const PLACEHOLDER_ITEMS: string = "/iam-boolean/placeholder-items";
const PAGE: string = "limit=50&page=1";
const PRINCIPAL: IApiAuthorizationPrincipal = AuthorizationResolveDefaultPrincipal(E2E_IAM_BOOLEAN_USER);

const COMPANIES: Array<E2eIamBooleanCompanyEntity> = [
	{ id: "c-on", isVerified: true },
	{ id: "c-off", isVerified: false },
];

const OWNERS: Array<E2eIamBooleanOwnerEntity> = [
	{ company: { id: "c-on" } as E2eIamBooleanCompanyEntity, id: "o-1", isActive: true },
	{ company: { id: "c-off" } as E2eIamBooleanCompanyEntity, id: "o-2", isActive: false },
	{ company: null, id: "o-3", isActive: true },
];

const ITEM_ROWS: Array<E2eIamBooleanItemEntity> = [
	{ id: "a", isFeatured: true, isInternal: true, label: "Alpha", meta: { isLocked: false }, owner: { id: "o-1" } as E2eIamBooleanOwnerEntity },
	{ id: "b", isFeatured: false, isInternal: false, label: "Beta", meta: { isLocked: true }, owner: { id: "o-2" } as E2eIamBooleanOwnerEntity },
	{ id: "c", isFeatured: true, isInternal: null, label: "Gamma", meta: { isLocked: true }, owner: { id: "o-3" } as E2eIamBooleanOwnerEntity },
	{ id: "d", isFeatured: false, isInternal: true, label: "Delta", meta: { isLocked: false }, owner: null },
	{ id: "e", isFeatured: true, isInternal: false, label: "Epsilon", meta: { isLocked: false }, owner: { id: "o-2" } as E2eIamBooleanOwnerEntity },
	{ id: "f", isFeatured: false, isInternal: null, label: "Zeta", meta: { isLocked: true }, owner: { id: "o-1" } as E2eIamBooleanOwnerEntity },
];

// A direct described column, an undescribed nullable column, an embedded column, and boolean columns one and two relations away.
const BOOLEAN_FIELDS: Array<string> = ["isFeatured", "isInternal", "meta.isLocked", "owner.isActive", "owner.company.isVerified"];

const statement = (effect: EApiPolicyEffect, condition?: Record<string, Record<string, unknown>>): IApiPolicyStatement => ({
	Action: ["bool:item:*"],
	...(condition ? { Condition: condition } : {}),
	Effect: effect,
	Resource: ["bool:item/*"],
});

const ALLOW_ALL: IApiPolicyStatement = statement(EApiPolicyEffect.ALLOW);
const allow = (operator: string, field: string, value: unknown): IPolicyCase => ({ namespace: "bool:item", statements: [statement(EApiPolicyEffect.ALLOW, { [operator]: { [`resource.${field}`]: value } })] });
const deny = (operator: string, field: string, value: unknown): IPolicyCase => ({ namespace: "bool:item", statements: [ALLOW_ALL, statement(EApiPolicyEffect.DENY, { [operator]: { [`resource.${field}`]: value } })] });

// Conditions that compile: every route keeps exactly the rows the in-memory evaluator allows.
const COMPILABLE_CASES: Array<[string, IPolicyCase]> = [
	...BOOLEAN_FIELDS.flatMap((field: string): Array<[string, IPolicyCase]> => [
		[`Allow StringEquals ${field} "true"`, allow("StringEquals", field, "true")],
		[`Allow StringEquals ${field} false`, allow("StringEquals", field, false)],
		[`Allow StringEquals ${field} \${principal.attributes.featured}`, allow("StringEquals", field, "${principal.attributes.featured}")],
		[`Deny StringEquals ${field} "true"`, deny("StringEquals", field, "true")],
		[`Deny StringEquals ${field} false`, deny("StringEquals", field, false)],
		[`Deny StringNotEquals ${field} "false"`, deny("StringNotEquals", field, "false")],
		[`Deny StringNotEquals ${field} \${principal.attributes.notFeatured}`, deny("StringNotEquals", field, "${principal.attributes.notFeatured}")],
	]),
	// A list of one value reads as that value.
	["Allow StringEquals isFeatured [true]", allow("StringEquals", "isFeatured", [true])],
	['Deny StringEquals isFeatured ["true"]', deny("StringEquals", "isFeatured", ["true"])],
];

// Conditions that cannot compile: every route answers 403 before any row is read.
const FAIL_CLOSED_CASES: Array<[string, IPolicyCase]> = [
	...BOOLEAN_FIELDS.map((field: string): [string, IPolicyCase] => [`Deny StringNotEquals ${field} \${principal.attributes.numericFeatured}`, deny("StringNotEquals", field, "${principal.attributes.numericFeatured}")]),
	["Deny StringEquals isFeatured ${principal.attributes.list}", deny("StringEquals", "isFeatured", "${principal.attributes.list}")],
	["Allow StringEquals on a path TypeORM cannot resolve", allow("StringEquals", "ownerMissing", "true")],
	["Deny StringEquals on a path TypeORM cannot resolve", deny("StringEquals", "ownerMissing", "true")],
];

// Values the policy grammar refuses on a boolean column: the document fails when the source returns it, so every route answers 500.
const REFUSED_CASES: Array<[string, IPolicyCase]> = [
	...BOOLEAN_FIELDS.flatMap((field: string): Array<[string, IPolicyCase]> => [
		[`Allow StringEquals ${field} "1"`, allow("StringEquals", field, "1")],
		[`Allow StringEquals ${field} "yes"`, allow("StringEquals", field, "yes")],
		[`Deny StringEquals ${field} "TRUE"`, deny("StringEquals", field, "TRUE")],
		[`Deny StringEquals ${field} 1`, deny("StringEquals", field, 1)],
	]),
	["Deny StringEquals isFeatured null", deny("StringEquals", "isFeatured", null)],
];

const placeholderDeny = (resource: string): IPolicyCase => ({
	namespace: "boolp:item",
	statements: [
		{ Action: ["boolp:item:*"], Effect: EApiPolicyEffect.ALLOW, Resource: ["boolp:item/*"] },
		{ Action: ["boolp:item:*"], Effect: EApiPolicyEffect.DENY, Resource: [resource] },
	],
});

describe.each<{ database: TDatabase; databaseName: string }>([
	{ database: "sqlite", databaseName: "SQLite" },
	{ database: "postgres", databaseName: "PostgreSQL" },
	{ database: "mysql", databaseName: "MySQL" },
])("IAM conditions on boolean columns on $databaseName (E2E)", ({ database }: { database: TDatabase; databaseName: string }) => {
	let app: INestApplication | undefined;
	let fastify: { inject: (options: { method: string; payload?: Record<string, unknown>; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };
	let mysqlContainer: StartedMySqlContainer | undefined;
	let policy: IPolicyCase = { namespace: "bool:item", statements: [] };
	let postgresContainer: StartedPostgreSqlContainer | undefined;
	let simulator: ApiAuthorizationSimulator;

	const repository = (): Repository<E2eIamBooleanItemEntity> => app!.get(E2eIamBooleanItemService).repository;

	const connection = (entities: Array<new () => unknown>): TypeOrmModuleOptions => {
		if (mysqlContainer) {
			return { database: mysqlContainer.getDatabase(), dropSchema: true, entities, host: mysqlContainer.getHost(), password: mysqlContainer.getUserPassword(), port: mysqlContainer.getPort(), synchronize: true, type: "mysql", username: mysqlContainer.getUsername() };
		}

		if (postgresContainer) {
			return { dropSchema: true, entities, synchronize: true, type: "postgres", url: postgresContainer.getConnectionUri() };
		}

		return { database: ":memory:", dropSchema: true, entities, synchronize: true, type: "better-sqlite3" };
	};

	// The rows the in-memory evaluator allows once each resource is loaded with its relations.
	const allowedInMemory = async (authorization: typeof E2E_IAM_BOOLEAN_ITEM_AUTHORIZATION | typeof E2E_IAM_BOOLEAN_PLACEHOLDER_AUTHORIZATION): Promise<Array<string>> => {
		const allowed: Array<string> = [];

		for (const row of await repository().find({ relations: { owner: { company: true } } })) {
			const decision = await simulator.evaluate({ action: EApiRouteType.GET, authorization: authorization as never, entity: E2eIamBooleanItemEntity, principal: PRINCIPAL, resource: row, routeType: EApiRouteType.GET });

			if (decision.effect === EApiPolicyEffect.ALLOW) {
				allowed.push(row.id);
			}
		}

		return allowed.sort();
	};

	const listIds = async (url: string): Promise<{ ids: Array<string>; statusCode: number }> => {
		const response = await fastify.inject({ method: "GET", url: `${url}?${PAGE}` });

		return { ids: response.statusCode === HttpStatus.OK ? (response.json() as { items: Array<{ id: string }> }).items.map((item: { id: string }): string => item.id).sort() : [], statusCode: response.statusCode };
	};

	// Each row route answers for one row; the update bodies write the values the row already holds, and DELETE runs last.
	const rowStatuses = async (row: E2eIamBooleanItemEntity): Promise<Record<string, number>> => {
		const get: number = (await fastify.inject({ method: "GET", url: `${ITEMS}/${row.id}` })).statusCode;
		const patch: number = (await fastify.inject({ method: "PATCH", payload: { label: row.label }, url: `${ITEMS}/${row.id}` })).statusCode;
		const put: number = (await fastify.inject({ method: "PUT", payload: { isFeatured: row.isFeatured, label: row.label }, url: `${ITEMS}/${row.id}` })).statusCode;
		const remove: number = (await fastify.inject({ method: "DELETE", url: `${ITEMS}/${row.id}` })).statusCode;

		return { DELETE: remove, GET: get, PATCH: patch, PUT: put };
	};

	beforeAll(async () => {
		if (database === "postgres") {
			postgresContainer = await new PostgreSqlContainer("postgres:17-alpine").start();
		}

		if (database === "mysql") {
			mysqlContainer = await new MySqlContainer("mysql:8.4").start();
		}

		const entities: Array<new () => unknown> = [E2eIamBooleanCompanyEntity, E2eIamBooleanOwnerEntity, E2eIamBooleanItemEntity];
		const moduleReference = await Test.createTestingModule({
			controllers: [E2eIamBooleanItemController, E2eIamBooleanPlaceholderController],
			imports: [
				TypeOrmModule.forRoot(connection(entities)),
				TypeOrmModule.forFeature(entities),
				ApiAuthorizationModule.forRoot({
					iam: {
						attachmentSources: [{ getAttachments: async () => await Promise.resolve({ attachments: [{ policyId: "bool-policy", principalId: PRINCIPAL.id, principalType: EApiAuthorizationPrincipalType.USER }], boundaries: [] }) }],
						documentSources: [
							{
								getDocumentsByIds: async (ids: ReadonlyArray<string>): Promise<ReadonlyArray<IApiPolicyDocumentRecord>> => await Promise.resolve(ids.includes("bool-policy") ? [{ document: { Statement: policy.statements, Version: "2012-10-17" }, id: "bool-policy", namespace: policy.namespace, sourceType: EApiPolicySourceType.DATABASE, version: "1" }] : []),
							},
						],
					},
					principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) },
				} as never),
			],
			providers: [E2eIamBooleanItemService, E2eIamBooleanGuard],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		fastify = app.getHttpAdapter().getInstance();
		simulator = app.get(ApiAuthorizationSimulator);

		const dataSourceManager = repository().manager;

		await dataSourceManager.getRepository(E2eIamBooleanCompanyEntity).save(COMPANIES);
		await dataSourceManager.getRepository(E2eIamBooleanOwnerEntity).save(OWNERS);
	}, 300_000);

	beforeEach(async () => {
		await repository().delete(ITEM_ROWS.map((row: E2eIamBooleanItemEntity): string => row.id));
		await repository().save(ITEM_ROWS);
	});

	afterAll(async () => {
		await app?.close();
		await postgresContainer?.stop();
		await mysqlContainer?.stop();
	});

	it.each(COMPILABLE_CASES)("keeps the rows the in-memory evaluator allows on every route for %s", async (_name: string, policyCase: IPolicyCase) => {
		policy = policyCase;

		const allowed: Array<string> = await allowedInMemory(E2E_IAM_BOOLEAN_ITEM_AUTHORIZATION);

		expect(await listIds(ITEMS)).toEqual({ ids: allowed, statusCode: HttpStatus.OK });

		for (const row of ITEM_ROWS) {
			const statuses: Record<string, number> = await rowStatuses(row);

			for (const [method, statusCode] of Object.entries(statuses)) {
				expect({ method, row: row.id, status: statusCode < 300 ? "served" : statusCode }).toEqual({ method, row: row.id, status: allowed.includes(row.id) ? "served" : HttpStatus.NOT_FOUND });
			}
		}
	});

	it.each(FAIL_CLOSED_CASES)("answers 403 on every route for %s", async (_name: string, policyCase: IPolicyCase) => {
		policy = policyCase;

		expect(await listIds(ITEMS)).toEqual({ ids: [], statusCode: HttpStatus.FORBIDDEN });

		for (const row of ITEM_ROWS) {
			expect({ row: row.id, statuses: await rowStatuses(row) }).toEqual({ row: row.id, statuses: { DELETE: HttpStatus.FORBIDDEN, GET: HttpStatus.FORBIDDEN, PATCH: HttpStatus.FORBIDDEN, PUT: HttpStatus.FORBIDDEN } });
		}

		expect((await repository().find()).map((row: E2eIamBooleanItemEntity): string => row.id).sort()).toEqual(ITEM_ROWS.map((row: E2eIamBooleanItemEntity): string => row.id).sort());
	});

	it.each(REFUSED_CASES)("answers 500 on every route for %s", async (_name: string, policyCase: IPolicyCase) => {
		policy = policyCase;

		expect(await listIds(ITEMS)).toEqual({ ids: [], statusCode: HttpStatus.INTERNAL_SERVER_ERROR });

		for (const row of ITEM_ROWS) {
			expect({ row: row.id, statuses: await rowStatuses(row) }).toEqual({ row: row.id, statuses: { DELETE: HttpStatus.INTERNAL_SERVER_ERROR, GET: HttpStatus.INTERNAL_SERVER_ERROR, PATCH: HttpStatus.INTERNAL_SERVER_ERROR, PUT: HttpStatus.INTERNAL_SERVER_ERROR } });
		}

		expect((await repository().find()).map((row: E2eIamBooleanItemEntity): string => row.id).sort()).toEqual(ITEM_ROWS.map((row: E2eIamBooleanItemEntity): string => row.id).sort());
	});

	it.each([
		["boolp:item/true", ["b", "d", "f"]],
		["boolp:item/false", ["a", "c", "e"]],
	])("keeps the rows the in-memory evaluator allows for a list Deny on the boolean placeholder %s", async (resource: string, kept: Array<string>) => {
		policy = placeholderDeny(resource);

		expect(await allowedInMemory(E2E_IAM_BOOLEAN_PLACEHOLDER_AUTHORIZATION)).toEqual(kept);
		expect(await listIds(PLACEHOLDER_ITEMS)).toEqual({ ids: kept, statusCode: HttpStatus.OK });
	});

	it.each(["boolp:item/1", "boolp:item/TRUE", "boolp:item/yes"])("answers 403 for a list Deny on the boolean placeholder %s", async (resource: string) => {
		policy = placeholderDeny(resource);

		expect(await listIds(PLACEHOLDER_ITEMS)).toEqual({ ids: [], statusCode: HttpStatus.FORBIDDEN });
	});
});
