import type { IApiAuthorizationPrincipal, IApiAuthorizationRequestMetadata, IApiAuthorizationResourceDefinition, IApiPolicyStatement } from "@interface/class/api/authorization";
import type { FindOperator } from "typeorm";

import { ApiAuthorizationIamEngine, ApiAuthorizationIamQueryPlanner } from "@class/api/authorization/iam";
import { AUTHORIZATION_IAM_SCOPE_CONSTANT } from "@constant/class/authorization";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiAuthorizationDecisionType, EApiAuthorizationPrincipalType, EApiPolicyEffect, EApiPolicySourceType } from "@enum/class/authorization";
import { EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { describe, expect, it } from "vitest";
import { Column, Entity, Equal, IsNull, ManyToOne, Not, OneToMany, PrimaryColumn } from "typeorm";

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

const itemResourceDefinition: IApiAuthorizationResourceDefinition<EngineItemEntity> = {
	entity: EngineItemEntity,
	fields: [
		{ isFilterable: true, path: "resource.id", queryPath: "id" },
		{ isFilterable: true, path: "resource.operatorId", queryPath: "operatorId" },
		{ isFilterable: true, path: "resource.status", queryPath: "status" },
		{ isFilterable: false, path: "resource.secret", queryPath: "secret" },
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

const evaluate = async (options: { action?: string; boundaryStatements?: ReadonlyArray<IApiPolicyStatement>; requestMetadata?: IApiAuthorizationRequestMetadata<EngineItemEntity>; resource?: EngineItemEntity; resourceDefinition?: IApiAuthorizationResourceDefinition<EngineItemEntity>; routeType?: EApiRouteType; statements: ReadonlyArray<IApiPolicyStatement> }) => {
	const documents = [{ document: { Statement: options.statements, Version: "2012-10-17" }, id: "identity", namespace: "admin:item", sourceType: EApiPolicySourceType.MANAGED, version: "1" }, ...(options.boundaryStatements ? [{ document: { Statement: options.boundaryStatements, Version: "2012-10-17" }, id: "boundary", namespace: "admin:item", sourceType: EApiPolicySourceType.MANAGED, version: "1" }] : [])];

	return await new ApiAuthorizationIamEngine(new ApiAuthorizationIamQueryPlanner()).evaluate<EngineItemEntity>({
		action: options.action ?? "admin:item:list",
		attachments: {
			attachments: [{ policyId: "identity", principalId: principal.id, principalType: principal.type }],
			boundaries: options.boundaryStatements ? [{ policyId: "boundary", principalId: principal.id, principalType: principal.type }] : [],
		},
		documents,
		policyNamespace: "admin:item",
		principal,
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
			["an unsupported operator", { StringLike: { "resource.status": "a*" } }],
			["a non-filterable field", { StringEquals: { "resource.secret": "value" } }],
			["an unresolved variable", { StringEquals: { "resource.status": "${principal.attributes.missing}" } }],
			["an empty string", { StringNotEquals: { "resource.status": "" } }],
			["an object value", { StringEquals: { "resource.status": { nested: true } } }],
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

		it("fails closed on an unknown operator that bypassed document validation", async () => {
			const denyDecision = await evaluate({ statements: [allowAll, deny({ Condition: { StringLike: { "principal.id": "other*" } } })] });
			const allowDecision = await evaluate({ statements: [{ ...allowAll, Condition: { StringLike: { "principal.id": "user*" } } }] });

			expect(denyDecision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
			expect(allowDecision.trace.decisionType).toBe(EApiAuthorizationDecisionType.IMPLICIT_DENY);
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
			["a whole-resource variable", { StringEquals: { "principal.attributes.missing": "${resource}" } }],
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
			const denyDecision = await evaluate({ statements: [allowAll, deny({ Condition: { StringEquals: { "principal.attributes.operatorId": "${principal.attributes.missing}" } } })] });
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
		it.each(["StringNotEquals", "StringNotEqualsIfExists"])("leaves an Allow with a %s resource key unmatched", async (operator: string) => {
			const decision = await evaluate({ statements: [{ ...allowAll, Condition: { [operator]: { "resource.status": "archived" } } }] });

			expect(decision.trace.decisionType).toBe(EApiAuthorizationDecisionType.IMPLICIT_DENY);
			expect(decision.trace.statements?.[0]?.isMatched).toBe(false);
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

		it.each([
			["a list", ["archived"]],
			["an object", { value: "archived" }],
			["null", null],
		])("fails closed on %s operand in memory", async (_name: string, operand: unknown) => {
			const options = { action: "admin:item:read", resource: { id: "item-1", operatorId: "operator-1", secret: "s", status: "archived", tenantId: "t" }, routeType: EApiRouteType.GET };
			const denyDecision = await evaluate({ ...options, statements: [allowAll, deny({ Condition: { StringNotEquals: { "resource.status": operand } } })] });
			const allowDecision = await evaluate({ ...options, statements: [{ ...allowAll, Condition: { StringEquals: { "resource.status": operand } } }] });

			expect(denyDecision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
			expect(allowDecision.trace.decisionType).toBe(EApiAuthorizationDecisionType.IMPLICIT_DENY);
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
			const decision = await evaluate({ statements: [allowAll, deny({ Resource: ["gameport:other/item-1", "gameport:admin:item/a*b"] })] });

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
			expect(resolvedTenantDecision.scope).toEqual({ where: [{ id: Not(Equal("item-1")) }, { id: IsNull() }] });
			expect(ambiguousPrefixDecision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
			expect(ambiguousExactDecision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
		});

		it("keeps an exact resource Deny on a row route a whole-request deny", async () => {
			const deniedDecision = await evaluate({ action: "admin:item:read", requestMetadata: { parameters: { id: "item-1" } }, routeType: EApiRouteType.GET, statements: [allowAll, deny({ Resource: ["gameport:admin:item/item-1"] })] });
			const otherDecision = await evaluate({ action: "admin:item:read", requestMetadata: { parameters: { id: "item-2" } }, routeType: EApiRouteType.GET, statements: [allowAll, deny({ Resource: ["gameport:admin:item/item-1"] })] });

			expect(deniedDecision.trace.decisionType).toBe(EApiAuthorizationDecisionType.EXPLICIT_DENY);
			expect(otherDecision.effect).toBe(EApiPolicyEffect.ALLOW);
			expect(otherDecision.scope).toBeUndefined();
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

		it("does not compile row patterns outside list routes", async () => {
			const decision = await evaluate({ action: "admin:item:create", routeType: EApiRouteType.CREATE, statements: [allowAll, deny({ Resource: ["gameport:admin:item/item-1"] })] });

			expect(decision.effect).toBe(EApiPolicyEffect.ALLOW);
			expect(decision.scope).toBeUndefined();
		});
	});
});
