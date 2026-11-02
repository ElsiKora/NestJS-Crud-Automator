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
import {
	E2E_IAM_PARITY_ALIAS_AUTHORIZATION,
	E2E_IAM_PARITY_ALIAS_PLACEHOLDER_AUTHORIZATION,
	E2E_IAM_PARITY_DIRECT_AUTHORIZATION,
	E2E_IAM_PARITY_DOTTED_PLACEHOLDER_AUTHORIZATION,
	E2E_IAM_PARITY_USER,
	E2eIamParityAliasItemController,
	E2eIamParityAliasPlaceholderController,
	E2eIamParityCompanyEntity,
	E2eIamParityDottedPlaceholderController,
	E2eIamParityGuard,
	E2eIamParityItemController,
	E2eIamParityItemEntity,
	E2eIamParityItemService,
	E2eIamParityOwnerEntity,
} from "./iam-path-parity";

type TCondition = Record<string, Record<string, unknown>>;

type TDatabase = "mysql" | "postgres" | "sqlite";

type TTarget = "alias" | "direct";

interface IPolicyCase {
	namespace: string;
	statements: Array<IApiPolicyStatement>;
}

const TARGETS: Record<TTarget, { authorization: typeof E2E_IAM_PARITY_DIRECT_AUTHORIZATION; namespace: string; url: string }> = {
	alias: { authorization: E2E_IAM_PARITY_ALIAS_AUTHORIZATION, namespace: "paritya:item", url: "/iam-parity/alias-items" },
	direct: { authorization: E2E_IAM_PARITY_DIRECT_AUTHORIZATION, namespace: "parity:item", url: "/iam-parity/items" },
};

const ALIAS_PLACEHOLDER_ITEMS: string = "/iam-parity/alias-placeholder-items";
const DOTTED_PLACEHOLDER_ITEMS: string = "/iam-parity/dotted-placeholder-items";
const PAGE: string = "limit=50&page=1";
const PRINCIPAL: IApiAuthorizationPrincipal = AuthorizationResolveDefaultPrincipal(E2E_IAM_PARITY_USER);

const COMPANIES: Array<E2eIamParityCompanyEntity> = [
	{ id: "c-1", isVerified: true, name: "acme" },
	{ id: "c-2", isVerified: false, name: null },
];

const OWNERS: Array<E2eIamParityOwnerEntity> = [
	{ company: { id: "c-1" } as E2eIamParityCompanyEntity, id: "o-1", isActive: true, tag: "x" },
	{ company: { id: "c-2" } as E2eIamParityCompanyEntity, id: "o-2", isActive: false, tag: null },
	{ company: null, id: "o-3", isActive: true, tag: "x" },
];

// Rows with a full owner chain, a NULL column one and two relations away, a missing company, and a missing owner.
const ITEM_ROWS: Array<E2eIamParityItemEntity> = [
	{ id: "a", isFeatured: true, label: "Alpha", meta: { isLocked: false, note: "n" }, owner: { id: "o-1" } as E2eIamParityOwnerEntity },
	{ id: "b", isFeatured: false, label: "Beta", meta: { isLocked: true, note: null }, owner: { id: "o-2" } as E2eIamParityOwnerEntity },
	{ id: "c", isFeatured: true, label: "Gamma", meta: { isLocked: true, note: "n" }, owner: { id: "o-3" } as E2eIamParityOwnerEntity },
	{ id: "d", isFeatured: false, label: "Delta", meta: { isLocked: false, note: null }, owner: null },
	{ id: "e", isFeatured: true, label: "Epsilon", meta: { isLocked: false, note: "m" }, owner: { id: "o-2" } as E2eIamParityOwnerEntity },
	{ id: "f", isFeatured: false, label: "Zeta", meta: { isLocked: true, note: "n" }, owner: { id: "o-1" } as E2eIamParityOwnerEntity },
];

// One value per query path, keyed by its direct and its alias condition path: root, embedded, and relation columns.
const FIELD_VALUES: Array<[string, string, unknown]> = [
	["id", "id", "a"],
	["isFeatured", "featured", true],
	["meta.isLocked", "locked", "true"],
	["meta.note", "note", "n"],
	["owner.id", "ownerId", "${principal.attributes.ownerId}"],
	["owner.tag", "ownerTag", "${principal.attributes.tag}"],
	["owner.isActive", "active", "true"],
	["owner.company.name", "companyName", "acme"],
	["owner.company.isVerified", "verified", "false"],
];

