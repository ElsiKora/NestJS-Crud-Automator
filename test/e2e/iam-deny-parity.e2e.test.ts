import "reflect-metadata";

import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { IApiAuthorizationPrincipal, IApiPolicyAttachmentSource, IApiPolicyDocumentRecord, IApiPolicyDocumentSource, IApiPolicyStatement } from "../../src/index";

import { Test } from "@nestjs/testing";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Column, DataSource, Entity, PrimaryColumn } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiAuthorizationSimulator, ApiPropertyDescribe, EApiAuthorizationDecisionType, EApiAuthorizationMode, EApiAuthorizationPrincipalType, EApiPolicyEffect, EApiPolicySourceType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

@Entity("iam_parity_items")
class IamParityItemEntity {
	@PrimaryColumn({ type: "text" })
	@ApiPropertyDescribe({
		description: "id",
		exampleValue: "abc-1",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public id!: string;

	@Column({ nullable: true, type: "text" })
	public status!: null | string;
}

@Entity("iam_parity_tenant_items")
class IamParityTenantItemEntity {
	@PrimaryColumn({ type: "text" })
	public id!: string;

	@Column({ nullable: true, type: "text" })
	@ApiPropertyDescribe({
		description: "tenantId",
		exampleValue: "t-1",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public tenantId!: null | string;
}

const parityTenantAuthorization = {
	defaultMode: EApiAuthorizationMode.IAM,
	policyNamespace: "parity:item",
	resourceDefinition: {
		entity: IamParityTenantItemEntity,
		fields: [
			{ isFilterable: true, path: "resource.id", queryPath: "id" },
			{ isFilterable: true, path: "resource.tenantId", queryPath: "tenantId" },
		],
		namespace: "parity:item",
		resourcePath: "parity:tenant/{tenantId}/item/{id}",
		resourceType: "parity:tenant-item",
	},
};

const parityTenantRows: Array<IamParityTenantItemEntity> = [
	{ id: "t1-a", tenantId: "t-1" },
	{ id: "t1-b", tenantId: "t-1" },
	{ id: "null-a", tenantId: null },
	{ id: "t2-a", tenantId: "t-2" },
];

const tenantCases: Array<[string, Array<string>]> = [
	["an exact pattern", ["parity:tenant/t-1/item/t1-a"]],
	["an exact pattern naming the id of a row with a NULL placeholder", ["parity:tenant/t-1/item/null-a"]],
	["a prefix pattern on the nullable placeholder", ["parity:tenant/t-1*"]],
];

const parityAuthorization = {
	defaultMode: EApiAuthorizationMode.IAM,
	policyNamespace: "parity:item",
	resourceDefinition: {
		entity: IamParityItemEntity,
		fields: [
			{ isFilterable: true, path: "resource.id", queryPath: "id" },
			{ isFilterable: true, path: "resource.status", queryPath: "status" },
		],
		namespace: "parity:item",
		resourcePath: "parity:item/{id}",
		resourceType: "parity:item",
	},
};

const parityPrincipal: IApiAuthorizationPrincipal = {
	attributes: { emptyValue: "", nullValue: null, status: "archived" },
	id: "user-1",
	roles: [],
	type: EApiAuthorizationPrincipalType.USER,
};

const parityRows: Array<IamParityItemEntity> = [
	{ id: "abc-1", status: "archived" },
	{ id: "abc_2", status: "active" },
	{ id: "abd-3", status: null },
	{ id: "ab%c-4", status: "" },
	{ id: "zz-5", status: "archived" },
	{ id: "zz-6", status: null },
];

const allowList: IApiPolicyStatement = {
	Action: ["parity:item:list"],
	Effect: EApiPolicyEffect.ALLOW,
	Resource: ["parity:item/*"],
};

const denyList = (statement: Partial<IApiPolicyStatement>): IApiPolicyStatement => ({
	Action: ["parity:item:list"],
	Effect: EApiPolicyEffect.DENY,
	Resource: ["parity:item/*"],
	...statement,
});

const operators: Array<string> = ["StringEquals", "StringEqualsIfExists", "StringNotEquals", "StringNotEqualsIfExists"];

const compilableCases: Array<[string, IApiPolicyStatement]> = [
	...operators.map((operator: string): [string, IApiPolicyStatement] => [`${operator} literal`, denyList({ Condition: { [operator]: { "resource.status": "archived" } } })]),
	...operators.map((operator: string): [string, IApiPolicyStatement] => [`${operator} variable`, denyList({ Condition: { [operator]: { "resource.status": "${principal.attributes.status}" } } })]),
	["exact row pattern", denyList({ Resource: ["parity:item/abc-1"] })],
	["prefix row pattern", denyList({ Resource: ["parity:item/abc*"] })],
	["prefix row pattern with an escaped underscore", denyList({ Resource: ["parity:item/abc_*"] })],
	["prefix row pattern with an escaped percent sign", denyList({ Resource: ["parity:item/ab%*"] })],
	["row pattern without matching rows", denyList({ Resource: ["parity:item/missing"] })],
	["prefix row pattern combined with a resource key", denyList({ Condition: { StringNotEquals: { "resource.status": "active" } }, Resource: ["parity:item/abc*"] })],
	["two Deny statements", denyList({ Condition: { StringEquals: { "resource.status": "archived" } } })],
];

const failClosedCases: Array<[string, IApiPolicyStatement]> = [
	["an empty literal", denyList({ Condition: { StringEquals: { "resource.status": "" } } })],
	["a variable resolving to an empty string", denyList({ Condition: { StringNotEquals: { "resource.status": "${principal.attributes.emptyValue}" } } })],
	["a variable resolving to null", denyList({ Condition: { StringEqualsIfExists: { "resource.status": "${principal.attributes.nullValue}" } } })],
];

describe.each([
	{ databaseName: "SQLite", isPostgres: false },
	{ databaseName: "PostgreSQL", isPostgres: true },
])("IAM Deny scope parity with in-memory evaluation on $databaseName (E2E)", ({ isPostgres }: { databaseName: string; isPostgres: boolean }) => {
	let container: StartedPostgreSqlContainer | undefined;
	let dataSource: DataSource;
	let simulator: ApiAuthorizationSimulator;
	let statements: Array<IApiPolicyStatement> = [];

	const attachmentSource: IApiPolicyAttachmentSource = {
		async getAttachments() {
			return {
				attachments: [{ policyId: "parity-policy", principalId: parityPrincipal.id, principalType: EApiAuthorizationPrincipalType.USER }],
				boundaries: [],
			};
		},
	};

	const documentSource: IApiPolicyDocumentSource = {
		async getDocumentsByIds(ids: ReadonlyArray<string>): Promise<ReadonlyArray<IApiPolicyDocumentRecord>> {
			return ids.includes("parity-policy") ? [{ document: { Statement: statements, Version: "2012-10-17" }, id: "parity-policy", namespace: "parity:item", sourceType: EApiPolicySourceType.MANAGED, version: "1" }] : [];
		},
	};

	async function evaluateList(resource?: IamParityItemEntity) {
		return await simulator.evaluate({
			action: EApiRouteType.GET_LIST,
			authorization: parityAuthorization,
			entity: IamParityItemEntity,
			principal: parityPrincipal,
			resource,
			routeType: EApiRouteType.GET_LIST,
		});
	}

	async function resolveKeptTenantIds(policyStatements: Array<IApiPolicyStatement>): Promise<{ inMemory: Array<string>; isDenied: boolean; sql: Array<string> }> {
		statements = policyStatements;

		const evaluateTenantList = async (resource?: IamParityTenantItemEntity) =>
			await simulator.evaluate({
				action: EApiRouteType.GET_LIST,
				authorization: parityTenantAuthorization,
				entity: IamParityTenantItemEntity,
				principal: parityPrincipal,
				resource,
				routeType: EApiRouteType.GET_LIST,
			});

		const decision = await evaluateTenantList();
		const sqlRows: Array<IamParityTenantItemEntity> = decision.effect === EApiPolicyEffect.ALLOW ? await dataSource.getRepository(IamParityTenantItemEntity).find({ where: decision.scope?.where }) : [];
		const inMemory: Array<string> = [];

		for (const row of await dataSource.getRepository(IamParityTenantItemEntity).find()) {
			if ((await evaluateTenantList(row)).effect === EApiPolicyEffect.ALLOW) {
				inMemory.push(row.id);
			}
		}

		return {
			inMemory: inMemory.sort(),
			isDenied: decision.trace.decisionType === EApiAuthorizationDecisionType.EXPLICIT_DENY,
			sql: sqlRows.map((row: IamParityTenantItemEntity): string => row.id).sort(),
		};
	}

	async function resolveKeptIds(policyStatements: Array<IApiPolicyStatement>): Promise<{ inMemory: Array<string>; isDenied: boolean; sql: Array<string> }> {
		statements = policyStatements;

		const decision = await evaluateList();
		const sqlRows: Array<IamParityItemEntity> = decision.effect === EApiPolicyEffect.ALLOW ? await dataSource.getRepository(IamParityItemEntity).find({ where: decision.scope?.where }) : [];
		const inMemory: Array<string> = [];

		for (const row of await dataSource.getRepository(IamParityItemEntity).find()) {
			if ((await evaluateList(row)).effect === EApiPolicyEffect.ALLOW) {
				inMemory.push(row.id);
			}
		}

		return {
			inMemory: inMemory.sort(),
			isDenied: decision.trace.decisionType === EApiAuthorizationDecisionType.EXPLICIT_DENY,
			sql: sqlRows.map((row: IamParityItemEntity): string => row.id).sort(),
		};
	}

	beforeAll(async () => {
		if (isPostgres) {
			container = await new PostgreSqlContainer("postgres:17-alpine").start();
		}

		dataSource = new DataSource(container ? { dropSchema: true, entities: [IamParityItemEntity, IamParityTenantItemEntity], synchronize: true, type: "postgres", url: container.getConnectionUri() } : { database: ":memory:", dropSchema: true, entities: [IamParityItemEntity, IamParityTenantItemEntity], synchronize: true, type: "sqlite" });
		await dataSource.initialize();
		await dataSource.getRepository(IamParityItemEntity).save(parityRows);
		await dataSource.getRepository(IamParityTenantItemEntity).save(parityTenantRows);

		const moduleRef = await Test.createTestingModule({
			imports: [
				ApiAuthorizationModule.forRoot({
					iam: {
						attachmentSources: [attachmentSource],
						documentSources: [documentSource],
					},
				}),
			],
		}).compile();

		simulator = moduleRef.get(ApiAuthorizationSimulator);
	}, 120_000);

	afterAll(async () => {
		await dataSource?.destroy();
		await container?.stop();
	});

	it.each(compilableCases)("keeps the same rows in SQL and in memory for %s", async (name: string, deny: IApiPolicyStatement) => {
		const policyStatements: Array<IApiPolicyStatement> = name === "two Deny statements" ? [allowList, deny, denyList({ Resource: ["parity:item/zz-6"] })] : [allowList, deny];
		const keptIds: { inMemory: Array<string>; isDenied: boolean; sql: Array<string> } = await resolveKeptIds(policyStatements);

		expect(keptIds.isDenied).toBe(false);
		expect(keptIds.sql).toEqual(keptIds.inMemory);
		expect(keptIds.inMemory.length).toBeLessThan(parityRows.length + (name === "row pattern without matching rows" ? 1 : 0));
	});

	it.each(failClosedCases)("denies the whole list instead of compiling %s", async (_name: string, deny: IApiPolicyStatement) => {
		const keptIds: { inMemory: Array<string>; isDenied: boolean; sql: Array<string> } = await resolveKeptIds([allowList, deny]);

		expect(keptIds.isDenied).toBe(true);
		expect(keptIds.sql).toEqual([]);
		expect(keptIds.inMemory.length).toBeGreaterThan(0);
	});

	it.each(tenantCases)("keeps the same rows in SQL and in memory for %s over two placeholders", async (_name: string, resources: Array<string>) => {
		const keptIds: { inMemory: Array<string>; isDenied: boolean; sql: Array<string> } = await resolveKeptTenantIds([{ ...allowList, Resource: ["*"] }, denyList({ Resource: resources })]);

		expect(keptIds.isDenied).toBe(false);
		expect(keptIds.sql).toEqual(keptIds.inMemory);
		expect(keptIds.inMemory).toContain("null-a");
	});

	it(isPostgres ? "matches prefix exclusions case-sensitively" : "over-excludes prefix matches case-insensitively", async () => {
		await dataSource.getRepository(IamParityItemEntity).save({ id: "ABC-7", status: "active" });

		try {
			statements = [allowList, denyList({ Resource: ["parity:item/abc*"] })];

			const decision = await evaluateList();
			const sqlIds: Array<string> = (await dataSource.getRepository(IamParityItemEntity).find({ where: decision.scope?.where })).map((row: IamParityItemEntity): string => row.id);

			expect((await evaluateList({ id: "ABC-7", status: "active" })).effect).toBe(EApiPolicyEffect.ALLOW);
			expect(sqlIds.includes("ABC-7")).toBe(isPostgres);
		} finally {
			await dataSource.getRepository(IamParityItemEntity).delete({ id: "ABC-7" });
		}
	});
});
