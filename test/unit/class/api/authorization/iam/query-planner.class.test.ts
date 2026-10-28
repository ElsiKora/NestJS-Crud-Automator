import type { IApiAuthorizationPrincipal, IApiAuthorizationResourceDefinition, IApiPolicyStatement } from "@interface/class/api/authorization";
import type { FindOperator } from "typeorm";

import { ApiAuthorizationIamQueryPlanner } from "@class/api/authorization/iam";
import { AUTHORIZATION_IAM_SCOPE_CONSTANT } from "@constant/class/authorization";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiAuthorizationPrincipalType, EApiPolicyEffect } from "@enum/class/authorization";
import { EApiPropertyDescribeType, EApiPropertyStringType } from "@enum/decorator/api";
import { describe, expect, it } from "vitest";
import { Equal, IsNull, Not } from "typeorm";

class PlannerItemEntity {
	@ApiPropertyDescribe({
		description: "id",
		exampleValue: "item-1",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public id!: string;

	@ApiPropertyDescribe({
		description: "external id",
		exampleValue: "9007199254740993",
		format: EApiPropertyStringType.BIGINT_STRING,
		maxLength: 20,
		minLength: 1,
		pattern: "/^[0-9]+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public externalId!: string;

	public operatorId!: string;
	public secret!: string;

	@ApiPropertyDescribe({
		description: "token",
		exampleValue: "6f1c0d4e-8d3f-4c55-9d7b-1b9a5d2f4e10",
		format: EApiPropertyStringType.UUID,
		maxLength: 36,
		minLength: 36,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public token!: string;

	@ApiPropertyDescribe({ description: "status", type: EApiPropertyDescribeType.UUID })
	public status!: string;
}

const resourceDefinition: IApiAuthorizationResourceDefinition<PlannerItemEntity> = {
	entity: PlannerItemEntity,
	fields: [
		{ isFilterable: true, path: "resource.id", queryPath: "id" },
		{ isFilterable: true, path: "resource.operatorId", queryPath: "operator.id" },
		{ isFilterable: true, path: "resource.status", queryPath: "status" },
		{ isFilterable: false, path: "resource.secret", queryPath: "secret" },
		{ isFilterable: true, path: "resource.externalId", queryPath: "externalId" },
		{ isFilterable: true, path: "resource.token", queryPath: "token" },
	],
	namespace: "admin:item",
	resourcePath: "gameport:admin:item/{id}",
	resourceType: "gameport:admin:item",
};

const principal: IApiAuthorizationPrincipal = {
	attributes: { emptyValue: "", nullValue: null, operatorId: "operator-1" },
	id: "user-1",
	roles: [],
	type: EApiAuthorizationPrincipalType.USER,
};

const createStatement = (effect: EApiPolicyEffect, condition: Record<string, Record<string, unknown>>): IApiPolicyStatement => ({
	Action: ["admin:item:list"],
	Condition: condition,
	Effect: effect,
	Resource: ["gameport:admin:item/*"],
});

const planAllow = (condition: Record<string, Record<string, unknown>>) =>
	new ApiAuthorizationIamQueryPlanner().plan({
		principal,
		requestMetadata: {},
		resourceDefinition,
		statements: [createStatement(EApiPolicyEffect.ALLOW, condition)],
	});

const planDeny = (exclusions: ReadonlyArray<{ condition?: Record<string, Record<string, unknown>>; resourceConstraints?: ReadonlyArray<{ isPrefix: boolean; placeholder: string; value: string }> }>) =>
	new ApiAuthorizationIamQueryPlanner().planExclusion({
		exclusions: exclusions.map((exclusion) => ({
			resourceConstraints: exclusion.resourceConstraints ?? [],
			statement: createStatement(EApiPolicyEffect.DENY, exclusion.condition ?? {}),
		})),
		principal,
		requestMetadata: {},
		resourceDefinition,
	});

describe("ApiAuthorizationIamQueryPlanner", () => {
	describe("plan (Allow)", () => {
		it.each(["StringEquals", "StringEqualsIfExists"])("compiles %s on a filterable field into an equality scope", (operator: string) => {
			expect(planAllow({ [operator]: { "resource.operatorId": "${principal.attributes.operatorId}" } })).toEqual({
				isFullyCompilable: true,
				scope: { where: { operator: { id: "operator-1" } } },
			});
		});

		it.each(["StringNotEquals", "StringNotEqualsIfExists"])("does not compile %s", (operator: string) => {
			expect(planAllow({ [operator]: { "resource.status": "archived" } })).toEqual({ isFullyCompilable: false });
		});

		it.each([
			["a non-filterable field", { StringEquals: { "resource.secret": "value" } }],
			["an unmapped field", { StringEquals: { "resource.unknown": "value" } }],
			["an unresolved variable", { StringEquals: { "resource.status": "${principal.attributes.missing}" } }],
			["a variable resolving to null", { StringEquals: { "resource.status": "${principal.attributes.nullValue}" } }],
			["a variable resolving to an empty string", { StringEquals: { "resource.status": "${principal.attributes.emptyValue}" } }],
			["an empty string", { StringEqualsIfExists: { "resource.status": "" } }],
			["an object value", { StringEquals: { "resource.status": { nested: true } } }],
		])("does not compile %s", (_name: string, condition: Record<string, Record<string, unknown>>) => {
			expect(planAllow(condition)).toEqual({ isFullyCompilable: false });
		});

		it("returns no scope for statements without resource conditions", () => {
			expect(planAllow({ StringEquals: { "principal.id": "user-1" } })).toEqual({ isFullyCompilable: true, scope: undefined });
		});
	});

	describe("planExclusion (Deny)", () => {
		it("returns no scope without exclusions", () => {
			expect(planDeny([])).toEqual({ isFullyCompilable: true, scope: undefined });
		});

		it.each([
			["StringEquals", [{ status: Not(Equal("archived")) }, { status: IsNull() }]],
			["StringEqualsIfExists", [{ status: Not(Equal("archived")) }, { status: IsNull() }]],
			["StringNotEquals", { status: Equal("archived") }],
			["StringNotEqualsIfExists", { status: Equal("archived") }],
		])("negates %s with the evaluator NULL semantics", (operator: string, where: unknown) => {
			expect(planDeny([{ condition: { [operator]: { "resource.status": "archived" } } }])).toEqual({
				isFullyCompilable: true,
				scope: { where },
			});
		});

		it("follows nested query paths and resolves variables", () => {
			expect(planDeny([{ condition: { StringEquals: { "resource.operatorId": "${principal.attributes.operatorId}" } } }]).scope).toEqual({
				where: [{ operator: { id: Not(Equal("operator-1")) } }, { operator: { id: IsNull() } }],
			});
		});

		it("turns the keys of one statement into top-level OR branches (De Morgan)", () => {
			expect(
				planDeny([
					{
						condition: {
							StringEquals: { "principal.id": "user-1", "resource.operatorId": "operator-2" },
							StringNotEquals: { "resource.status": "active" },
						},
					},
				]).scope,
			).toEqual({
				where: [{ operator: { id: Not(Equal("operator-2")) } }, { operator: { id: IsNull() } }, { status: Equal("active") }],
			});
		});

		it("ANDs several Deny statements", () => {
			expect(planDeny([{ condition: { StringEquals: { "resource.status": "archived" } } }, { condition: { StringNotEqualsIfExists: { "resource.operatorId": "operator-2" } } }]).scope).toEqual({
				where: [
					{ operator: { id: Equal("operator-2") }, status: Not(Equal("archived")) },
					{ operator: { id: Equal("operator-2") }, status: IsNull() },
				],
			});
		});

		it("fails closed once the exclusion exceeds the where-branch cap", () => {
			const exclusionCount: number = Math.log2(AUTHORIZATION_IAM_SCOPE_CONSTANT.MAX_WHERE_BRANCHES);
			const exclusion = { condition: { StringEquals: { "resource.status": "archived" } } };

			expect(planDeny(Array.from({ length: exclusionCount }, () => exclusion)).isFullyCompilable).toBe(true);
			expect(planDeny(Array.from({ length: exclusionCount + 1 }, () => exclusion))).toEqual({ isFullyCompilable: false });
		});

		it.each([
			["an unsupported operator", { StringLike: { "resource.status": "a*" } }],
			["a non-filterable field", { StringEquals: { "resource.secret": "value" } }],
			["an unmapped field", { StringEquals: { "resource.unknown": "value" } }],
			["an unresolved variable", { StringEquals: { "resource.status": "${principal.attributes.missing}" } }],
			["a variable resolving to null", { StringNotEquals: { "resource.status": "${principal.attributes.nullValue}" } }],
			["a variable resolving to an empty string", { StringEquals: { "resource.status": "${principal.attributes.emptyValue}" } }],
			["an object value", { StringEquals: { "resource.status": ["a", "b"] } }],
			["no resource condition", { StringEquals: { "principal.id": "user-1" } }],
		])("is not compilable with %s", (_name: string, condition: Record<string, Record<string, unknown>>) => {
			expect(planDeny([{ condition }])).toEqual({ isFullyCompilable: false });
		});

		it("compiles an exact resource-pattern constraint on the mapped field and keeps NULL placeholders", () => {
			expect(planDeny([{ resourceConstraints: [{ isPrefix: false, placeholder: "id", value: "item-1" }] }]).scope).toEqual({
				where: [{ id: Not(Equal("item-1")) }, { id: IsNull() }],
			});
		});

		it("compiles a prefix resource-pattern constraint into an escaped NOT LIKE that keeps NULL placeholders", () => {
			const where = planDeny([{ resourceConstraints: [{ isPrefix: true, placeholder: "id", value: "a%b_c!" }] }]).scope?.where as [{ id: FindOperator<unknown> }, { id: FindOperator<unknown> }];

			expect(where[1]).toEqual({ id: IsNull() });

			expect(where[0].id.type).toBe("raw");
			expect(where[0].id.objectLiteralParameters).toEqual({ [`iamResourcePrefix${Buffer.from("a%b_c!").toString("hex")}`]: "a!%b!_c!!%" });
			expect(where[0].id.getSql?.("item.id")).toBe(`item.id NOT LIKE :iamResourcePrefix${Buffer.from("a%b_c!").toString("hex")} ESCAPE '!'`);
		});

		it("combines resource-pattern constraints and resource conditions of one statement as OR branches", () => {
			expect(planDeny([{ condition: { StringEqualsIfExists: { "resource.status": "archived" } }, resourceConstraints: [{ isPrefix: false, placeholder: "id", value: "item-1" }] }]).scope).toEqual({
				where: [{ id: Not(Equal("item-1")) }, { id: IsNull() }, { status: Not(Equal("archived")) }, { status: IsNull() }],
			});
		});

		it.each(["status", "operatorId", "externalId", "token"])("does not compile a prefix constraint on the non-text field %s", (placeholder: string) => {
			expect(planDeny([{ resourceConstraints: [{ isPrefix: true, placeholder, value: "abc" }] }])).toEqual({ isFullyCompilable: false });
		});

		it.each(["secret", "unknown"])("is not compilable when the placeholder maps to %s", (placeholder: string) => {
			expect(planDeny([{ resourceConstraints: [{ isPrefix: false, placeholder, value: "x" }] }])).toEqual({ isFullyCompilable: false });
		});
	});
});