const statement = (namespace: string, effect: EApiPolicyEffect, condition?: TCondition): IApiPolicyStatement => ({
	Action: [`${namespace}:*`],
	...(condition ? { Condition: condition } : {}),
	Effect: effect,
	Resource: [`${namespace}/*`],
});

const allowAll = (target: TTarget, ...conditions: Array<TCondition>): IPolicyCase => ({ namespace: TARGETS[target].namespace, statements: conditions.map((condition: TCondition): IApiPolicyStatement => statement(TARGETS[target].namespace, EApiPolicyEffect.ALLOW, condition)) });
const denyAll = (target: TTarget, ...conditions: Array<TCondition>): IPolicyCase => ({ namespace: TARGETS[target].namespace, statements: [statement(TARGETS[target].namespace, EApiPolicyEffect.ALLOW), ...conditions.map((condition: TCondition): IApiPolicyStatement => statement(TARGETS[target].namespace, EApiPolicyEffect.DENY, condition))] });
const key = (operator: string, field: string, value: unknown): TCondition => ({ [operator]: { [`resource.${field}`]: value } });

const OPERATOR_CASES: Array<[string, TTarget, IPolicyCase]> = FIELD_VALUES.flatMap(([directPath, aliasPath, value]: [string, string, unknown]): Array<[string, TTarget, IPolicyCase]> =>
	(
		[
			["direct", directPath],
			["alias", aliasPath],
		] as Array<[TTarget, string]>
	).flatMap(([target, field]: [TTarget, string]): Array<[string, TTarget, IPolicyCase]> => [
		[`Allow StringEquals ${field}`, target, allowAll(target, key("StringEquals", field, value))],
		[`Allow StringEqualsIfExists ${field}`, target, allowAll(target, key("StringEqualsIfExists", field, value))],
		[`Deny StringEquals ${field}`, target, denyAll(target, key("StringEquals", field, value))],
		[`Deny StringEqualsIfExists ${field}`, target, denyAll(target, key("StringEqualsIfExists", field, value))],
		[`Deny StringNotEquals ${field}`, target, denyAll(target, key("StringNotEquals", field, value))],
		[`Deny StringNotEqualsIfExists ${field}`, target, denyAll(target, key("StringNotEqualsIfExists", field, value))],
	]),
);

const COMBINED_CASES: Array<[string, TTarget, IPolicyCase]> = [
	["Allow two IfExists keys on different relations", "direct", allowAll("direct", { StringEqualsIfExists: { "resource.owner.company.name": "acme", "resource.owner.tag": "x" } })],
	["Allow a plain key and an IfExists key two relations away", "alias", allowAll("alias", { StringEquals: { "resource.active": "true" }, StringEqualsIfExists: { "resource.companyName": "acme" } })],
	["Allow an IfExists key on a relation primary key", "direct", allowAll("direct", key("StringEqualsIfExists", "owner.id", "o-2"))],
	["Allow two IfExists statements", "direct", allowAll("direct", key("StringEqualsIfExists", "owner.company.isVerified", "true"), key("StringEqualsIfExists", "owner.tag", "x"))],
	["Allow two keys on one query path with different values", "alias", allowAll("alias", { StringEquals: { "resource.ownerId": "o-2" }, StringEqualsIfExists: { "resource.ownerId": "o-1" } })],
	["Allow two keys on one query path with the same value", "direct", allowAll("direct", { StringEquals: { "resource.owner.tag": "x" }, StringEqualsIfExists: { "resource.owner.tag": "x" } })],
	["Allow an IfExists key next to a plain key on the relation primary key", "direct", allowAll("direct", { StringEquals: { "resource.owner.id": "o-1" }, StringEqualsIfExists: { "resource.owner.company.name": "acme" } })],
	["Allow an IfExists key on a relation column next to a plain key on its primary key", "direct", allowAll("direct", { StringEquals: { "resource.owner.id": "o-3" }, StringEqualsIfExists: { "resource.owner.tag": "x" } })],
	["Deny an IfExists key with a plain root key", "direct", denyAll("direct", { StringEquals: { "resource.isFeatured": "true" }, StringEqualsIfExists: { "resource.owner.tag": "x" } })],
	["Deny two statements on alias paths", "alias", denyAll("alias", key("StringEqualsIfExists", "verified", "true"), key("StringNotEqualsIfExists", "note", "n"))],
	["Deny an IfExists key two relations away under an Allow IfExists key", "alias", { namespace: "paritya:item", statements: [statement("paritya:item", EApiPolicyEffect.ALLOW, key("StringEqualsIfExists", "ownerTag", "x")), statement("paritya:item", EApiPolicyEffect.DENY, key("StringEqualsIfExists", "companyName", "acme"))] }],
];

