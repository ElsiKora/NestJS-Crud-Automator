import type { IApiAuthorizationIamDialect, IApiAuthorizationPrincipal, IApiAuthorizationRequestMetadata, IApiAuthorizationResourceDefinition, IApiPolicyStatement } from "@interface/class/api/authorization";
import type { FindOperator } from "typeorm";

import { ApiAuthorizationIamEngine, ApiAuthorizationIamQueryPlanner } from "@class/api/authorization/iam";
import { AUTHORIZATION_IAM_SCOPE_CONSTANT } from "@constant/class/authorization";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiAuthorizationDecisionType, EApiAuthorizationIamDialect, EApiAuthorizationPrincipalType, EApiPolicyEffect, EApiPolicySourceType } from "@enum/class/authorization";
import { EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { beforeAll, describe, expect, it } from "vitest";
import { And, Column, DataSource, Entity, Equal, In, IsNull, ManyToOne, Not, OneToMany, PrimaryColumn } from "typeorm";

const describeEngineStringProperty = (description: string): PropertyDecorator =>
	ApiPropertyDescribe({
		description,
		exampleValue: "value",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	});

@Entity("engine_items")
class EngineItemEntity {
	@PrimaryColumn({ type: "varchar" })
	@describeEngineStringProperty("id")
	public id!: string;

	@OneToMany(() => EngineNoteEntity, (note: EngineNoteEntity) => note.item)
	public notes?: Array<EngineNoteEntity>;

	@Column({ type: "varchar" })
	public operatorId!: string;

	@Column({ nullable: true, type: "int" })
	public rank?: null | number;

	@Column({ type: "varchar" })
	public secret!: string;

	@Column({ type: "varchar" })
	public status!: string;

	@Column({ type: "varchar" })
	@describeEngineStringProperty("tenantId")
	public tenantId!: string;
}

@Entity("engine_notes")
class EngineNoteEntity {
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@ManyToOne(() => EngineItemEntity, (item: EngineItemEntity) => item.notes)
	public item!: EngineItemEntity;

	@Column({ type: "varchar" })
	public text!: string;
}

@Entity("engine_devices")
class EngineDeviceEntity {
	@PrimaryColumn({ type: "uuid" })
	public id!: string;

	@Column({ enum: ["alpha", "beta"], nullable: true, type: "enum" })
	public kind?: null | string;

	@Column({ nullable: true, type: "uuid" })
	public operatorId?: null | string;
}

const DEVICE_ID: string = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const OPERATOR_ID: string = "0b6f1c1e-7d2a-4c8e-9a51-3f4e2d1c0b9a";

const deviceResourceDefinition: IApiAuthorizationResourceDefinition<EngineDeviceEntity> = {
	entity: EngineDeviceEntity,
	fields: [
		{ isFilterable: true, path: "resource.id", queryPath: "id" },
		{ isFilterable: true, path: "resource.kind", queryPath: "kind" },
		{ isFilterable: true, path: "resource.operatorId", queryPath: "operatorId" },
	],
	namespace: "admin:item",
	resourcePath: "gameport:admin:item/{id}",
	resourceType: "gameport:admin:item",
};

const itemResourceDefinition: IApiAuthorizationResourceDefinition<EngineItemEntity> = {
	entity: EngineItemEntity,
	fields: [
		{ isFilterable: true, path: "resource.id", queryPath: "id" },
		{ isFilterable: true, path: "resource.operatorId", queryPath: "operatorId" },
		{ isFilterable: true, path: "resource.status", queryPath: "status" },
		{ isFilterable: false, path: "resource.secret", queryPath: "secret" },
		{ isFilterable: true, path: "resource.rank", queryPath: "rank" },
	],
	namespace: "admin:item",
	resourcePath: "gameport:admin:item/{id}",
	resourceType: "gameport:admin:item",
};

const principal: IApiAuthorizationPrincipal = {
	attributes: { operatorId: "operator-1" },
	id: "user-1",
	roles: [],
	type: EApiAuthorizationPrincipalType.USER,
};

const allowOwnOperator: IApiPolicyStatement = {
	Action: ["admin:item:*"],
	Condition: { StringEquals: { "resource.operatorId": "${principal.attributes.operatorId}" } },
	Effect: EApiPolicyEffect.ALLOW,
	Resource: ["gameport:admin:item/*"],
};

const allowAll: IApiPolicyStatement = {
	Action: ["admin:item:*"],
	Effect: EApiPolicyEffect.ALLOW,
	Resource: ["gameport:admin:item/*"],
};

const deny = (statement: Partial<IApiPolicyStatement>): IApiPolicyStatement => ({
	Action: ["admin:item:*"],
	Effect: EApiPolicyEffect.DENY,
	Resource: ["gameport:admin:item/*"],
	...statement,
});

const evaluate = async (options: { action?: string; boundaryStatements?: ReadonlyArray<IApiPolicyStatement>; principal?: IApiAuthorizationPrincipal; requestMetadata?: IApiAuthorizationRequestMetadata<EngineItemEntity>; resource?: EngineItemEntity; resourceDefinition?: IApiAuthorizationResourceDefinition<EngineItemEntity>; routeType?: EApiRouteType; statements: ReadonlyArray<IApiPolicyStatement>; dialect?: IApiAuthorizationIamDialect }) => {
	const documents = [{ document: { Statement: options.statements, Version: "2012-10-17" }, id: "identity", namespace: "admin:item", sourceType: EApiPolicySourceType.MANAGED, version: "1" }, ...(options.boundaryStatements ? [{ document: { Statement: options.boundaryStatements, Version: "2012-10-17" }, id: "boundary", namespace: "admin:item", sourceType: EApiPolicySourceType.MANAGED, version: "1" }] : [])];

	return await new ApiAuthorizationIamEngine(new ApiAuthorizationIamQueryPlanner()).evaluate<EngineItemEntity>({
		action: options.action ?? "admin:item:list",
		attachments: {
			attachments: [{ policyId: "identity", principalId: principal.id, principalType: principal.type }],
			boundaries: options.boundaryStatements ? [{ policyId: "boundary", principalId: principal.id, principalType: principal.type }] : [],
		},
		dialect: options.dialect ?? { driverType: "postgres", type: EApiAuthorizationIamDialect.POSTGRES },
		documents,
		policyNamespace: "admin:item",
		principal: options.principal ?? principal,
		requestMetadata: options.requestMetadata ?? {},
		resource: options.resource,
		resourceDefinition: options.resourceDefinition ?? itemResourceDefinition,
		routeType: options.routeType === undefined && options.action === undefined ? EApiRouteType.GET_LIST : options.routeType,
	});
};

describe("ApiAuthorizationIamEngine", () => {
	describe("resource-conditioned Deny without a loaded resource", () => {
		it("turns a compilable Deny into a row exclusion ANDed with the Allow scope", async () => {
			const decision = await evaluate({ statements: [allowOwnOperator, deny({ Condition: { StringEquals: { "resource.status": "archived" } } })] });

			expect(decision.effect).toBe(EApiPolicyEffect.ALLOW);
			expect(decision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_ALLOW);
			expect(decision.scope).toEqual({
				where: [
					{ operatorId: Equal("operator-1"), status: Not(Equal("archived")) },
					{ operatorId: Equal("operator-1"), status: IsNull() },
				],
			});
			expect(decision.trace.statements?.map((trace) => trace.isMatched)).toEqual([true, true]);
		});

		it("returns the exclusion alone under an unrestricted Allow", async () => {
			const decision = await evaluate({ statements: [allowAll, deny({ Condition: { StringNotEqualsIfExists: { "resource.status": "active" } } })] });

			expect(decision.scope).toEqual({ where: { status: Equal("active") } });
		});

		it("applies the exclusion to row routes and custom routes", async () => {
			const readDecision = await evaluate({ requestMetadata: { parameters: { id: "item-1" } }, routeType: EApiRouteType.GET, action: "admin:item:read", statements: [allowAll, deny({ Condition: { StringEquals: { "resource.status": "archived" } } })] });
			const customDecision = await evaluate({ action: "admin:item:export", statements: [allowAll, deny({ Condition: { StringEqualsIfExists: { "resource.status": "archived" } } })] });

			expect(readDecision.effect).toBe(EApiPolicyEffect.ALLOW);
			expect(readDecision.scope).toEqual({ where: [{ status: Not(Equal("archived")) }, { status: IsNull() }] });
			expect(customDecision.effect).toBe(EApiPolicyEffect.ALLOW);
			expect(customDecision.scope).toEqual({ where: [{ status: Not(Equal("archived")) }, { status: IsNull() }] });
		});

		it("ANDs several Deny statements, including boundary Denies", async () => {
			const decision = await evaluate({
				boundaryStatements: [allowAll, deny({ Condition: { StringNotEqualsIfExists: { "resource.operatorId": "operator-1" } } })],
				statements: [allowAll, deny({ Condition: { StringNotEquals: { "resource.status": "active" } } })],
			});

			expect(decision.scope).toEqual({ where: { operatorId: Equal("operator-1"), status: Equal("active") } });
		});

		it("denies the whole request once the merged scope exceeds the where-branch cap", async () => {
			const allowBranches: Array<IApiPolicyStatement> = Array.from({ length: AUTHORIZATION_IAM_SCOPE_CONSTANT.MAX_WHERE_BRANCHES / 2 + 1 }, (_value: unknown, index: number) => ({ ...allowAll, Condition: { StringEquals: { "resource.operatorId": `operator-${index}` } } }));
			const allowOnlyDecision = await evaluate({ statements: allowBranches });
			const cappedDecision = await evaluate({ statements: [...allowBranches, deny({ Condition: { StringEquals: { "resource.status": "archived" } } })] });

			expect(allowOnlyDecision.effect).toBe(EApiPolicyEffect.ALLOW);
			expect(cappedDecision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
			expect(cappedDecision.scope).toBeUndefined();
		});

		it("compiles only the resource keys once the non-resource keys hold", async () => {
			const statement = deny({ Condition: { StringEquals: { "principal.id": "user-1", "resource.status": "archived" } } });
			const otherPrincipalStatement = deny({ Condition: { StringEquals: { "principal.id": "user-2", "resource.status": "archived" } } });

			expect((await evaluate({ statements: [allowAll, statement] })).scope).toEqual({ where: [{ status: Not(Equal("archived")) }, { status: IsNull() }] });
			expect((await evaluate({ statements: [allowAll, otherPrincipalStatement] })).scope).toBeUndefined();
		});

		it.each([
			["a non-filterable field", { StringEquals: { "resource.secret": "value" } }],
			["an unresolved variable", { StringEquals: { "resource.status": "${principal.attributes.missing}" } }],
			["an empty string", { StringNotEquals: { "resource.status": "" } }],
		])("denies the whole request for a non-compilable Deny with %s", async (_name: string, condition: Record<string, Record<string, unknown>>) => {
			const decision = await evaluate({ statements: [allowAll, deny({ Condition: condition })] });

			expect(decision.effect).toBe(EApiPolicyEffect.DENY);
			expect(decision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
			expect(decision.scope).toBeUndefined();
		});

		it("keeps a resource-conditioned Deny a whole-request deny on CREATE", async () => {
			const decision = await evaluate({ action: "admin:item:create", routeType: EApiRouteType.CREATE, statements: [allowAll, deny({ Condition: { StringEquals: { "resource.status": "archived" } } })] });

			expect(decision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
		});

		it("treats a custom create action like CREATE", async () => {
			const decision = await evaluate({ action: "admin:item:create", statements: [allowAll, deny({ Condition: { StringEquals: { "resource.status": "archived" } } })] });

			expect(decision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
		});

		it.each([
			["a qualifier on a key that holds one value", { "ForAnyValue:StringEquals": { "principal.id": "a" } }, "iamPolicyConditionQualifierUnsupported"],
			["an unknown operator", { StringMatches: { "principal.id": "other" } }, "iamPolicyConditionOperatorUnknown"],
			["an unknown key", { StringEquals: { "user.id": "other" } }, "iamPolicyConditionKeyUnknown"],
			["a whole-resource variable", { StringEquals: { "principal.attributes.missing": "${resource}" } }, "iamPolicyVariableUnknown"],
			["a client-controlled variable", { StringEquals: { "resource.status": "${request.body.status}" } }, "iamPolicyVariableNotAllowed"],
		])("refuses to evaluate a statement with %s that bypassed document validation", async (_name: string, condition: Record<string, Record<string, unknown>>, code: string) => {
			await expect(evaluate({ statements: [allowAll, deny({ Condition: condition })] })).rejects.toThrow(code);
			await expect(evaluate({ statements: [{ ...allowAll, Condition: condition }] })).rejects.toThrow(code);
		});

		it("denies the whole request for a Deny without resource keys", async () => {
			const decision = await evaluate({ statements: [allowAll, deny({ Condition: { StringEquals: { "principal.id": "user-1" } } })] });

			expect(decision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
		});
	});

	describe("resource variable without a loaded resource", () => {
		const rowRequests: Array<[string, { action: string; requestMetadata?: IApiAuthorizationRequestMetadata<EngineItemEntity>; routeType?: EApiRouteType }]> = [
			["a list", { action: "admin:item:list", routeType: EApiRouteType.GET_LIST }],
			["a read", { action: "admin:item:read", requestMetadata: { parameters: { id: "item-1" } }, routeType: EApiRouteType.GET }],
			["a partial update", { action: "admin:item:update", requestMetadata: { parameters: { id: "item-1" } }, routeType: EApiRouteType.PARTIAL_UPDATE }],
			["a delete", { action: "admin:item:delete", requestMetadata: { parameters: { id: "item-1" } }, routeType: EApiRouteType.DELETE }],
			["a custom route", { action: "admin:item:custom.report", routeType: undefined }],
		];

		const allowConditions: Array<[string, Record<string, Record<string, unknown>>]> = [
			["a StringEquals principal key", { StringEquals: { "principal.attributes.missing": "${resource.tenantId}" } }],
			["a StringEqualsIfExists principal key", { StringEqualsIfExists: { "principal.attributes.operatorId": "${resource.operatorId}" } }],
			["a StringNotEquals principal key", { StringNotEquals: { "principal.attributes.operatorId": "${resource.tenantId}" } }],
			["a StringNotEqualsIfExists principal key", { StringNotEqualsIfExists: { "principal.attributes.operatorId": "${resource.tenantId}" } }],
			["a StringEquals request key", { StringEquals: { "request.headers.x-tenant-id": "${resource.tenantId}" } }],
		];

		const denyConditions: Array<[string, Record<string, Record<string, unknown>>]> = [
			["a StringEquals principal key", { StringEquals: { "principal.attributes.operatorId": "${resource.operatorId}" } }],
			["a StringNotEquals principal key", { StringNotEquals: { "principal.attributes.operatorId": "${resource.operatorId}" } }],
			["a StringEquals request key", { StringEquals: { "request.headers.x-tenant-id": "${resource.tenantId}" } }],
		];

		it.each(rowRequests.flatMap(([requestName, request]) => allowConditions.map(([conditionName, condition]): [string, string, typeof request, typeof condition] => [conditionName, requestName, request, condition])))("leaves an Allow with %s unmatched on %s", async (_conditionName, _requestName, request, condition) => {
			const decision = await evaluate({ ...request, statements: [{ ...allowAll, Condition: condition }] });

			expect(decision.effect).toBe(EApiPolicyEffect.DENY);
			expect(decision.trace.decisionType).toBe(EApiAuthorizationDecisionType.IMPLICIT_DENY);
			expect(decision.trace.statements?.[0]?.isMatched).toBe(false);
		});

		it.each(rowRequests.flatMap(([requestName, request]) => denyConditions.map(([conditionName, condition]): [string, string, typeof request, typeof condition] => [conditionName, requestName, request, condition])))("holds a Deny with %s on %s", async (_conditionName, _requestName, request, condition) => {
			const decision = await evaluate({ ...request, statements: [allowAll, deny({ Condition: condition })] });

			expect(decision.effect).toBe(EApiPolicyEffect.DENY);
			expect(decision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
		});

		it("keeps the Allow scope of a resource key next to a Deny whose resource variable has no resource to read", async () => {
			const decision = await evaluate({ statements: [allowOwnOperator, deny({ Condition: { StringEquals: { "principal.attributes.operatorId": "${resource.operatorId}", "resource.status": "archived" } } })] });

			expect(decision.effect).toBe(EApiPolicyEffect.ALLOW);
			expect(decision.scope).toEqual({
				where: [
					{ operatorId: Equal("operator-1"), status: Not(Equal("archived")) },
					{ operatorId: Equal("operator-1"), status: IsNull() },
				],
			});
		});

		it.each([
			["an Allow", [{ ...allowAll, Condition: { StringEquals: { "resource.status": "${resource.operatorId}" } } }], EApiAuthorizationDecisionType.IMPLICIT_DENY],
			["a Deny", [allowAll, deny({ Condition: { StringNotEquals: { "resource.status": "${resource.operatorId}" } } })], EApiAuthorizationDecisionType.EXPLICIT_DENY],
		])("does not compile a resource key compared with a resource variable in %s", async (_name: string, statements: Array<IApiPolicyStatement>, decisionType: EApiAuthorizationDecisionType) => {
			const decision = await evaluate({ statements });

			expect(decision.effect).toBe(EApiPolicyEffect.DENY);
			expect(decision.trace.decisionType).toBe(decisionType);
		});

		it("keeps policies without a resource variable unchanged", async () => {
			const allowDecision = await evaluate({ statements: [{ ...allowAll, Condition: { StringEquals: { "principal.attributes.operatorId": "operator-1" } } }] });
			const denyDecision = await evaluate({ statements: [allowAll, deny({ Condition: { StringEquals: { "principal.attributes.operatorId": "other" } } })] });
			const scopeDecision = await evaluate({ statements: [allowOwnOperator] });

			expect(allowDecision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_ALLOW);
			expect(denyDecision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_ALLOW);
			expect(scopeDecision.scope).toEqual({ where: { operatorId: "operator-1" } });
		});

		it.each([
			["matches an Allow", [{ ...allowAll, Condition: { StringEquals: { "principal.attributes.operatorId": "${resource.operatorId}" } } }], "operator-1", EApiPolicyEffect.ALLOW],
			["leaves an Allow unmatched", [{ ...allowAll, Condition: { StringEquals: { "principal.attributes.operatorId": "${resource.operatorId}" } } }], "operator-2", EApiPolicyEffect.DENY],
			["holds a Deny", [allowAll, deny({ Condition: { StringEquals: { "principal.attributes.operatorId": "${resource.operatorId}" } } })], "operator-1", EApiPolicyEffect.DENY],
			["leaves a Deny unmatched", [allowAll, deny({ Condition: { StringEquals: { "principal.attributes.operatorId": "${resource.operatorId}" } } })], "operator-2", EApiPolicyEffect.ALLOW],
		])("reads the variable from a loaded resource and %s", async (_name: string, statements: Array<IApiPolicyStatement>, operatorId: string, effect: EApiPolicyEffect) => {
			const decision = await evaluate({ action: "admin:item:read", resource: { id: "item-1", operatorId, secret: "s", status: "active", tenantId: "t" }, routeType: EApiRouteType.GET, statements });

			expect(decision.effect).toBe(effect);
		});
	});

	describe("Allow compilation", () => {
		it.each(["StringNotEquals", "StringNotEqualsIfExists"])("compiles an Allow with a %s resource key to its rows, NULL among them", async (operator: string) => {
			const decision = await evaluate({ statements: [{ ...allowAll, Condition: { [operator]: { "resource.status": "archived" } } }] });

			expect(decision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_ALLOW);
			expect(decision.scope).toEqual({ where: [{ status: Not(Equal("archived")) }, { status: IsNull() }] });
		});

		it("leaves an Allow with an unresolved variable unmatched, where a missing value once compared as empty text", async () => {
			const decision = await evaluate({ statements: [{ ...allowAll, Condition: { StringEquals: { "principal.attributes.missing": "${principal.attributes.missing2}" } } }] });

			expect(decision.trace.decisionType).toBe(EApiAuthorizationDecisionType.IMPLICIT_DENY);
		});

		it("holds a Deny with an unresolved variable, which fails closed", async () => {
			const decision = await evaluate({ statements: [allowAll, deny({ Condition: { StringEquals: { "principal.attributes.operatorId": "${principal.attributes.missing}" } } })] });

			expect(decision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
		});

		it("takes the default of a variable that does not resolve", async () => {
			const decision = await evaluate({ statements: [allowAll, deny({ Condition: { StringEquals: { "principal.attributes.operatorId": "${principal.attributes.missing, 'nobody'}" } } })] });

			expect(decision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_ALLOW);
		});

		it("resolves a variable in a Resource pattern for each request, and an Allow whose variable is missing grants nothing", async () => {
			const statements: Array<IApiPolicyStatement> = [{ ...allowAll, Resource: ["gameport:admin:item/${principal.attributes.itemId}"] }];
			const read: { action: string; requestMetadata: IApiAuthorizationRequestMetadata<EngineItemEntity>; routeType: EApiRouteType } = { action: "admin:item:read", requestMetadata: { parameters: { id: "item-1" } }, routeType: EApiRouteType.GET };

			expect((await evaluate({ ...read, principal: { ...principal, attributes: { itemId: "item-1" } }, statements })).trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_ALLOW);
			expect((await evaluate({ ...read, principal: { ...principal, attributes: { itemId: "item-2" } }, statements })).trace.decisionType).toBe(EApiAuthorizationDecisionType.IMPLICIT_DENY);
			expect((await evaluate({ ...read, principal: { ...principal, attributes: {} }, statements })).trace.decisionType).toBe(EApiAuthorizationDecisionType.IMPLICIT_DENY);
		});

		it("denies the whole request for a Deny whose Resource variable is missing", async () => {
			const decision = await evaluate({ statements: [allowAll, deny({ Resource: ["gameport:admin:item/${principal.attributes.missing}"] })] });

			expect(decision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
		});

		it("reads a wildcard a variable holds as literal text", async () => {
			const statements: Array<IApiPolicyStatement> = [{ ...allowAll, Resource: ["gameport:admin:item/${principal.attributes.itemId}"] }];
			const decision = await evaluate({ action: "admin:item:read", principal: { ...principal, attributes: { itemId: "*" } }, requestMetadata: { parameters: { id: "item-1" } }, routeType: EApiRouteType.GET, statements });

			expect(decision.trace.decisionType).toBe(EApiAuthorizationDecisionType.IMPLICIT_DENY);
		});

		it("reads request.time and request.sourceIp as context keys", async () => {
			const requestMetadata: IApiAuthorizationRequestMetadata<EngineItemEntity> = { ip: "10.1.2.3", time: new Date("2024-06-01T00:00:00.000Z") };

			expect((await evaluate({ requestMetadata, statements: [{ ...allowAll, Condition: { DateLessThan: { "request.time": "2025-01-01T00:00:00Z" }, IpAddress: { "request.sourceIp": "10.0.0.0/8" } } }] })).effect).toBe(EApiPolicyEffect.ALLOW);
			expect((await evaluate({ requestMetadata, statements: [{ ...allowAll, Condition: { DateGreaterThan: { "request.time": "2025-01-01T00:00:00Z" } } }] })).effect).toBe(EApiPolicyEffect.DENY);
			expect((await evaluate({ requestMetadata, statements: [{ ...allowAll, Condition: { NotIpAddress: { "request.sourceIp": "10.0.0.0/8" } } }] })).effect).toBe(EApiPolicyEffect.DENY);
		});

		it("takes the time of the request when the caller gives none", async () => {
			const decision = await evaluate({ statements: [{ ...allowAll, Condition: { DateGreaterThan: { "request.time": "2000-01-01T00:00:00Z" } } }] });

			expect(decision.effect).toBe(EApiPolicyEffect.ALLOW);
		});
	});

	describe("loaded resource", () => {
		it.each([
			["StringEquals", "archived", true],
			["StringEquals", "active", false],
			["StringEqualsIfExists", "archived", true],
			["StringNotEquals", "archived", true],
			["StringNotEquals", "active", false],
			["StringNotEqualsIfExists", "archived", true],
		])("evaluates a Deny %s against status %s in memory", async (operator: string, status: string, isDenied: boolean) => {
			const decision = await evaluate({
				action: "admin:item:read",
				resource: { id: "item-1", operatorId: "operator-1", secret: "s", status, tenantId: "t" },
				routeType: EApiRouteType.GET,
				statements: [allowAll, deny({ Condition: { [operator]: { "resource.status": operator.startsWith("StringNot") ? "active" : "archived" } } })],
			});

			expect(decision.effect).toBe(isDenied ? EApiPolicyEffect.DENY : EApiPolicyEffect.ALLOW);
		});

		it("reads a list of one value as that value", async () => {
			const options = { action: "admin:item:read", resource: { id: "item-1", operatorId: "operator-1", secret: "s", status: "archived", tenantId: "t" }, routeType: EApiRouteType.GET };
			const denyDecision = await evaluate({ ...options, statements: [allowAll, deny({ Condition: { StringNotEquals: { "resource.status": ["archived"] } } })] });
			const allowDecision = await evaluate({ ...options, statements: [{ ...allowAll, Condition: { StringEquals: { "resource.status": ["archived"] } } }] });

			expect(denyDecision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_ALLOW);
			expect(allowDecision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_ALLOW);
		});

		it.each([
			["an object", { value: "archived" }, "iamPolicyConditionValueInvalid"],
			["null", null, "iamPolicyConditionValueInvalid"],
		])("refuses to evaluate %s as an operand", async (_name: string, operand: unknown, code: string) => {
			const options = { action: "admin:item:read", resource: { id: "item-1", operatorId: "operator-1", secret: "s", status: "archived", tenantId: "t" }, routeType: EApiRouteType.GET };

			await expect(evaluate({ ...options, statements: [allowAll, deny({ Condition: { StringNotEquals: { "resource.status": operand } } })] })).rejects.toThrow(code);
			await expect(evaluate({ ...options, statements: [{ ...allowAll, Condition: { StringEquals: { "resource.status": operand } } }] })).rejects.toThrow(code);
		});
	});

	describe("loaded resource read through query paths", () => {
		const aliasResourceDefinition: IApiAuthorizationResourceDefinition<EngineItemEntity> = {
			...itemResourceDefinition,
			fields: [
				{ isFilterable: true, path: "resource.id", queryPath: "id" },
				{ isFilterable: true, path: "resource.state", queryPath: "status" },
				{ isFilterable: true, path: "resource.ownerName", queryPath: "owner.name" },
				{ isFilterable: true, path: "resource.noteText", queryPath: "notes.text" },
			],
			resourcePath: "gameport:admin:item/{state}",
		};
		const resource = { id: "item-1", notes: [{ text: "x" }], operatorId: "operator-1", owner: { name: "ann" }, secret: "s", status: "archived", tenantId: "t" } as unknown as EngineItemEntity;
		const read = async (statements: ReadonlyArray<IApiPolicyStatement>, loadedResource: EngineItemEntity = resource) => await evaluate({ action: "admin:item:read", resource: loadedResource, resourceDefinition: aliasResourceDefinition, routeType: EApiRouteType.GET, statements });

		it("reads an alias of a root column through its query path", async () => {
			expect((await read([{ ...allowAll, Condition: { StringEquals: { "resource.state": "archived" } } }])).effect).toBe(EApiPolicyEffect.ALLOW);
			expect((await read([allowAll, deny({ Condition: { StringEquals: { "resource.state": "archived" } } })])).effect).toBe(EApiPolicyEffect.DENY);
		});

		// The fixture entity maps no owner relation, so only a Deny, which is not planned for a loaded resource, reads the nested path here.
		it("reads a nested query path through the loaded relation", async () => {
			expect((await read([allowAll, deny({ Condition: { StringEquals: { "resource.ownerName": "ann" } } })])).effect).toBe(EApiPolicyEffect.DENY);
			expect((await read([allowAll, deny({ Condition: { StringEquals: { "resource.ownerName": "bob" } } })])).effect).toBe(EApiPolicyEffect.ALLOW);
		});

		it("reads a path through a relation the resource does not carry as missing", async () => {
			const ownerless = { ...resource, owner: null } as unknown as EngineItemEntity;

			expect((await read([allowAll, deny({ Condition: { StringEqualsIfExists: { "resource.ownerName": "bob" } } })], ownerless)).effect).toBe(EApiPolicyEffect.DENY);
			expect((await read([allowAll, deny({ Condition: { StringEquals: { "resource.ownerName": "bob" } } })], ownerless)).effect).toBe(EApiPolicyEffect.ALLOW);
		});

		it("fails an Allow and holds a Deny on a resource key with no field mapping", async () => {
			expect((await read([{ ...allowAll, Condition: { StringEquals: { "resource.status": "archived" } } }])).trace.decisionType).toBe(EApiAuthorizationDecisionType.IMPLICIT_DENY);
			expect((await read([allowAll, deny({ Condition: { StringEquals: { "resource.status": "active" } } })])).effect).toBe(EApiPolicyEffect.DENY);
			expect((await read([allowAll, deny({ Condition: { StringEquals: { "resource.state": "active", "resource.status": "archived" } } })])).effect).toBe(EApiPolicyEffect.ALLOW);
		});

		// A loaded collection holds many values, so neither the array nor a missing value stands for the key.
		it.each(["StringEquals", "StringEqualsIfExists"])("fails an Allow %s on a to-many query path", async (operator: string) => {
			expect((await read([{ ...allowAll, Condition: { [operator]: { "resource.noteText": "x" } } }])).trace.decisionType).toBe(EApiAuthorizationDecisionType.IMPLICIT_DENY);
			expect((await read([{ ...allowAll, Condition: { [operator]: { "resource.noteText": "x" } } }], { ...resource, notes: [] } as unknown as EngineItemEntity)).trace.decisionType).toBe(EApiAuthorizationDecisionType.IMPLICIT_DENY);
		});

		it.each(["StringEquals", "StringEqualsIfExists", "StringNotEquals", "StringNotEqualsIfExists"])("holds a Deny %s on a to-many query path", async (operator: string) => {
			expect((await read([allowAll, deny({ Condition: { [operator]: { "resource.noteText": "nothing" } } })])).trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
			expect((await read([allowAll, deny({ Condition: { [operator]: { "resource.noteText": "x" } } })], { ...resource, notes: [] } as unknown as EngineItemEntity)).trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
		});

		it("fails an Allow and holds a Deny on a to-many query path for a list", async () => {
			const list = async (statements: ReadonlyArray<IApiPolicyStatement>) => await evaluate({ action: "admin:item:list", resourceDefinition: aliasResourceDefinition, routeType: EApiRouteType.GET_LIST, statements });

			expect((await list([{ ...allowAll, Condition: { StringEqualsIfExists: { "resource.noteText": "x" } } }])).effect).toBe(EApiPolicyEffect.DENY);
			expect((await list([allowAll, deny({ Condition: { StringEquals: { "resource.noteText": "nothing" } } })])).trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
		});

		it("renders a placeholder that names a field through its query path", async () => {
			expect((await read([allowAll, deny({ Resource: ["gameport:admin:item/archived"] })])).effect).toBe(EApiPolicyEffect.DENY);
			expect((await read([allowAll, deny({ Resource: ["gameport:admin:item/active"] })])).effect).toBe(EApiPolicyEffect.ALLOW);
		});
	});

	describe("several values of one key on a loaded resource", () => {
		const resource = { id: "item-1", operatorId: "operator-1", secret: "s", status: "archived", tenantId: "t" } as unknown as EngineItemEntity;
		const read = async (statements: ReadonlyArray<IApiPolicyStatement>) => await evaluate({ action: "admin:item:read", resource, routeType: EApiRouteType.GET, statements });

		it("holds a positive operator if any value matches, and a negated one if none does", async () => {
			expect((await read([{ ...allowAll, Condition: { StringEquals: { "resource.status": ["active", "archived"] } } }])).effect).toBe(EApiPolicyEffect.ALLOW);
			expect((await read([{ ...allowAll, Condition: { StringEquals: { "resource.status": ["active", "draft"] } } }])).effect).toBe(EApiPolicyEffect.DENY);
			expect((await read([{ ...allowAll, Condition: { StringNotEquals: { "resource.status": ["active", "draft"] } } }])).effect).toBe(EApiPolicyEffect.ALLOW);
			expect((await read([{ ...allowAll, Condition: { StringNotEquals: { "resource.status": ["active", "archived"] } } }])).effect).toBe(EApiPolicyEffect.DENY);
		});

		it("fails an Allow and holds a Deny when a value of the list does not resolve", async () => {
			const values: Array<string> = ["archived", "${principal.attributes.missing}"];

			expect((await read([{ ...allowAll, Condition: { StringEquals: { "resource.status": values } } }])).effect).toBe(EApiPolicyEffect.DENY);
			expect((await read([allowAll, deny({ Condition: { StringEquals: { "resource.status": ["active", "${principal.attributes.missing}"] } } })])).trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
		});

		it("evaluates several values of a context key", async () => {
			expect((await read([{ ...allowAll, Condition: { StringEquals: { "principal.id": ["user-1", "user-2"] } } }])).effect).toBe(EApiPolicyEffect.ALLOW);
			expect((await read([{ ...allowAll, Condition: { StringNotEquals: { "principal.id": ["user-1", "user-2"] } } }])).effect).toBe(EApiPolicyEffect.DENY);
		});
	});

	describe("set qualifiers on context keys", () => {
		const withSets: IApiAuthorizationPrincipal = { ...principal, attributes: { malformed: ["a", { nested: true }] }, groups: [], roles: ["admin", "dev"] };
		const list = async (condition: Record<string, Record<string, unknown>>, statement: "allow" | "deny") => await evaluate({ principal: withSets, statements: statement === "allow" ? [{ ...allowAll, Condition: condition }] : [allowAll, deny({ Condition: condition })] });

		it.each<[string, Record<string, Record<string, unknown>>, boolean]>([
			["ForAnyValue with a role that matches", { "ForAnyValue:StringEquals": { "principal.roles": ["admin", "x"] } }, true],
			["ForAnyValue with no role that matches", { "ForAnyValue:StringEquals": { "principal.roles": "x" } }, false],
			["ForAllValues with every role listed", { "ForAllValues:StringEquals": { "principal.roles": ["admin", "dev"] } }, true],
			["ForAllValues with a role not listed", { "ForAllValues:StringEquals": { "principal.roles": "admin" } }, false],
			["ForAnyValue on an empty set", { "ForAnyValue:StringEquals": { "principal.groups": "x" } }, false],
			["ForAllValues on an empty set", { "ForAllValues:StringEquals": { "principal.groups": "x" } }, true],
			["ForAnyValue on a missing key", { "ForAnyValue:StringEquals": { "principal.attributes.none": "x" } }, false],
			["ForAllValues on a missing key", { "ForAllValues:StringEquals": { "principal.attributes.none": "x" } }, true],
			["ForAnyValue with IfExists on a missing key", { "ForAnyValue:StringEqualsIfExists": { "principal.attributes.none": "x" } }, true],
		])("%s: an Allow and a Deny answer alike", async (_name: string, condition: Record<string, Record<string, unknown>>, isHolding: boolean) => {
			expect((await list(condition, "allow")).effect).toBe(isHolding ? EApiPolicyEffect.ALLOW : EApiPolicyEffect.DENY);
			expect((await list(condition, "deny")).effect).toBe(isHolding ? EApiPolicyEffect.DENY : EApiPolicyEffect.ALLOW);
		});

		it.each(["ForAnyValue:StringEquals", "ForAllValues:StringEquals", "ForAllValues:StringNotEquals", "ForAnyValue:StringNotEquals"])("%s on a list with an element that is no scalar fails an Allow and holds a Deny", async (operator: string) => {
			const condition: Record<string, Record<string, unknown>> = { [operator]: { "principal.attributes.malformed": "a" } };

			expect((await list(condition, "allow")).trace.decisionType).toBe(EApiAuthorizationDecisionType.IMPLICIT_DENY);
			expect((await list(condition, "deny")).trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
		});

		it.each(["StringEquals", "StringNotEquals", "StringEqualsIfExists"])("keeps an unqualified %s on a list closed", async (operator: string) => {
			const condition: Record<string, Record<string, unknown>> = { [operator]: { "principal.roles": "admin" } };

			expect((await list(condition, "allow")).trace.decisionType).toBe(EApiAuthorizationDecisionType.IMPLICIT_DENY);
			expect((await list(condition, "deny")).trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
		});
	});

	describe("set qualifiers on a to-many relation", () => {
		const toManyResourceDefinition: IApiAuthorizationResourceDefinition<EngineItemEntity> = {
			...itemResourceDefinition,
			fields: [
				{ isFilterable: true, path: "resource.id", queryPath: "id" },
				{ isFilterable: true, path: "resource.noteText", queryPath: "notes.text" },
				{ isFilterable: true, path: "resource.status", queryPath: "status" },
			],
		};
		const item = (notes: unknown): EngineItemEntity => ({ id: "item-1", notes, operatorId: "operator-1", secret: "s", status: "archived", tenantId: "t" }) as unknown as EngineItemEntity;
		let dialect: IApiAuthorizationIamDialect;

		const read = async (statements: ReadonlyArray<IApiPolicyStatement>, resource: EngineItemEntity, resourceDialect: IApiAuthorizationIamDialect = dialect) => await evaluate({ action: "admin:item:read", dialect: resourceDialect, resource, resourceDefinition: toManyResourceDefinition, routeType: EApiRouteType.GET, statements });

		beforeAll(async () => {
			const dataSource: DataSource = new DataSource({ database: ":memory:", entities: [EngineItemEntity, EngineNoteEntity], type: "better-sqlite3" });

			await (dataSource as unknown as { buildMetadatas: () => Promise<void> }).buildMetadatas();
			dialect = { dataSource, driverType: "better-sqlite3", type: EApiAuthorizationIamDialect.SQLITE };
		});

		// The texts of the loaded notes, and whether the key holds on them.
		it.each<[string, string, Array<null | string>, boolean]>([
			["ForAnyValue:StringEquals", "x", [], false],
			["ForAnyValue:StringEquals", "x", ["x"], true],
			["ForAnyValue:StringEquals", "x", ["y"], false],
			["ForAnyValue:StringEquals", "x", [null], false],
			["ForAnyValue:StringEquals", "x", ["y", "x"], true],
			["ForAllValues:StringEquals", "x", [], true],
			["ForAllValues:StringEquals", "x", ["x"], true],
			["ForAllValues:StringEquals", "x", ["x", "y"], false],
			["ForAllValues:StringEquals", "x", ["x", null], false],
			["ForAnyValue:StringNotEquals", "x", [], false],
			["ForAnyValue:StringNotEquals", "x", [null], true],
			["ForAnyValue:StringNotEquals", "x", ["x"], false],
			["ForAllValues:StringNotEquals", "x", [], true],
			["ForAllValues:StringNotEquals", "x", [null], true],
			["ForAllValues:StringNotEquals", "x", ["y", "x"], false],
			["ForAnyValue:StringEqualsIfExists", "x", [], true],
			["ForAnyValue:StringEqualsIfExists", "x", ["y"], false],
			["ForAllValues:StringEqualsIfExists", "x", [], true],
			["ForAnyValue:StringLike", "*", [null], true],
			["ForAnyValue:StringLike", "*", [], false],
		])("%s %s on the notes %j", async (operator: string, value: string, texts: Array<null | string>, isHolding: boolean) => {
			const resource: EngineItemEntity = item(texts.map((text: null | string): { text: null | string } => ({ text })));

			expect((await read([{ ...allowAll, Condition: { [operator]: { "resource.noteText": value } } }], resource)).effect).toBe(isHolding ? EApiPolicyEffect.ALLOW : EApiPolicyEffect.DENY);
			expect((await read([allowAll, deny({ Condition: { [operator]: { "resource.noteText": value } } })], resource)).effect).toBe(isHolding ? EApiPolicyEffect.DENY : EApiPolicyEffect.ALLOW);
		});

		it.each<[string, unknown]>([
			["is not loaded", undefined],
			["is NULL", null],
			["is a promise of a lazy relation", Promise.resolve([])],
			["holds a row that is no record", ["x"]],
			["holds a row without the column", [{ id: "note-1" }]],
		])("fails an Allow and holds a Deny when the relation %s", async (_name: string, notes: unknown) => {
			for (const operator of ["ForAnyValue:StringEquals", "ForAllValues:StringEquals", "ForAllValues:StringNotEquals", "ForAnyValue:StringEqualsIfExists"]) {
				expect((await read([{ ...allowAll, Condition: { [operator]: { "resource.noteText": "x" } } }], item(notes))).trace.decisionType).toBe(EApiAuthorizationDecisionType.IMPLICIT_DENY);
				expect((await read([allowAll, deny({ Condition: { [operator]: { "resource.noteText": "x" } } })], item(notes))).trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
			}
		});

		it.each<[string, IApiAuthorizationIamDialect]>([
			["no DataSource to name the tables", { type: EApiAuthorizationIamDialect.PORTABLE }],
			["a dialect that could not be resolved", { type: EApiAuthorizationIamDialect.UNRESOLVED }],
		])("fails a loaded row closed with %s, as its list does", async (_name: string, resourceDialect: IApiAuthorizationIamDialect) => {
			const resource: EngineItemEntity = item([{ text: "x" }]);

			expect((await read([{ ...allowAll, Condition: { "ForAnyValue:StringEquals": { "resource.noteText": "x" } } }], resource, resourceDialect)).trace.decisionType).toBe(EApiAuthorizationDecisionType.IMPLICIT_DENY);
			expect((await read([allowAll, deny({ Condition: { "ForAnyValue:StringEquals": { "resource.noteText": "y" } } })], resource, resourceDialect)).trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
		});

		it("fails a qualifier on a column of the resource closed", async () => {
			const resource: EngineItemEntity = item([]);

			expect((await read([{ ...allowAll, Condition: { "ForAnyValue:StringEquals": { "resource.status": "archived" } } }], resource)).trace.decisionType).toBe(EApiAuthorizationDecisionType.IMPLICIT_DENY);
			expect((await read([allowAll, deny({ Condition: { "ForAllValues:StringEquals": { "resource.status": "active" } } })], resource)).trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
		});

		it("scopes a list with a subquery on the row's key", async () => {
			const decision = await evaluate({ action: "admin:item:list", dialect, resourceDefinition: toManyResourceDefinition, routeType: EApiRouteType.GET_LIST, statements: [{ ...allowAll, Condition: { "ForAnyValue:StringEquals": { "resource.noteText": "x" } } }] });
			const where = decision.scope?.where as { id: FindOperator<unknown> };

			expect(decision.effect).toBe(EApiPolicyEffect.ALLOW);
			expect(where.id.type).toBe("raw");
			expect((where.id as unknown as { getSql: (alias: string) => string }).getSql("alias")).toContain(`EXISTS (SELECT 1 FROM "engine_notes" "iam_collection_row" WHERE "iam_collection_row"."itemId" = alias AND (`);
		});

		it("excludes rows of a Deny with the subquery negated", async () => {
			const decision = await evaluate({ action: "admin:item:list", dialect, resourceDefinition: toManyResourceDefinition, routeType: EApiRouteType.GET_LIST, statements: [allowAll, deny({ Condition: { "ForAnyValue:StringEquals": { "resource.noteText": "x" } } })] });
			const where = decision.scope?.where as { id: FindOperator<unknown> };

			expect((where.id as unknown as { getSql: (alias: string) => string }).getSql("alias")).toContain(`NOT EXISTS (SELECT 1 FROM "engine_notes" "iam_collection_row"`);
		});
	});

	describe("row-scoped Deny on lists", () => {
		it("excludes an exact row from the list scope", async () => {
			const decision = await evaluate({ statements: [allowOwnOperator, deny({ Action: ["admin:item:list"], Resource: ["gameport:admin:item/item-1"] })] });

			expect(decision.effect).toBe(EApiPolicyEffect.ALLOW);
			expect(decision.scope).toEqual({
				where: [
					{ id: Not(Equal("item-1")), operatorId: Equal("operator-1") },
					{ id: IsNull(), operatorId: Equal("operator-1") },
				],
			});
		});

		it("excludes a wildcard prefix with escaped LIKE metacharacters", async () => {
			const decision = await evaluate({ statements: [allowAll, deny({ Resource: ["gameport:admin:item/a_b%*"] })] });
			const where = decision.scope?.where as [{ id: FindOperator<unknown> }, { id: FindOperator<unknown> }];

			expect(where[0].id.type).toBe("raw");
			expect(Object.values(where[0].id.objectLiteralParameters ?? {})).toEqual(["a!_b!%%"]);
			expect(where[1]).toEqual({ id: IsNull() });
		});

		it("ORs the row pattern with the statement resource keys", async () => {
			const decision = await evaluate({ statements: [allowAll, deny({ Condition: { StringNotEquals: { "resource.status": "active" } }, Resource: ["gameport:admin:item/item-1"] })] });

			expect(decision.scope).toEqual({ where: [{ id: Not(Equal("item-1")) }, { id: IsNull() }, { status: Equal("active") }] });
		});

		it("ANDs the exclusions of several row patterns", async () => {
			const decision = await evaluate({ statements: [allowAll, deny({ Resource: ["gameport:admin:item/item-1", "gameport:admin:item/item-2", "gameport:other/item-3"] })] });

			expect(decision.effect).toBe(EApiPolicyEffect.ALLOW);
			expect(decision.scope?.where).toHaveLength(4);
		});

		it("does not widen a Deny on read to the list action", async () => {
			const decision = await evaluate({ statements: [allowAll, deny({ Action: ["admin:item:read"], Resource: ["gameport:admin:item/item-1"] })] });

			expect(decision.effect).toBe(EApiPolicyEffect.ALLOW);
			expect(decision.scope).toBeUndefined();
		});

		it("ignores row patterns of other resource types and patterns that match nothing", async () => {
			const decision = await evaluate({ statements: [allowAll, deny({ Resource: ["gameport:other/item-1", "gameport:other/*-secret"] })] });

			expect(decision.effect).toBe(EApiPolicyEffect.ALLOW);
			expect(decision.scope).toBeUndefined();
		});

		it("denies the whole list when the placeholder field is not filterable", async () => {
			const decision = await evaluate({
				resourceDefinition: { ...itemResourceDefinition, fields: itemResourceDefinition.fields.filter((field) => field.path !== "resource.id") },
				statements: [allowAll, deny({ Resource: ["gameport:admin:item/item-1"] })],
			});

			expect(decision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
		});

		it("maps nested resource paths and denies the whole list on ambiguous placeholders", async () => {
			const tenantResourceDefinition: IApiAuthorizationResourceDefinition<EngineItemEntity> = {
				...itemResourceDefinition,
				fields: [...itemResourceDefinition.fields, { isFilterable: true, path: "resource.tenantId", queryPath: "tenantId" }],
				resourcePath: "gameport:tenant/{tenantId}/item/{id}",
			};
			const allowAnyResource: IApiPolicyStatement = { ...allowAll, Resource: ["*"] };

			const exactDecision = await evaluate({ resourceDefinition: tenantResourceDefinition, statements: [allowAnyResource, deny({ Resource: ["gameport:tenant/t-1/item/item-1"] })] });
			const tenantPrefixDecision = await evaluate({ resourceDefinition: tenantResourceDefinition, statements: [allowAnyResource, deny({ Resource: ["gameport:tenant/t-1*"] })] });
			const resolvedTenantDecision = await evaluate({ requestMetadata: { parameters: { tenantId: "t-1" } }, resourceDefinition: tenantResourceDefinition, statements: [allowAnyResource, deny({ Resource: ["gameport:tenant/t-1/item/item-1"] })] });
			const ambiguousPrefixDecision = await evaluate({ resourceDefinition: tenantResourceDefinition, statements: [allowAnyResource, deny({ Resource: ["gameport:tenant/t-1/it*"] })] });
			const ambiguousExactDecision = await evaluate({ resourceDefinition: tenantResourceDefinition, statements: [allowAnyResource, deny({ Resource: ["gameport:tenant/t-1/item/a/item/b"] })] });

			expect(exactDecision.scope).toEqual({ where: [{ tenantId: Not(Equal("t-1")) }, { tenantId: IsNull() }, { id: Not(Equal("item-1")) }, { id: IsNull() }] });
			expect((tenantPrefixDecision.scope?.where as Array<{ tenantId: FindOperator<unknown> }>)[0]?.tenantId.type).toBe("raw");
			// The tenant of the path is excluded by its text and by its stored column: the row reading adds four branches.
			expect(resolvedTenantDecision.scope?.where).toContainEqual({ id: Not(Equal("item-1")), tenantId: Not(Equal("t-1")) });
			expect(resolvedTenantDecision.scope?.where).toHaveLength(8);
			expect(ambiguousPrefixDecision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
			expect(ambiguousExactDecision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
		});

		it("keeps an exact resource Deny on a row route a whole-request deny, and excludes the row from another spelling", async () => {
			const deniedDecision = await evaluate({ action: "admin:item:read", requestMetadata: { parameters: { id: "item-1" } }, routeType: EApiRouteType.GET, statements: [allowAll, deny({ Resource: ["gameport:admin:item/item-1"] })] });
			const otherDecision = await evaluate({ action: "admin:item:read", requestMetadata: { parameters: { id: "item-2" } }, routeType: EApiRouteType.GET, statements: [allowAll, deny({ Resource: ["gameport:admin:item/item-1"] })] });

			expect(deniedDecision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
			expect(otherDecision.effect).toBe(EApiPolicyEffect.ALLOW);
			expect(otherDecision.scope).toEqual({ where: [{ id: Not(Equal("item-1")) }, { id: IsNull() }] });
		});

		it("applies row patterns to a custom list action", async () => {
			const decision = await evaluate({ action: "admin:item:list", routeType: undefined, statements: [allowAll, deny({ Action: ["admin:item:list"], Resource: ["gameport:admin:item/item-1"] })] });
			const otherActionDecision = await evaluate({ action: "admin:item:export", statements: [allowAll, deny({ Resource: ["gameport:admin:item/item-1"] })] });

			expect(decision.scope).toEqual({ where: [{ id: Not(Equal("item-1")) }, { id: IsNull() }] });
			expect(otherActionDecision.scope).toBeUndefined();
		});

		it("denies the whole list for a prefix pattern on a non-string placeholder field", async () => {
			const decision = await evaluate({
				resourceDefinition: { ...itemResourceDefinition, resourcePath: "gameport:admin:item/{status}" },
				statements: [{ ...allowAll, Resource: ["*"] }, deny({ Resource: ["gameport:admin:item/arch*"] })],
			});

			expect(decision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
		});

		it("compiles row patterns on a create, whose stored row the create reads back", async () => {
			const decision = await evaluate({ action: "admin:item:create", routeType: EApiRouteType.CREATE, statements: [allowAll, deny({ Resource: ["gameport:admin:item/item-1"] })] });

			expect(decision.effect).toBe(EApiPolicyEffect.ALLOW);
			expect(decision.scope).toEqual({ where: [{ id: Not(Equal("item-1")) }, { id: IsNull() }] });
		});
	});

	describe("NULL placeholders", () => {
		const tenantResourceDefinition: IApiAuthorizationResourceDefinition<EngineItemEntity> = {
			...itemResourceDefinition,
			fields: [...itemResourceDefinition.fields, { isFilterable: true, path: "resource.tenantId", queryPath: "tenantId" }],
			resourcePath: "gameport:tenant/{tenantId}/item/{id}",
		};
		const allowAnyResource: IApiPolicyStatement = { ...allowAll, Resource: ["*"] };
		const read = async (statements: ReadonlyArray<IApiPolicyStatement>, tenantId: null | string) => await evaluate({ action: "admin:item:read", resource: { id: "item-1", operatorId: "operator-1", secret: "s", status: "active", tenantId } as unknown as EngineItemEntity, resourceDefinition: tenantResourceDefinition, routeType: EApiRouteType.GET, statements });

		it.each([null, ""])("renders a %j placeholder of a loaded resource as an empty string", async (tenantId: null | string) => {
			expect((await read([allowAnyResource, deny({ Resource: ["gameport:tenant//item/item-1"] })], tenantId)).effect).toBe(EApiPolicyEffect.DENY);
			expect((await read([allowAnyResource, deny({ Resource: ["gameport:tenant/*/item/item-1"] })], tenantId)).effect).toBe(EApiPolicyEffect.DENY);
			// Before 5.2 the placeholder rendered as "*", which a "?" matched.
			expect((await read([allowAnyResource, deny({ Resource: ["gameport:tenant/?/item/item-1"] })], tenantId)).effect).toBe(EApiPolicyEffect.ALLOW);
			expect((await read([allowAnyResource, deny({ Resource: ["gameport:tenant/t-1/item/item-1"] })], tenantId)).effect).toBe(EApiPolicyEffect.ALLOW);
		});

		it("excludes the rows whose placeholder renders as an empty string from a list", async () => {
			const lastSlot = await evaluate({ statements: [allowAll, deny({ Resource: ["gameport:admin:item/"] })] });
			const middleSlot = await evaluate({ resourceDefinition: tenantResourceDefinition, statements: [allowAnyResource, deny({ Resource: ["gameport:tenant//item/item-1"] })] });

			expect(lastSlot.scope).toEqual({ where: { id: And(Not(IsNull()), Not(Equal(""))) } });
			expect(middleSlot.scope).toEqual({ where: [{ tenantId: And(Not(IsNull()), Not(Equal(""))) }, { id: Not(Equal("item-1")) }, { id: IsNull() }] });
		});
	});

	describe("String operators on columns that are not text", () => {
		const loaded = { id: "item-1", operatorId: "operator-1", rank: 5, secret: "s", status: "active", tenantId: "t" } as unknown as EngineItemEntity;

		it("fail closed in memory on a numeric column: an Allow is not matched and a Deny holds", async () => {
			expect((await evaluate({ action: "admin:item:read", resource: loaded, routeType: EApiRouteType.GET, statements: [{ ...allowAll, Condition: { StringEquals: { "resource.rank": "5" } } }] })).trace.decisionType).toBe(EApiAuthorizationDecisionType.IMPLICIT_DENY);
			expect((await evaluate({ action: "admin:item:read", resource: loaded, routeType: EApiRouteType.GET, statements: [allowAll, deny({ Condition: { StringEquals: { "resource.rank": "6" } } })] })).trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
		});

		it("fail closed in SQL on a numeric column", async () => {
			expect((await evaluate({ statements: [{ ...allowAll, Condition: { StringEquals: { "resource.rank": "5" } } }] })).trace.decisionType).toBe(EApiAuthorizationDecisionType.IMPLICIT_DENY);
			expect((await evaluate({ statements: [allowAll, deny({ Condition: { StringNotEquals: { "resource.rank": "5" } } })] })).trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
		});
	});

	describe("uuid and enum columns on PostgreSQL", () => {
		const POSTGRES: IApiAuthorizationIamDialect = { driverType: "postgres", type: EApiAuthorizationIamDialect.POSTGRES };
		const loaded = { id: DEVICE_ID, kind: "alpha", operatorId: OPERATOR_ID } as unknown as EngineItemEntity;
		const onDevices = async (statements: ReadonlyArray<IApiPolicyStatement>, options: { action?: string; principal?: IApiAuthorizationPrincipal; resource?: EngineItemEntity } = {}) => await evaluate({ ...options, dialect: POSTGRES, resourceDefinition: deviceResourceDefinition as unknown as IApiAuthorizationResourceDefinition<EngineItemEntity>, ...(options.resource ? { routeType: EApiRouteType.GET } : {}), statements });
		const allowWhere = (key: string, value: string): IApiPolicyStatement => ({ ...allowAll, Condition: { StringEquals: { [key]: value } } });

		it("compares a canonical uuid natively and an operator attribute like Gameport's baseline", async () => {
			expect((await onDevices([allowWhere("resource.operatorId", OPERATOR_ID)])).scope).toEqual({ where: { operatorId: OPERATOR_ID } });
			expect((await onDevices([allowOwnOperator], { principal: { ...principal, attributes: { operatorId: OPERATOR_ID } } })).scope).toEqual({ where: { operatorId: OPERATOR_ID } });
		});

		// A value no uuid row can hold lowers to a condition that matches no row, as the text comparison of another database
		// would: the Allow still compiles, so a list is empty and a read answers 404, while a loaded row is not allowed in memory.
		it.each([OPERATOR_ID.toUpperCase(), `{${OPERATOR_ID}}`, OPERATOR_ID.replaceAll("-", ""), "not-a-uuid", "operator-1"])("matches no row on a uuid column for %s, in SQL and in memory", async (value: string) => {
			const decision = await onDevices([allowWhere("resource.operatorId", value)]);

			expect(decision.effect).toBe(EApiPolicyEffect.ALLOW);
			expect(decision.scope).toEqual({ where: { operatorId: In([]) } });
			expect((await onDevices([allowWhere("resource.operatorId", value)], { action: "admin:item:read", resource: loaded })).trace.decisionType).toBe(EApiAuthorizationDecisionType.IMPLICIT_DENY);
			// The Deny holds for no row, so it keeps every row, NULL ones included.
			expect((await onDevices([allowAll, deny({ Condition: { StringEquals: { "resource.operatorId": value } } })])).scope).toEqual({ where: [{ operatorId: Not(IsNull()) }, { operatorId: IsNull() }] });
			expect((await onDevices([allowAll, deny({ Condition: { StringEquals: { "resource.operatorId": value } } })], { action: "admin:item:read", resource: loaded })).effect).toBe(EApiPolicyEffect.ALLOW);
		});

		it("matches no row on a uuid column when the principal attribute is not a canonical uuid", async () => {
			const upperCase: IApiAuthorizationPrincipal = { ...principal, attributes: { operatorId: OPERATOR_ID.toUpperCase() } };

			expect((await onDevices([allowOwnOperator], { principal: upperCase })).scope).toEqual({ where: { operatorId: In([]) } });
			expect((await onDevices([allowOwnOperator], { action: "admin:item:read", principal: upperCase, resource: loaded })).trace.decisionType).toBe(EApiAuthorizationDecisionType.IMPLICIT_DENY);
		});

		it('excludes only NULL ids for a "" placeholder on a uuid column, and no row for another spelling of a UUID', async () => {
			expect((await onDevices([allowAll, deny({ Resource: ["gameport:admin:item/"] })])).scope).toEqual({ where: { id: And(Not(IsNull()), Not(IsNull())) } });
			expect((await onDevices([allowAll, deny({ Resource: ["gameport:admin:item/A0EEBC99-9C0B-4EF8-BB6D-6BB9BD380A11"] })])).scope).toEqual({ where: [{ id: Not(IsNull()) }, { id: IsNull() }] });
		});

		it("compares a declared enum value natively and matches no row for any other value", async () => {
			expect((await onDevices([allowWhere("resource.kind", "alpha")])).scope).toEqual({ where: { kind: "alpha" } });
			expect((await onDevices([allowWhere("resource.kind", "gamma")])).scope).toEqual({ where: { kind: In([]) } });
			expect((await onDevices([allowWhere("resource.kind", "Alpha")], { action: "admin:item:read", resource: loaded })).trace.decisionType).toBe(EApiAuthorizationDecisionType.IMPLICIT_DENY);
			// Every row, NULL included, differs from a value the column cannot hold, so the Deny excludes every row, as in memory.
			expect((await onDevices([allowAll, deny({ Condition: { StringNotEquals: { "resource.kind": "gamma" } } })])).scope).toEqual({ where: { kind: In([]) } });
			expect((await onDevices([allowAll, deny({ Condition: { StringNotEquals: { "resource.kind": "gamma" } } })], { action: "admin:item:read", resource: loaded })).trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
		});

		it("compiles Allow keys that contradict each other on one query path into a scope on every dialect, which matches no row", async () => {
			const contradiction: IApiPolicyStatement = { ...allowAll, Condition: { StringEquals: { "resource.kind": "alpha" }, StringEqualsIfExists: { "resource.kind": "beta" } } };

			for (const dialect of [POSTGRES, { binaryCollation: "utf8mb4_0900_bin", driverType: "mysql", type: EApiAuthorizationIamDialect.MYSQL, version: "8.4.2" }, { driverType: "better-sqlite3", type: EApiAuthorizationIamDialect.SQLITE }]) {
				const decision = await evaluate({ dialect, resourceDefinition: deviceResourceDefinition as unknown as IApiAuthorizationResourceDefinition<EngineItemEntity>, statements: [contradiction] });

				expect(decision.effect).toBe(EApiPolicyEffect.ALLOW);
				expect(Object.keys(decision.scope?.where ?? {})).toEqual(["kind"]);
			}
		});
	});

	describe("Allow scopes", () => {
		it("allows every row when one matched Allow has no resource key", async () => {
			const decision = await evaluate({ statements: [allowOwnOperator, allowAll] });

			expect(decision.effect).toBe(EApiPolicyEffect.ALLOW);
			expect(decision.scope).toBeUndefined();
		});

		it("lowers the scope to the dialect it is given", async () => {
			const decision = await evaluate({ dialect: { binaryCollation: "utf8mb4_0900_bin", driverType: "mysql", type: EApiAuthorizationIamDialect.MYSQL, version: "8.4.2" }, statements: [allowOwnOperator] });
			const where = decision.scope?.where as { operatorId: FindOperator<unknown> };

			expect(where.operatorId.type).toBe("raw");
			expect(where.operatorId.getSql?.("item.operatorId")).toMatch(/^CONVERT\(item\.operatorId USING utf8mb4\) COLLATE utf8mb4_0900_bin = :iam[0-9a-f]{24}$/);
		});

		it("grants nothing for an unresolved dialect, unless no Allow needs SQL", async () => {
			expect((await evaluate({ dialect: { type: EApiAuthorizationIamDialect.UNRESOLVED }, statements: [allowOwnOperator] })).trace.decisionType).toBe(EApiAuthorizationDecisionType.IMPLICIT_DENY);
			expect((await evaluate({ dialect: { type: EApiAuthorizationIamDialect.UNRESOLVED }, statements: [allowAll] })).effect).toBe(EApiPolicyEffect.ALLOW);
			expect((await evaluate({ dialect: { type: EApiAuthorizationIamDialect.UNRESOLVED }, statements: [allowAll, deny({ Condition: { StringEquals: { "resource.status": "archived" } } })] })).trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
		});
	});

	describe("Deny patterns with an interior wildcard", () => {
		const tenantResourceDefinition: IApiAuthorizationResourceDefinition<EngineItemEntity> = {
			...itemResourceDefinition,
			fields: [...itemResourceDefinition.fields, { isFilterable: true, path: "resource.tenantId", queryPath: "tenantId" }],
			resourcePath: "gameport:tenant/{tenantId}/item/{id}",
		};
		const allowAnyResource: IApiPolicyStatement = { ...allowAll, Resource: ["*"] };
		const rowRoutes: Array<[string, EApiRouteType]> = [
			["admin:item:read", EApiRouteType.GET],
			["admin:item:update", EApiRouteType.UPDATE],
			["admin:item:delete", EApiRouteType.DELETE],
		];

		it.each(rowRoutes)("denies %s for an Action with an interior wildcard", async (action: string, routeType: EApiRouteType) => {
			const requestMetadata: IApiAuthorizationRequestMetadata<EngineItemEntity> = { parameters: { id: "item-1" } };
			const verbDecision = await evaluate({ action, requestMetadata, routeType, statements: [allowAll, deny({ Action: [`admin:*:${action.split(":").at(-1) ?? ""}`] })] });
			const anyNamespaceDecision = await evaluate({ action, requestMetadata, routeType, statements: [allowAll, deny({ Action: ["*:item:*e*"] })] });

			expect(verbDecision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
			expect(anyNamespaceDecision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
		});

		it("keeps other actions served under an Action with an interior wildcard", async () => {
			const decision = await evaluate({ action: "admin:item:read", requestMetadata: { parameters: { id: "item-1" } }, routeType: EApiRouteType.GET, statements: [allowAll, deny({ Action: ["admin:*:delete"] })] });

			expect(decision.effect).toBe(EApiPolicyEffect.ALLOW);
		});

		it.each(rowRoutes)("denies %s of the named row for a Resource with an interior wildcard", async (action: string, routeType: EApiRouteType) => {
			const statements: Array<IApiPolicyStatement> = [allowAnyResource, deny({ Resource: ["gameport:tenant/*/item/item-1", "gameport:*/item/*-secret"] })];
			const namedDecision = await evaluate({ action, requestMetadata: { parameters: { id: "item-1", tenantId: "t-1" } }, resourceDefinition: tenantResourceDefinition, routeType, statements });
			const suffixDecision = await evaluate({ action, requestMetadata: { parameters: { id: "a-secret", tenantId: "t-2" } }, resourceDefinition: tenantResourceDefinition, routeType, statements });
			const otherDecision = await evaluate({ action, requestMetadata: { parameters: { id: "item-2", tenantId: "t-1" } }, resourceDefinition: tenantResourceDefinition, routeType, statements });

			expect(namedDecision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
			expect(suffixDecision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
			// The wildcard before the placeholders has no one mapping to the stored row, so it denies the row route as it denies the list.
			expect(otherDecision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
			expect((await evaluate({ action, requestMetadata: { parameters: { id: "item-2", tenantId: "t-1" } }, resourceDefinition: tenantResourceDefinition, routeType, statements: [allowAnyResource, deny({ Resource: ["gameport:tenant/*/item/item-1"] })] })).effect).toBe(EApiPolicyEffect.ALLOW);
		});

		it("reads ? as exactly one character", async () => {
			const statements: Array<IApiPolicyStatement> = [allowAll, deny({ Resource: ["gameport:admin:item/item-?"] })];
			const readItem = async (id: string) => await evaluate({ action: "admin:item:read", requestMetadata: { parameters: { id } }, routeType: EApiRouteType.GET, statements });

			expect((await readItem("item-?")).trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
			expect((await readItem("item-1")).trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
			expect((await readItem("item-🙂")).trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
			expect((await readItem("item-12")).effect).toBe(EApiPolicyEffect.ALLOW);
			expect((await readItem("item-")).effect).toBe(EApiPolicyEffect.ALLOW);
		});

		it("reads the ${*}, ${?} and ${$} escapes as literal characters", async () => {
			const statements: Array<IApiPolicyStatement> = [allowAll, deny({ Resource: ["gameport:admin:item/a${?}b${*}c${$}"] })];
			const readItem = async (id: string) => await evaluate({ action: "admin:item:read", requestMetadata: { parameters: { id } }, routeType: EApiRouteType.GET, statements });

			expect((await readItem("a?b*c$")).trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
			expect((await readItem("axbyc$")).effect).toBe(EApiPolicyEffect.ALLOW);
		});

		it("excludes the rows a Resource with ? matches from a list", async () => {
			const decision = await evaluate({ statements: [allowAll, deny({ Resource: ["gameport:admin:item/item-?"] })] });
			const where = decision.scope?.where as [{ id: FindOperator<unknown> }, { id: FindOperator<unknown> }];

			expect(decision.effect).toBe(EApiPolicyEffect.ALLOW);
			expect(Object.values(where[0].id.objectLiteralParameters ?? {})).toEqual(["item-_"]);
			expect(where[1]).toEqual({ id: IsNull() });
		});

		it("excludes the rows a Resource with ? matches from a create", async () => {
			const decision = await evaluate({ action: "admin:item:create", routeType: EApiRouteType.CREATE, statements: [allowAll, deny({ Resource: ["gameport:admin:item/item-?"] })] });
			const where = decision.scope?.where as [{ id: FindOperator<unknown> }, { id: FindOperator<unknown> }];

			expect(decision.effect).toBe(EApiPolicyEffect.ALLOW);
			expect(Object.values(where[0].id.objectLiteralParameters ?? {})).toEqual(["item-_"]);
		});

		it("denies the whole list for an Action with an interior wildcard", async () => {
			const decision = await evaluate({ statements: [allowAll, deny({ Action: ["admin:*:list"] })] });

			expect(decision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
		});

		it.each([
			["a suffix", "gameport:tenant/t-1/item/*-secret"],
			["a wildcard before the placeholders", "gameport:*/item/item-1"],
		])("denies the whole list for a Resource with %s that has no one mapping to rows", async (_name: string, pattern: string) => {
			const decision = await evaluate({ resourceDefinition: tenantResourceDefinition, statements: [allowAnyResource, deny({ Resource: [pattern] })] });

			expect(decision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
		});

		it("excludes the rows a wildcard across both placeholders matches, since one pattern per slot says each", async () => {
			const decision = await evaluate({ resourceDefinition: tenantResourceDefinition, statements: [allowAnyResource, deny({ Resource: ["gameport:tenant/t-1*item-1"] })] });
			const where = decision.scope?.where as Array<{ id?: FindOperator<unknown>; tenantId?: FindOperator<unknown> }>;

			expect(decision.effect).toBe(EApiPolicyEffect.ALLOW);
			expect(where.flatMap((branch) => Object.values(branch.tenantId?.objectLiteralParameters ?? {}))).toEqual(["t-1%"]);
			expect(where.flatMap((branch) => Object.values(branch.id?.objectLiteralParameters ?? {}))).toEqual(["%item-1"]);
		});

		it("denies the whole list for a Resource with an interior wildcard that covers every row", async () => {
			const decision = await evaluate({ statements: [allowAll, deny({ Resource: ["gameport:*:item/*"] })] });

			expect(decision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
		});

		it("ignores a Resource with an interior wildcard that matches no row of the list", async () => {
			const decision = await evaluate({ resourceDefinition: tenantResourceDefinition, statements: [allowAnyResource, deny({ Resource: ["gameport:other/*/item/*", "gameport:tenants*/item/*"] })] });

			expect(decision.effect).toBe(EApiPolicyEffect.ALLOW);
			expect(decision.scope).toBeUndefined();
		});

		it("denies a create for an Action with an interior wildcard, and excludes the rows of such a Resource", async () => {
			const actionDecision = await evaluate({ action: "admin:item:create", routeType: EApiRouteType.CREATE, statements: [allowAll, deny({ Action: ["admin:*:create"] })] });
			const resourceDecision = await evaluate({ action: "admin:item:create", routeType: EApiRouteType.CREATE, statements: [allowAll, deny({ Resource: ["gameport:admin:item/*-secret"] })] });
			const otherTypeDecision = await evaluate({ action: "admin:item:create", routeType: EApiRouteType.CREATE, statements: [allowAll, deny({ Resource: ["gameport:other/*-secret"] })] });

			expect(actionDecision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
			expect(resourceDecision.effect).toBe(EApiPolicyEffect.ALLOW);
			expect(resourceDecision.scope?.where).toHaveLength(2);
			expect(otherTypeDecision.effect).toBe(EApiPolicyEffect.ALLOW);
			expect(otherTypeDecision.scope).toBeUndefined();
		});

		it("matches an Allow with an interior wildcard or ? as a glob", async () => {
			const readOptions = { action: "admin:item:read", requestMetadata: { parameters: { id: "item-1" } }, routeType: EApiRouteType.GET };
			const actionDecision = await evaluate({ ...readOptions, statements: [{ ...allowAll, Action: ["admin:*:read"] }] });
			const questionMarkDecision = await evaluate({ ...readOptions, statements: [{ ...allowAll, Action: ["admin:item:rea?"] }] });
			const resourceDecision = await evaluate({ ...readOptions, statements: [{ ...allowAll, Resource: ["gameport:*/item-1"] }] });
			const otherRowDecision = await evaluate({ ...readOptions, statements: [{ ...allowAll, Resource: ["gameport:*/item-2"] }] });
			const listDecision = await evaluate({ statements: [{ ...allowAll, Resource: ["gameport:*:item/*"] }] });

			expect(actionDecision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_ALLOW);
			expect(questionMarkDecision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_ALLOW);
			expect(resourceDecision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_ALLOW);
			expect(otherRowDecision.trace.decisionType).toBe(EApiAuthorizationDecisionType.IMPLICIT_DENY);
			expect(listDecision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_ALLOW);
		});

		it("grants nothing on a list for an Allow glob the portable dialect cannot match exactly", async () => {
			const questionMarkDecision = await evaluate({ dialect: { type: EApiAuthorizationIamDialect.PORTABLE }, statements: [{ ...allowAll, Resource: ["gameport:admin:item/?"] }] });
			const rowDecision = await evaluate({ dialect: { type: EApiAuthorizationIamDialect.PORTABLE }, statements: [{ ...allowAll, Resource: ["gameport:admin:item/item-*"] }] });

			expect(questionMarkDecision.trace.decisionType).toBe(EApiAuthorizationDecisionType.IMPLICIT_DENY);
			expect(rowDecision.trace.decisionType).toBe(EApiAuthorizationDecisionType.IMPLICIT_DENY);
		});

		it("scopes a list to the literal row an escaped wildcard names", async () => {
			const decision = await evaluate({ statements: [{ ...allowAll, Resource: ["gameport:admin:item/${*}"] }] });

			expect(decision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_ALLOW);
			expect(decision.scope).toEqual({ where: { id: "*" } });
		});
	});

	describe("condition keys whose value is a list or an object", () => {
		const structuredPrincipal: IApiAuthorizationPrincipal = {
			...principal,
			attributes: { ...principal.attributes, profile: { tier: "gold" }, tags: ["banned"] },
			roles: ["admin", "banned"],
		};
		const keys: Array<string> = ["principal.roles", "principal.attributes.tags", "principal.attributes.profile"];
		const operators: Array<string> = ["StringEquals", "StringEqualsIfExists", "StringNotEquals", "StringNotEqualsIfExists"];
		const cases: Array<[string, string]> = keys.flatMap((key: string): Array<[string, string]> => operators.map((operator: string): [string, string] => [operator, key]));
		const readOptions = { action: "admin:item:read", principal: structuredPrincipal, requestMetadata: { parameters: { id: "item-1" } }, routeType: EApiRouteType.GET };

		it.each(cases)("holds a Deny %s on %s", async (operator: string, key: string) => {
			const equalDecision = await evaluate({ ...readOptions, statements: [allowAll, deny({ Condition: { [operator]: { [key]: "banned" } } })] });
			const otherDecision = await evaluate({ ...readOptions, statements: [allowAll, deny({ Condition: { [operator]: { [key]: "other" } } })] });
			const listDecision = await evaluate({ principal: structuredPrincipal, statements: [allowAll, deny({ Condition: { [operator]: { [key]: "banned" } } })] });

			expect(equalDecision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
			expect(otherDecision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
			expect(listDecision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
		});

		it.each(cases)("fails an Allow %s on %s", async (operator: string, key: string) => {
			const equalDecision = await evaluate({ ...readOptions, statements: [{ ...allowAll, Condition: { [operator]: { [key]: "admin" } } }] });
			const otherDecision = await evaluate({ ...readOptions, statements: [{ ...allowAll, Condition: { [operator]: { [key]: "other" } } }] });

			expect(equalDecision.trace.decisionType).toBe(EApiAuthorizationDecisionType.IMPLICIT_DENY);
			expect(otherDecision.trace.decisionType).toBe(EApiAuthorizationDecisionType.IMPLICIT_DENY);
		});

		it("keeps a held Deny with a resource key a row exclusion", async () => {
			const decision = await evaluate({ principal: structuredPrincipal, statements: [allowAll, deny({ Condition: { StringEquals: { "principal.roles": "banned", "resource.status": "archived" } } })] });

			expect(decision.effect).toBe(EApiPolicyEffect.ALLOW);
			expect(decision.scope).toEqual({ where: [{ status: Not(Equal("archived")) }, { status: IsNull() }] });
		});

		it("keeps scalar and missing keys compared as before", async () => {
			const scalarDecision = await evaluate({ ...readOptions, statements: [allowAll, deny({ Condition: { StringEquals: { "principal.attributes.operatorId": "operator-2" } } })] });
			const missingDecision = await evaluate({ ...readOptions, statements: [{ ...allowAll, Condition: { StringEqualsIfExists: { "principal.attributes.missing": "x" } } }] });

			expect(scalarDecision.effect).toBe(EApiPolicyEffect.ALLOW);
			expect(missingDecision.effect).toBe(EApiPolicyEffect.ALLOW);
		});
	});
});
