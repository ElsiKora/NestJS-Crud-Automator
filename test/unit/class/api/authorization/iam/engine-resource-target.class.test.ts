import type { IApiAuthorizationIamDialect, IApiAuthorizationPrincipal, IApiAuthorizationRequestMetadata, IApiAuthorizationResourceDefinition, IApiPolicyStatement } from "@interface/class/api/authorization";
import type { FindOperator } from "typeorm";

import { ApiAuthorizationIamEngine, ApiAuthorizationIamQueryPlanner } from "@class/api/authorization/iam";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiAuthorizationDecisionType, EApiAuthorizationIamDialect, EApiAuthorizationPrincipalType, EApiPolicyEffect, EApiPolicySourceType } from "@enum/class/authorization";
import { EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { describe, expect, it } from "vitest";
import { Column, Entity, Equal, IsNull, Not, PrimaryColumn } from "typeorm";

const describeText = (description: string): PropertyDecorator =>
	ApiPropertyDescribe({
		description,
		exampleValue: "value",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	});

@Entity("engine_target_items")
class EngineTargetItemEntity {
	@PrimaryColumn({ type: "varchar" })
	@describeText("id")
	public id!: string;

	@Column({ type: "varchar" })
	public status!: string;

	@Column({ nullable: true, type: "varchar" })
	@describeText("tenantId")
	public tenantId!: null | string;
}

@Entity("engine_target_ranks")
class EngineTargetRankEntity {
	@PrimaryColumn({ type: "int" })
	public id!: number;
}

@Entity("engine_target_devices")
class EngineTargetDeviceEntity {
	@PrimaryColumn({ type: "uuid" })
	public id!: string;

	@Column({ type: "uuid" })
	public tenantId!: string;
}

const itemDefinition: IApiAuthorizationResourceDefinition<EngineTargetItemEntity> = {
	entity: EngineTargetItemEntity,
	fields: [
		{ isFilterable: true, path: "resource.id", queryPath: "id" },
		{ isFilterable: true, path: "resource.status", queryPath: "status" },
		{ isFilterable: true, path: "resource.tenantId", queryPath: "tenantId" },
	],
	namespace: "admin:item",
	resourcePath: "gameport:admin:item/{id}",
	resourceType: "gameport:admin:item",
};

const tenantDefinition: IApiAuthorizationResourceDefinition<EngineTargetItemEntity> = { ...itemDefinition, resourcePath: "gameport:tenant/{tenantId}/item/{id}" };

const principal: IApiAuthorizationPrincipal = { attributes: { itemId: "item-1" }, id: "user-1", roles: [], type: EApiAuthorizationPrincipalType.USER };
const POSTGRES: IApiAuthorizationIamDialect = { driverType: "postgres", type: EApiAuthorizationIamDialect.POSTGRES };
const SQLITE: IApiAuthorizationIamDialect = { driverType: "better-sqlite3", type: EApiAuthorizationIamDialect.SQLITE };
const allowAll: IApiPolicyStatement = { Action: ["admin:item:*"], Effect: EApiPolicyEffect.ALLOW, Resource: ["*"] };
const allow = (statement: Partial<IApiPolicyStatement>): IApiPolicyStatement => ({ Action: ["admin:item:*"], Effect: EApiPolicyEffect.ALLOW, ...statement });
const deny = (statement: Partial<IApiPolicyStatement>): IApiPolicyStatement => ({ Action: ["admin:item:*"], Effect: EApiPolicyEffect.DENY, ...statement });

interface IRequest {
	action: string;
	dialect?: IApiAuthorizationIamDialect;
	requestMetadata?: IApiAuthorizationRequestMetadata<EngineTargetItemEntity>;
	resource?: EngineTargetItemEntity;
	resourceDefinition?: IApiAuthorizationResourceDefinition<EngineTargetItemEntity>;
	routeType?: EApiRouteType;
}

const LIST: IRequest = { action: "admin:item:list", routeType: EApiRouteType.GET_LIST };
const CREATE: IRequest = { action: "admin:item:create", routeType: EApiRouteType.CREATE };
const read = (id: string): IRequest => ({ action: "admin:item:read", requestMetadata: { parameters: { id } }, routeType: EApiRouteType.GET });
const update = (id: string): IRequest => ({ action: "admin:item:update", requestMetadata: { parameters: { id } }, routeType: EApiRouteType.UPDATE });

const evaluate = async (request: IRequest, statements: ReadonlyArray<IApiPolicyStatement>) =>
	await new ApiAuthorizationIamEngine(new ApiAuthorizationIamQueryPlanner()).evaluate<EngineTargetItemEntity>({
		action: request.action,
		attachments: { attachments: [{ policyId: "identity", principalId: principal.id, principalType: principal.type }], boundaries: [] },
		dialect: request.dialect ?? POSTGRES,
		documents: [{ document: { Statement: statements, Version: "2012-10-17" }, id: "identity", namespace: "admin:item", sourceType: EApiPolicySourceType.MANAGED, version: "1" }],
		policyNamespace: "admin:item",
		principal,
		requestMetadata: request.requestMetadata ?? {},
		resource: request.resource,
		resourceDefinition: request.resourceDefinition ?? itemDefinition,
		routeType: request.routeType,
	});

const readType = async (request: IRequest, statements: ReadonlyArray<IApiPolicyStatement>): Promise<EApiAuthorizationDecisionType | undefined> => (await evaluate(request, statements)).trace.decisionType;

const ALLOWED: EApiAuthorizationDecisionType = EApiAuthorizationDecisionType.EXPLICIT_ALLOW;
const DENIED: EApiAuthorizationDecisionType = EApiAuthorizationDecisionType.EXPLICIT_DENY;
const IMPLICIT: EApiAuthorizationDecisionType = EApiAuthorizationDecisionType.IMPLICIT_DENY;

describe("ApiAuthorizationIamEngine resource targets", () => {
	describe("NotAction", () => {
		it.each([
			["the named action", ["admin:item:read"], "admin:item:read", IMPLICIT],
			["another action", ["admin:item:read"], "admin:item:delete", ALLOWED],
			["one of several", ["admin:item:delete", "admin:item:read"], "admin:item:read", IMPLICIT],
			["a wildcard over the action", ["admin:item:*"], "admin:item:read", IMPLICIT],
			["an interior wildcard over the action", ["admin:*:read"], "admin:item:read", IMPLICIT],
			["? over the action", ["admin:item:rea?"], "admin:item:read", IMPLICIT],
			["a pattern that matches every action", ["*"], "admin:item:read", IMPLICIT],
			["a pattern that misses the action", ["admin:*:delete"], "admin:item:read", ALLOWED],
		])("reads an Allow with %s", async (_name: string, NotAction: Array<string>, action: string, expected: EApiAuthorizationDecisionType) => {
			expect(await readType({ action, requestMetadata: { parameters: { id: "item-1" } }, routeType: EApiRouteType.GET }, [{ Effect: EApiPolicyEffect.ALLOW, NotAction, Resource: ["*"] }])).toBe(expected);
		});

		it.each([
			["the named action", ["admin:item:read"], "admin:item:read", ALLOWED],
			["another action", ["admin:item:read"], "admin:item:delete", DENIED],
			["a wildcard over the action", ["admin:item:*"], "admin:item:read", ALLOWED],
			["a pattern that misses the action", ["admin:*:delete"], "admin:item:read", DENIED],
		])("reads a Deny with %s", async (_name: string, NotAction: Array<string>, action: string, expected: EApiAuthorizationDecisionType) => {
			expect(await readType({ action, requestMetadata: { parameters: { id: "item-1" } }, routeType: EApiRouteType.GET }, [allowAll, { Effect: EApiPolicyEffect.DENY, NotAction, Resource: ["*"] }])).toBe(expected);
		});

		it("applies to a list and a create like any action", async () => {
			expect(await readType(LIST, [{ Effect: EApiPolicyEffect.ALLOW, NotAction: ["admin:item:read"], Resource: ["*"] }])).toBe(ALLOWED);
			expect(await readType(LIST, [{ Effect: EApiPolicyEffect.ALLOW, NotAction: ["admin:item:list"], Resource: ["*"] }])).toBe(IMPLICIT);
			expect(await readType(CREATE, [allowAll, { Effect: EApiPolicyEffect.DENY, NotAction: ["admin:item:read"], Resource: ["*"] }])).toBe(DENIED);
			expect(await readType(CREATE, [allowAll, { Effect: EApiPolicyEffect.DENY, NotAction: ["admin:item:create"], Resource: ["*"] }])).toBe(ALLOWED);
		});

		it("still needs its Condition", async () => {
			expect(await readType(read("item-1"), [{ Condition: { StringEquals: { "principal.id": "user-1" } }, Effect: EApiPolicyEffect.ALLOW, NotAction: ["admin:item:delete"], Resource: ["*"] }])).toBe(ALLOWED);
			expect(await readType(read("item-1"), [{ Condition: { StringEquals: { "principal.id": "other" } }, Effect: EApiPolicyEffect.ALLOW, NotAction: ["admin:item:delete"], Resource: ["*"] }])).toBe(IMPLICIT);
		});

		it("scopes a list with the resource keys of a Deny", async () => {
			const decision = await evaluate(LIST, [allowAll, { Condition: { StringEquals: { "resource.status": "archived" } }, Effect: EApiPolicyEffect.DENY, NotAction: ["admin:item:read"], Resource: ["*"] }]);

			expect(decision.scope).toEqual({ where: [{ status: Not(Equal("archived")) }, { status: IsNull() }] });
		});
	});

	describe("NotResource on a named row", () => {
		it.each([
			["the named row", ["gameport:admin:item/item-1"], "item-1", IMPLICIT],
			["another row", ["gameport:admin:item/item-1"], "item-2", ALLOWED],
			["one of several", ["gameport:admin:item/item-2", "gameport:admin:item/item-1"], "item-1", IMPLICIT],
			["a wildcard over the row", ["gameport:admin:item/item-*"], "item-1", IMPLICIT],
			["? over the row", ["gameport:admin:item/item-?"], "item-1", IMPLICIT],
			["every row", ["gameport:admin:item/*"], "item-1", IMPLICIT],
			["another resource type", ["gameport:other/*"], "item-1", ALLOWED],
		])("reads an Allow with %s", async (_name: string, NotResource: Array<string>, id: string, expected: EApiAuthorizationDecisionType) => {
			expect(await readType(read(id), [allow({ NotResource })])).toBe(expected);
		});

		it.each([
			["the named row", ["gameport:admin:item/item-1"], "item-1", ALLOWED],
			["another row", ["gameport:admin:item/item-1"], "item-2", DENIED],
			["one of several", ["gameport:admin:item/item-2", "gameport:admin:item/item-1"], "item-1", ALLOWED],
			["a wildcard over the row", ["gameport:admin:item/item-*"], "item-1", ALLOWED],
			["every row", ["gameport:admin:item/*"], "item-1", ALLOWED],
			["another resource type", ["gameport:other/*"], "item-1", DENIED],
		])("reads a Deny with %s", async (_name: string, NotResource: Array<string>, id: string, expected: EApiAuthorizationDecisionType) => {
			expect(await readType({ ...read(id), dialect: SQLITE }, [allowAll, deny({ NotResource })])).toBe(expected);
		});

		it("reads the row of a path value from its column, which a dialect that cannot keep it exactly fails closed", async () => {
			const statements: Array<IApiPolicyStatement> = [allowAll, deny({ NotResource: ["gameport:admin:item/item-*"] })];
			const decision = await evaluate({ ...read("item-1"), dialect: SQLITE }, statements);

			expect(decision.trace.decisionType).toBe(ALLOWED);
			expect(decision.scope?.where).toBeDefined();
			expect(await readType(read("item-1"), statements)).toBe(DENIED);
		});

		it("reads a value that holds a separator of the resource path as no resource", async () => {
			expect(await readType(read("a/b"), [allowAll])).toBe(IMPLICIT);
			expect(await readType(read("a/b"), [allowAll, deny({ Resource: ["gameport:other/*"] })])).toBe(DENIED);
			expect(await readType({ ...LIST, requestMetadata: { parameters: { tenantId: "t-1/item/x" } }, resourceDefinition: tenantDefinition }, [allowAll])).toBe(IMPLICIT);
			// A loaded row is read as a list reads it, so a stored value that holds a separator is matched as its text.
			expect(await readType({ ...read("x"), resource: { id: "x", status: "active", tenantId: "t-1/item/y" } as EngineTargetItemEntity, resourceDefinition: tenantDefinition }, [allowAll])).toBe(ALLOWED);
			expect(await readType({ ...CREATE, requestMetadata: { body: { id: "c/d" } } }, [allowAll])).toBe(IMPLICIT);
		});

		it("reads a row loaded for an update the same way", async () => {
			const resource = { id: "item-1", status: "active", tenantId: "t-1" } as EngineTargetItemEntity;

			expect(await readType({ ...update("item-1"), resource }, [allow({ NotResource: ["gameport:admin:item/item-1"] })])).toBe(IMPLICIT);
			expect(await readType({ ...update("item-1"), resource }, [allow({ NotResource: ["gameport:admin:item/item-2"] })])).toBe(ALLOWED);
			expect(await readType({ ...update("item-1"), resource }, [allowAll, deny({ NotResource: ["gameport:admin:item/item-2"] })])).toBe(DENIED);
			expect(await readType({ ...update("item-1"), resource }, [allowAll, deny({ NotResource: ["gameport:admin:item/item-1"] })])).toBe(ALLOWED);
		});

		it("renders a NULL placeholder as an empty slot on a loaded row", async () => {
			const resource = { id: "item-1", status: "active", tenantId: null } as EngineTargetItemEntity;
			const request: IRequest = { action: "admin:item:read", resource, resourceDefinition: tenantDefinition, routeType: EApiRouteType.GET };

			expect(await readType(request, [allow({ NotResource: ["gameport:tenant//item/item-1"] })])).toBe(IMPLICIT);
			expect(await readType(request, [allow({ NotResource: ["gameport:tenant/?/item/item-1"] })])).toBe(ALLOWED);
			expect(await readType(request, [allowAll, deny({ NotResource: ["gameport:tenant//item/item-1"] })])).toBe(ALLOWED);
		});

		it("fails a loaded row closed when a placeholder has no text", async () => {
			const resource = { id: { nested: true }, status: "active", tenantId: "t-1" } as unknown as EngineTargetItemEntity;
			const request: IRequest = { action: "admin:item:read", resource, routeType: EApiRouteType.GET };

			expect(await readType(request, [allow({ NotResource: ["gameport:admin:item/item-1"] })])).toBe(IMPLICIT);
			expect(await readType(request, [allowAll, deny({ NotResource: ["gameport:admin:item/item-1"] })])).toBe(DENIED);
			expect(await readType(request, [allowAll, deny({ Resource: ["gameport:admin:item/item-1"] })])).toBe(DENIED);
			expect(await readType(request, [allow({ Resource: ["gameport:admin:item/item-1"] })])).toBe(IMPLICIT);
		});
	});

	describe("NotResource on a list", () => {
		it("allows every row for an Allow that excludes none of them", async () => {
			const decision = await evaluate(LIST, [allow({ NotResource: ["gameport:other/*"] })]);

			expect(decision.trace.decisionType).toBe(ALLOWED);
			expect(decision.scope).toBeUndefined();
		});

		it("grants nothing for an Allow that excludes every row", async () => {
			expect(await readType(LIST, [allow({ NotResource: ["gameport:admin:item/*"] })])).toBe(IMPLICIT);
			expect(await readType(LIST, [allow({ NotResource: ["gameport:admin:item/item-1", "*"] })])).toBe(IMPLICIT);
		});

		it("scopes a list to the rows an Allow does not exclude, NULL included", async () => {
			const decision = await evaluate(LIST, [allow({ NotResource: ["gameport:admin:item/item-1"] })]);

			expect(decision.scope).toEqual({ where: [{ id: Not(Equal("item-1")) }, { id: IsNull() }] });
		});

		it("scopes a list to the rows no pattern of an Allow excludes", async () => {
			const decision = await evaluate(LIST, [allow({ NotResource: ["gameport:admin:item/item-1", "gameport:admin:item/item-2", "gameport:other/x"] })]);

			expect(decision.trace.decisionType).toBe(ALLOWED);
			expect(decision.scope?.where).toHaveLength(4);
		});

		it("ANDs an Allow's rows with its resource keys", async () => {
			const decision = await evaluate(LIST, [allow({ Condition: { StringEquals: { "resource.status": "active" } }, NotResource: ["gameport:admin:item/item-1"] })]);

			expect(decision.scope).toEqual({
				where: [
					{ id: Not(Equal("item-1")), status: "active" },
					{ id: IsNull(), status: "active" },
				],
			});
		});

		it("keeps only the rows a Deny excludes itself from", async () => {
			const decision = await evaluate(LIST, [allowAll, deny({ NotResource: ["gameport:admin:item/item-1"] })]);

			expect(decision.trace.decisionType).toBe(ALLOWED);
			expect(decision.scope).toEqual({ where: { id: Equal("item-1") } });
		});

		it("keeps the rows of every pattern of a Deny", async () => {
			const decision = await evaluate(LIST, [allowAll, deny({ NotResource: ["gameport:admin:item/item-1", "gameport:admin:item/item-2"] })]);

			expect(decision.scope?.where).toHaveLength(2);
		});

		it("keeps the rows a Deny's resource keys fail on too", async () => {
			const decision = await evaluate(LIST, [allowAll, deny({ Condition: { StringEquals: { "resource.status": "archived" } }, NotResource: ["gameport:admin:item/item-1"] })]);

			expect(decision.scope).toEqual({ where: [{ id: Equal("item-1") }, { status: Not(Equal("archived")) }, { status: IsNull() }] });
		});

		it("denies the whole list for a Deny whose patterns miss every row", async () => {
			expect(await readType(LIST, [allowAll, deny({ NotResource: ["gameport:other/*"] })])).toBe(DENIED);
		});

		it("leaves a list alone for a Deny whose pattern covers every row", async () => {
			const decision = await evaluate(LIST, [allowAll, deny({ NotResource: ["gameport:admin:item/*"] })]);

			expect(decision.trace.decisionType).toBe(ALLOWED);
			expect(decision.scope).toBeUndefined();
		});

		it("fails a Deny closed on a dialect that cannot keep the rows exactly, and compiles it on one that can", async () => {
			const statements: Array<IApiPolicyStatement> = [allowAll, deny({ NotResource: ["gameport:admin:item/item-*"] })];

			expect(await readType({ ...LIST, dialect: { type: EApiAuthorizationIamDialect.PORTABLE } }, statements)).toBe(DENIED);
			expect(await readType({ ...LIST, dialect: POSTGRES }, statements)).toBe(ALLOWED);
			expect(await readType({ ...LIST, dialect: SQLITE }, statements)).toBe(ALLOWED);
			expect(await readType({ ...LIST, dialect: { type: EApiAuthorizationIamDialect.UNRESOLVED } }, statements)).toBe(DENIED);
		});

		it("grants nothing for an Allow whose rows have no one mapping, and denies for a Deny", async () => {
			const request: IRequest = { ...LIST, dialect: POSTGRES, resourceDefinition: tenantDefinition };
			const ambiguous: Array<string> = ["gameport:tenant/t-1/item/a/item/b"];

			expect(await readType(request, [allow({ NotResource: ambiguous })])).toBe(IMPLICIT);
			expect(await readType(request, [allowAll, deny({ NotResource: ambiguous })])).toBe(DENIED);
		});

		it("grants nothing for an Allow, and denies for a Deny, on a placeholder that is not filterable", async () => {
			const request: IRequest = { ...LIST, resourceDefinition: { ...itemDefinition, fields: itemDefinition.fields.filter((field) => field.path !== "resource.id") } };

			expect(await readType(request, [allow({ NotResource: ["gameport:admin:item/item-1"] })])).toBe(IMPLICIT);
			expect(await readType(request, [allowAll, deny({ NotResource: ["gameport:admin:item/item-1"] })])).toBe(DENIED);
		});
	});

	describe("NotResource on a create, which names no row", () => {
		it.each([
			["misses every row", ["gameport:other/*"], ALLOWED, DENIED],
			["covers every row", ["gameport:admin:item/*"], IMPLICIT, ALLOWED],
			["names some rows", ["gameport:admin:item/item-1"], IMPLICIT, DENIED],
			["has a wildcard over some rows", ["gameport:admin:item/item-*"], IMPLICIT, DENIED],
		])("reads a pattern that %s", async (_name: string, NotResource: Array<string>, onAllow: EApiAuthorizationDecisionType, onDeny: EApiAuthorizationDecisionType) => {
			expect(await readType(CREATE, [allow({ NotResource })])).toBe(onAllow);
			expect(await readType(CREATE, [allowAll, deny({ NotResource })])).toBe(onDeny);
		});
	});

	describe("variables in NotResource", () => {
		const resolved: Array<string> = ["gameport:admin:item/${principal.attributes.itemId}"];
		const unresolved: Array<string> = ["gameport:admin:item/${principal.attributes.missing}"];
		const withDefault: Array<string> = ["gameport:admin:item/${principal.attributes.missing, 'item-1'}"];

		it.each([
			["a named row", (): IRequest => read("item-1")],
			["another row", (): IRequest => read("item-2")],
			["a list", (): IRequest => LIST],
			["a create", (): IRequest => CREATE],
		])("fails closed on %s when the variable does not resolve", async (_name: string, createRequest: () => IRequest) => {
			expect(await readType(createRequest(), [allow({ NotResource: unresolved })])).toBe(IMPLICIT);
			expect(await readType(createRequest(), [allowAll, deny({ NotResource: unresolved })])).toBe(DENIED);
		});

		it("fails closed when any one pattern does not resolve", async () => {
			const patterns: Array<string> = ["gameport:other/x", ...unresolved];

			expect(await readType(read("item-2"), [allow({ NotResource: patterns })])).toBe(IMPLICIT);
			expect(await readType(read("item-2"), [allowAll, deny({ NotResource: patterns })])).toBe(DENIED);
			expect(await readType(LIST, [allow({ NotResource: patterns })])).toBe(IMPLICIT);
			expect(await readType(LIST, [allowAll, deny({ NotResource: patterns })])).toBe(DENIED);
		});

		it("does not let a Condition that fails make an unresolved Deny hold", async () => {
			expect(await readType(read("item-2"), [allowAll, deny({ Condition: { StringEquals: { "principal.id": "other" } }, NotResource: unresolved })])).toBe(ALLOWED);
		});

		it("reads a resolved variable and a default as the text they render", async () => {
			for (const NotResource of [resolved, withDefault]) {
				expect(await readType(read("item-1"), [allow({ NotResource })])).toBe(IMPLICIT);
				expect(await readType(read("item-2"), [allow({ NotResource })])).toBe(ALLOWED);
				expect(await readType(read("item-1"), [allowAll, deny({ NotResource })])).toBe(ALLOWED);
				expect(await readType(read("item-2"), [allowAll, deny({ NotResource })])).toBe(DENIED);
				expect((await evaluate(LIST, [allow({ NotResource })])).scope).toEqual({ where: [{ id: Not(Equal("item-1")) }, { id: IsNull() }] });
				expect((await evaluate(LIST, [allowAll, deny({ NotResource })])).scope).toEqual({ where: { id: Equal("item-1") } });
			}
		});

		it("reads a resolved wildcard text as a literal", async () => {
			const statement: IApiPolicyStatement = allow({ NotResource: ["gameport:admin:item/${principal.attributes.pattern, '*'}"] });

			expect(await readType(read("item-1"), [statement])).toBe(ALLOWED);
			expect(await readType(read("*"), [statement])).toBe(IMPLICIT);
		});

		it("makes a positive Resource with an unresolved variable grant nothing and deny", async () => {
			expect(await readType(LIST, [allow({ Resource: unresolved })])).toBe(IMPLICIT);
			expect(await readType(LIST, [allowAll, deny({ Resource: unresolved })])).toBe(DENIED);
		});
	});

	describe("Allow with row patterns", () => {
		it("scopes a list to the row an exact pattern names", async () => {
			const decision = await evaluate(LIST, [allow({ Resource: ["gameport:admin:item/item-1"] })]);

			expect(decision.trace.decisionType).toBe(ALLOWED);
			expect(decision.scope).toEqual({ where: { id: "item-1" } });
		});

		it("ORs the rows of several patterns and of several statements", async () => {
			const onePattern = await evaluate(LIST, [allow({ Resource: ["gameport:admin:item/item-1", "gameport:admin:item/item-2", "gameport:other/x"] })]);
			const twoStatements = await evaluate(LIST, [allow({ Resource: ["gameport:admin:item/item-1"] }), allow({ Resource: ["gameport:admin:item/item-2"] })]);

			expect(onePattern.scope?.where).toHaveLength(2);
			expect(twoStatements.scope?.where).toHaveLength(2);
		});

		it("is widened by a statement that allows every row", async () => {
			expect((await evaluate(LIST, [allow({ Resource: ["gameport:admin:item/item-1"] }), allowAll])).scope).toBeUndefined();
			expect((await evaluate(LIST, [allow({ Resource: ["gameport:admin:item/item-1", "gameport:admin:item/*"] })])).scope).toBeUndefined();
		});

		it("ANDs its rows with its resource keys", async () => {
			const decision = await evaluate(LIST, [allow({ Condition: { StringEquals: { "resource.status": "active" } }, Resource: ["gameport:admin:item/item-1"] })]);

			expect(decision.scope).toEqual({ where: { id: "item-1", status: "active" } });
		});

		it("grants nothing when its Condition on the principal fails", async () => {
			expect(await readType(LIST, [allow({ Condition: { StringEquals: { "principal.id": "other" } }, Resource: ["gameport:admin:item/item-1"] })])).toBe(IMPLICIT);
		});

		it("is narrowed by a Deny on rows", async () => {
			const decision = await evaluate(LIST, [allow({ Resource: ["gameport:admin:item/item-1", "gameport:admin:item/item-2"] }), deny({ Resource: ["gameport:admin:item/item-2"] })]);

			expect(decision.trace.decisionType).toBe(ALLOWED);
			expect(decision.scope?.where).toBeDefined();
		});

		it("scopes a list on two placeholders", async () => {
			const decision = await evaluate({ ...LIST, resourceDefinition: tenantDefinition }, [allow({ Resource: ["gameport:tenant/t-1/item/item-1"] })]);

			expect(decision.scope).toEqual({ where: { id: "item-1", tenantId: "t-1" } });
		});

		it("reads a placeholder the route resolved as a literal", async () => {
			const decision = await evaluate({ ...LIST, requestMetadata: { parameters: { tenantId: "t-1" } }, resourceDefinition: tenantDefinition }, [allow({ Resource: ["gameport:tenant/t-1/item/item-1"] })]);
			const otherTenant = await evaluate({ ...LIST, requestMetadata: { parameters: { tenantId: "t-2" } }, resourceDefinition: tenantDefinition }, [allow({ Resource: ["gameport:tenant/t-1/item/item-1"] })]);

			// The tenant the path names is compared on the stored column too, exactly, not only by the text of the path.
			expect(decision.scope).toEqual({ where: { id: "item-1", tenantId: "t-1" } });
			expect(otherTenant.trace.decisionType).toBe(IMPLICIT);
		});

		it("compiles a glob on a dialect that matches it exactly, and grants nothing on one that does not", async () => {
			const statements: Array<IApiPolicyStatement> = [allow({ Resource: ["gameport:admin:item/item-*"] })];

			expect(await readType({ ...LIST, dialect: POSTGRES }, statements)).toBe(ALLOWED);
			expect(await readType({ ...LIST, dialect: SQLITE }, statements)).toBe(ALLOWED);
			expect(await readType({ ...LIST, dialect: { type: EApiAuthorizationIamDialect.PORTABLE } }, statements)).toBe(IMPLICIT);
			expect(await readType({ ...LIST, dialect: { type: EApiAuthorizationIamDialect.UNRESOLVED } }, statements)).toBe(IMPLICIT);
		});

		it("grants nothing by a pattern with no one mapping to rows", async () => {
			expect(await readType({ ...LIST, dialect: POSTGRES, resourceDefinition: tenantDefinition }, [allow({ Resource: ["gameport:tenant/*/item/item-1"] })])).toBe(IMPLICIT);
		});

		it("grants nothing on a placeholder that is not filterable", async () => {
			const request: IRequest = { ...LIST, resourceDefinition: { ...itemDefinition, fields: itemDefinition.fields.filter((field) => field.path !== "resource.id") } };

			expect(await readType(request, [allow({ Resource: ["gameport:admin:item/item-1"] })])).toBe(IMPLICIT);
		});

		it("grants nothing on a pattern that misses every row", async () => {
			expect(await readType(LIST, [allow({ Resource: ["gameport:other/item-1"] })])).toBe(IMPLICIT);
		});

		it("answers a read of the row it names and refuses another", async () => {
			const statements: Array<IApiPolicyStatement> = [allow({ Resource: ["gameport:admin:item/item-1"] })];

			// The read loads the row the stored id names exactly, so another spelling of it that a collation matches is not found.
			expect((await evaluate(read("item-1"), statements)).scope).toEqual({ where: { id: "item-1" } });
			expect(await readType(read("item-1"), statements)).toBe(ALLOWED);
			expect(await readType(read("item-2"), statements)).toBe(IMPLICIT);
			expect((await evaluate(read("ITEM-1"), statements)).trace.decisionType).toBe(IMPLICIT);
		});

		it("grants nothing on a create, which names no row", async () => {
			expect(await readType(CREATE, [allow({ Resource: ["gameport:admin:item/item-1"] })])).toBe(IMPLICIT);
			expect(await readType(CREATE, [allow({ Resource: ["gameport:admin:item/item-*"] })])).toBe(IMPLICIT);
			expect(await readType(CREATE, [allow({ Resource: ["gameport:admin:item/*"] })])).toBe(ALLOWED);
		});

		it("scopes a boundary as it scopes an identity", async () => {
			const decision = await new ApiAuthorizationIamEngine(new ApiAuthorizationIamQueryPlanner()).evaluate<EngineTargetItemEntity>({
				action: "admin:item:list",
				attachments: { attachments: [{ policyId: "identity", principalId: principal.id, principalType: principal.type }], boundaries: [{ policyId: "boundary", principalId: principal.id, principalType: principal.type }] },
				dialect: POSTGRES,
				documents: [
					{ document: { Statement: [allowAll], Version: "2012-10-17" }, id: "identity", namespace: "admin:item", sourceType: EApiPolicySourceType.MANAGED, version: "1" },
					{ document: { Statement: [allow({ NotResource: ["gameport:admin:item/item-1"] })], Version: "2012-10-17" }, id: "boundary", namespace: "admin:item", sourceType: EApiPolicySourceType.MANAGED, version: "1" },
				],
				policyNamespace: "admin:item",
				principal,
				requestMetadata: {},
				resourceDefinition: itemDefinition,
				routeType: EApiRouteType.GET_LIST,
			});

			expect(decision.scope).toEqual({ where: [{ id: Not(Equal("item-1")) }, { id: IsNull() }] });
		});
	});

	describe("a path value with no filterable field", () => {
		const withoutId = (fields: IApiAuthorizationResourceDefinition<EngineTargetItemEntity>["fields"]): IApiAuthorizationResourceDefinition<EngineTargetItemEntity> => ({ ...itemDefinition, fields });
		const others: IApiAuthorizationResourceDefinition<EngineTargetItemEntity>["fields"] = itemDefinition.fields.filter((field) => field.path !== "resource.id");

		const DEFINITIONS: Array<[string, IApiAuthorizationResourceDefinition<EngineTargetItemEntity>]> = [
			["no field mapping", withoutId(others)],
			["a mapping that is not filterable", withoutId([{ isFilterable: false, path: "resource.id", queryPath: "id" }, ...others])],
		];

		describe.each(DEFINITIONS)("on a text column with %s", (_name: string, resourceDefinition: IApiAuthorizationResourceDefinition<EngineTargetItemEntity>) => {
			const on = (id: string): IRequest => ({ ...read(id), dialect: SQLITE, resourceDefinition });

			it("scopes the read a Deny of the row does not decide by its text", async () => {
				const decision = await evaluate(on("ITEM-1"), [allowAll, deny({ Resource: ["gameport:admin:item/item-1"] })]);

				expect(decision.trace.decisionType).toBe(ALLOWED);
				expect(decision.scope).toBeDefined();
			});

			it("denies the read of the exact spelling", async () => {
				expect(await readType(on("item-1"), [allowAll, deny({ Resource: ["gameport:admin:item/item-1"] })])).toBe(DENIED);
			});

			it("scopes the read an Allow of the row grants, and grants another spelling nothing", async () => {
				const statements: Array<IApiPolicyStatement> = [allow({ Resource: ["gameport:admin:item/item-1"] })];

				expect((await evaluate(on("item-1"), statements)).scope).toBeDefined();
				expect(await readType(on("item-1"), statements)).toBe(ALLOWED);
				expect(await readType(on("ITEM-1"), statements)).toBe(IMPLICIT);
			});

			it("keeps a list of such a placeholder closed", async () => {
				expect(await readType({ ...LIST, dialect: SQLITE, resourceDefinition }, [allow({ Resource: ["gameport:admin:item/item-1"] })])).toBe(IMPLICIT);
			});
		});

		describe("on a placeholder that resolves to no column", () => {
			const resourceDefinition: IApiAuthorizationResourceDefinition<EngineTargetItemEntity> = { ...itemDefinition, resourcePath: "gameport:admin:item/{ref}" };
			const on = (ref: string): IRequest => ({ action: "admin:item:read", dialect: SQLITE, requestMetadata: { parameters: { ref } }, resourceDefinition, routeType: EApiRouteType.GET });

			it.each([
				["the value it names", "item-1"],
				["a value it does not name", "item-2"],
			])("denies %s under a Deny that constrains it", async (_name: string, ref: string) => {
				expect(await readType(on(ref), [allowAll, deny({ Resource: ["gameport:admin:item/item-1"] })])).toBe(DENIED);
				expect(await readType(on(ref), [allowAll, deny({ Resource: ["gameport:admin:item/item-*"] })])).toBe(DENIED);
			});

			it("grants nothing by an Allow that constrains it", async () => {
				expect(await readType(on("item-1"), [allow({ Resource: ["gameport:admin:item/item-1"] })])).toBe(IMPLICIT);
				expect(await readType(on("item-1"), [allow({ NotResource: ["gameport:admin:item/item-2"] })])).toBe(IMPLICIT);
			});

			it("leaves a star over it unaffected", async () => {
				const decision = await evaluate(on("item-1"), [allow({ Resource: ["gameport:admin:item/*"] })]);

				expect(decision.trace.decisionType).toBe(ALLOWED);
				expect(decision.scope).toBeUndefined();
				expect(await readType(on("item-1"), [allowAll, deny({ Resource: ["gameport:other/*"] })])).toBe(ALLOWED);
			});

			it("fails closed on a mapping whose column does not resolve", async () => {
				const definition: IApiAuthorizationResourceDefinition<EngineTargetItemEntity> = { ...resourceDefinition, fields: [...resourceDefinition.fields, { isFilterable: true, path: "resource.ref", queryPath: "missing.column" }] };

				expect(await readType({ ...on("item-1"), resourceDefinition: definition }, [allow({ Resource: ["gameport:admin:item/item-1"] })])).toBe(IMPLICIT);
			});
		});

		it("keeps the text path of a column that is not text", async () => {
			const resourceDefinition: IApiAuthorizationResourceDefinition<EngineTargetItemEntity> = { ...itemDefinition, entity: EngineTargetRankEntity as never, fields: [] };
			const on = (id: string): IRequest => ({ ...read(id), dialect: SQLITE, resourceDefinition });
			const statements: Array<IApiPolicyStatement> = [allowAll, deny({ Resource: ["gameport:admin:item/7"] })];

			expect(await readType(on("7"), statements)).toBe(DENIED);
			expect(await readType(on("8"), statements)).toBe(ALLOWED);
			expect((await evaluate(on("8"), statements)).scope).toBeUndefined();
		});
	});

	describe("Deny with row patterns", () => {
		it("scopes a create to the rows a row pattern does not name, which the create reads back before it commits", async () => {
			expect((await evaluate(CREATE, [allowAll, deny({ Resource: ["gameport:admin:item/item-1"] })])).scope).toEqual({ where: [{ id: Not(Equal("item-1")) }, { id: IsNull() }] });
			expect((await evaluate({ ...CREATE, dialect: SQLITE }, [allowAll, deny({ Resource: ["gameport:admin:item/item-*"] })])).scope?.where).toHaveLength(2);
			expect((await evaluate(CREATE, [allowAll, deny({ Resource: ["gameport:admin:item/*-secret"] })])).scope?.where).toHaveLength(2);
			expect(await readType({ ...CREATE, resourceDefinition: tenantDefinition }, [allowAll, deny({ Resource: ["gameport:tenant/*/item/item-1"] })])).toBe(DENIED);
		});

		it("excludes the suffix a wildcard names", async () => {
			const decision = await evaluate(LIST, [allowAll, deny({ Resource: ["gameport:admin:item/*-secret"] })]);
			const where = decision.scope?.where as [{ id: FindOperator<unknown> }, { id: FindOperator<unknown> }];

			expect(decision.trace.decisionType).toBe(ALLOWED);
			expect(Object.values(where[0].id.objectLiteralParameters ?? {})).toEqual(["%-secret"]);
			expect(where[1]).toEqual({ id: IsNull() });
		});
	});

	describe("columns that are not text", () => {
		const rankDefinition: IApiAuthorizationResourceDefinition<EngineTargetItemEntity> = { entity: EngineTargetRankEntity, fields: [{ isFilterable: true, path: "resource.id", queryPath: "id" }], namespace: "admin:item", resourcePath: "gameport:admin:item/{id}", resourceType: "gameport:admin:item" } as unknown as IApiAuthorizationResourceDefinition<EngineTargetItemEntity>;
		const deviceDefinition: IApiAuthorizationResourceDefinition<EngineTargetItemEntity> = {
			entity: EngineTargetDeviceEntity,
			fields: [
				{ isFilterable: true, path: "resource.id", queryPath: "id" },
				{ isFilterable: true, path: "resource.tenantId", queryPath: "tenantId" },
			],
			namespace: "admin:item",
			resourcePath: "gameport:tenant/{tenantId}/item/{id}",
			resourceType: "gameport:admin:item",
		} as unknown as IApiAuthorizationResourceDefinition<EngineTargetItemEntity>;
		const UUID: string = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

		it("compiles an integer placeholder for an Allow, as an integer", async () => {
			expect(await readType({ ...LIST, dialect: POSTGRES, resourceDefinition: rankDefinition }, [allow({ Resource: ["gameport:admin:item/7"] })])).toBe(ALLOWED);
			expect(await readType({ ...LIST, dialect: POSTGRES, resourceDefinition: rankDefinition }, [allow({ NotResource: ["gameport:admin:item/7"] })])).toBe(ALLOWED);
			expect(await readType({ ...LIST, dialect: POSTGRES, resourceDefinition: rankDefinition }, [allowAll, deny({ NotResource: ["gameport:admin:item/7"] })])).toBe(ALLOWED);
		});

		it("reads text no integer renders as no row, without an SQL error", async () => {
			expect(await readType({ ...LIST, dialect: POSTGRES, resourceDefinition: rankDefinition }, [allow({ Resource: ["gameport:admin:item/abc"] })])).toBe(IMPLICIT);
			expect((await evaluate({ ...LIST, dialect: POSTGRES, resourceDefinition: rankDefinition }, [allowAll, deny({ Resource: ["gameport:admin:item/abc"] })])).scope).toBeUndefined();
			expect((await evaluate({ ...LIST, dialect: POSTGRES, resourceDefinition: rankDefinition }, [allow({ NotResource: ["gameport:admin:item/abc"] })])).scope).toBeUndefined();
			expect(await readType({ ...LIST, dialect: POSTGRES, resourceDefinition: rankDefinition }, [allowAll, deny({ NotResource: ["gameport:admin:item/abc"] })])).toBe(DENIED);
		});

		it("fails a wildcard on an integer placeholder closed", async () => {
			expect(await readType({ ...LIST, dialect: POSTGRES, resourceDefinition: rankDefinition }, [allow({ Resource: ["gameport:admin:item/1*"] })])).toBe(IMPLICIT);
			expect(await readType({ ...LIST, dialect: POSTGRES, resourceDefinition: rankDefinition }, [allowAll, deny({ Resource: ["gameport:admin:item/1*"] })])).toBe(DENIED);
		});

		it("decomposes a wildcard over a uuid slot only on PostgreSQL, whose column cannot hold the separator", async () => {
			const statements: Array<IApiPolicyStatement> = [allow({ Resource: [`gameport:tenant/*/item/${UUID}`] })];
			const decision = await evaluate({ ...LIST, dialect: POSTGRES, resourceDefinition: deviceDefinition }, statements);

			expect(decision.trace.decisionType).toBe(ALLOWED);
			expect(decision.scope?.where).toEqual({ id: UUID });
			expect(await readType({ ...LIST, dialect: SQLITE, resourceDefinition: deviceDefinition }, statements)).toBe(IMPLICIT);
		});
	});
});