const placeholderDeny = (namespace: string, resource: string): IPolicyCase => ({
	namespace,
	statements: [
		{ Action: [`${namespace}:*`], Effect: EApiPolicyEffect.ALLOW, Resource: [`${namespace}/*`] },
		{ Action: [`${namespace}:*`], Effect: EApiPolicyEffect.DENY, Resource: [resource] },
	],
});

describe.each<{ database: TDatabase; databaseName: string }>([
	{ database: "sqlite", databaseName: "SQLite" },
	{ database: "postgres", databaseName: "PostgreSQL" },
	{ database: "mysql", databaseName: "MySQL" },
])("IAM conditions on nested and aliased paths on $databaseName (E2E)", ({ database }: { database: TDatabase; databaseName: string }) => {
	let app: INestApplication | undefined;
	let fastify: { inject: (options: { method: string; payload?: Record<string, unknown>; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };
	let mysqlContainer: StartedMySqlContainer | undefined;
	let policy: IPolicyCase = { namespace: TARGETS.direct.namespace, statements: [] };
	let postgresContainer: StartedPostgreSqlContainer | undefined;
	let simulator: ApiAuthorizationSimulator;

	const repository = (): Repository<E2eIamParityItemEntity> => app!.get(E2eIamParityItemService).repository;

	const connection = (entities: Array<new () => unknown>): TypeOrmModuleOptions => {
		if (mysqlContainer) {
			return { database: mysqlContainer.getDatabase(), dropSchema: true, entities, host: mysqlContainer.getHost(), password: mysqlContainer.getUserPassword(), port: mysqlContainer.getPort(), synchronize: true, type: "mysql", username: mysqlContainer.getUsername() };
		}

		if (postgresContainer) {
			return { dropSchema: true, entities, synchronize: true, type: "postgres", url: postgresContainer.getConnectionUri() };
		}

		return { database: ":memory:", dropSchema: true, entities, synchronize: true, type: "better-sqlite3" };
	};

	// The rows the in-memory evaluator allows once each resource is loaded with every relation its query paths cross.
	const allowedInMemory = async (authorization: typeof E2E_IAM_PARITY_DIRECT_AUTHORIZATION): Promise<Array<string>> => {
		const allowed: Array<string> = [];

		for (const row of await repository().find({ relations: { owner: { company: true } } })) {
			const decision = await simulator.evaluate({ action: EApiRouteType.GET, authorization: authorization as never, entity: E2eIamParityItemEntity, principal: PRINCIPAL, resource: row, routeType: EApiRouteType.GET });

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
	const rowStatuses = async (url: string, row: E2eIamParityItemEntity): Promise<Record<string, number>> => {
		const get: number = (await fastify.inject({ method: "GET", url: `${url}/${row.id}` })).statusCode;
		const patch: number = (await fastify.inject({ method: "PATCH", payload: { label: row.label }, url: `${url}/${row.id}` })).statusCode;
		const put: number = (await fastify.inject({ method: "PUT", payload: { isFeatured: row.isFeatured, label: row.label }, url: `${url}/${row.id}` })).statusCode;
		const remove: number = (await fastify.inject({ method: "DELETE", url: `${url}/${row.id}` })).statusCode;

		return { DELETE: remove, GET: get, PATCH: patch, PUT: put };
	};

	beforeAll(async () => {
		if (database === "postgres") {
			postgresContainer = await new PostgreSqlContainer("postgres:17-alpine").start();
		}

		if (database === "mysql") {
			mysqlContainer = await new MySqlContainer("mysql:8.4").start();
		}

		const entities: Array<new () => unknown> = [E2eIamParityCompanyEntity, E2eIamParityOwnerEntity, E2eIamParityItemEntity];
		const moduleReference = await Test.createTestingModule({
			controllers: [E2eIamParityItemController, E2eIamParityAliasItemController, E2eIamParityAliasPlaceholderController, E2eIamParityDottedPlaceholderController],
			imports: [
				TypeOrmModule.forRoot(connection(entities)),
				TypeOrmModule.forFeature(entities),
				ApiAuthorizationModule.forRoot({
					iam: {
						attachmentSources: [{ getAttachments: async () => await Promise.resolve({ attachments: [{ policyId: "parity-policy", principalId: PRINCIPAL.id, principalType: EApiAuthorizationPrincipalType.USER }], boundaries: [] }) }],
						documentSources: [
							{
								getDocumentsByIds: async (ids: ReadonlyArray<string>): Promise<ReadonlyArray<IApiPolicyDocumentRecord>> => await Promise.resolve(ids.includes("parity-policy") ? [{ document: { Statement: policy.statements, Version: "2012-10-17" }, id: "parity-policy", namespace: policy.namespace, sourceType: EApiPolicySourceType.DATABASE, version: "1" }] : []),
							},
						],
					},
					principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) },
				} as never),
			],
			providers: [E2eIamParityItemService, E2eIamParityGuard],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		fastify = app.getHttpAdapter().getInstance();
		simulator = app.get(ApiAuthorizationSimulator);

		const dataSourceManager = repository().manager;

		await dataSourceManager.getRepository(E2eIamParityCompanyEntity).save(COMPANIES);
		await dataSourceManager.getRepository(E2eIamParityOwnerEntity).save(OWNERS);
	}, 300_000);

	beforeEach(async () => {
		await repository().delete(ITEM_ROWS.map((row: E2eIamParityItemEntity): string => row.id));
		await repository().save(ITEM_ROWS);
	});

	afterAll(async () => {
		await app?.close();
		await postgresContainer?.stop();
		await mysqlContainer?.stop();
	});

	it.each([...OPERATOR_CASES, ...COMBINED_CASES])("keeps the rows the in-memory evaluator allows on every route for %s (%s paths)", async (_name: string, target: TTarget, policyCase: IPolicyCase) => {
		policy = policyCase;

		const allowed: Array<string> = await allowedInMemory(TARGETS[target].authorization);

		expect(await listIds(TARGETS[target].url)).toEqual({ ids: allowed, statusCode: HttpStatus.OK });

		for (const row of ITEM_ROWS) {
			const statuses: Record<string, number> = await rowStatuses(TARGETS[target].url, row);

			for (const [method, statusCode] of Object.entries(statuses)) {
				expect({ method, row: row.id, status: statusCode < 300 ? "served" : statusCode }).toEqual({ method, row: row.id, status: allowed.includes(row.id) ? "served" : HttpStatus.NOT_FOUND });
			}
		}
	});

	// The evaluator's own answers: a missing relation is a missing key at any depth, and an alias reads its query path.
	it.each<[string, TTarget, IPolicyCase, Array<string>]>([
		["an Allow IfExists key on a missing company or owner", "direct", allowAll("direct", key("StringEqualsIfExists", "owner.company.name", "acme")), ["a", "c", "d", "f"]],
		["a Deny IfExists key on a missing company or owner", "direct", denyAll("direct", key("StringEqualsIfExists", "owner.company.isVerified", "false")), ["a", "f"]],
		["a Deny IfExists key on a missing owner", "alias", denyAll("alias", key("StringEqualsIfExists", "ownerTag", "x")), ["b", "e"]],
		["an Allow key on an alias", "alias", allowAll("alias", key("StringEquals", "ownerId", "o-1")), ["a", "f"]],
		["a Deny key on an alias of an embedded column", "alias", denyAll("alias", key("StringEquals", "locked", "true")), ["a", "d", "e"]],
	])("allows the expected rows in memory for %s", async (_name: string, target: TTarget, policyCase: IPolicyCase, expected: Array<string>) => {
		policy = policyCase;

		expect(await allowedInMemory(TARGETS[target].authorization)).toEqual(expected);
	});

	it.each([
		["the alias placeholder {ownerTag}", "parityap:item", ALIAS_PLACEHOLDER_ITEMS, E2E_IAM_PARITY_ALIAS_PLACEHOLDER_AUTHORIZATION],
		["the dotted placeholder {owner.tag}", "paritydp:item", DOTTED_PLACEHOLDER_ITEMS, E2E_IAM_PARITY_DOTTED_PLACEHOLDER_AUTHORIZATION],
	])("keeps the rows the in-memory evaluator allows for a list Deny on %s", async (_name: string, namespace: string, url: string, authorization: typeof E2E_IAM_PARITY_DIRECT_AUTHORIZATION) => {
		policy = placeholderDeny(namespace, `${namespace}/x`);

		expect(await allowedInMemory(authorization)).toEqual(["b", "d", "e"]);
		expect(await listIds(url)).toEqual({ ids: ["b", "d", "e"], statusCode: HttpStatus.OK });
	});
});
