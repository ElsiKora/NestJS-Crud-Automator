import type { IApiAuthorizationIamDialect, IApiAuthorizationPrincipal, IApiAuthorizationResourceDefinition, IApiPolicyStatement } from "@interface/class/api/authorization";
import type { FindOperator } from "typeorm";

import { ApiAuthorizationIamQueryPlanner } from "@class/api/authorization/iam";
import { AUTHORIZATION_IAM_SCOPE_CONSTANT } from "@constant/class/authorization";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiAuthorizationIamDialect, EApiAuthorizationPrincipalType, EApiPolicyEffect } from "@enum/class/authorization";
import { EApiPropertyDescribeType, EApiPropertyStringType } from "@enum/decorator/api";
import { describe, expect, it, vi } from "vitest";
import { And, ChildEntity, Column, Entity, Equal, IsNull, JoinTable, ManyToMany, ManyToOne, Not, OneToMany, PrimaryColumn, TableInheritance } from "typeorm";

@Entity("planner_teams")
class PlannerTeamEntity {
	@PrimaryColumn({ type: "varchar" })
	public code!: string;

	@Column({ type: "varchar" })
	public label!: string;
}

// An entity table without a primary column, so a missing relation to it cannot be told apart from a NULL column.
@Entity("planner_keyless")
class PlannerKeylessEntity {
	@Column({ type: "varchar" })
	public label!: string;
}

@Entity("planner_labels")
class PlannerLabelEntity {
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@Column({ type: "varchar" })
	public name!: string;
}

@Entity("planner_operators")
class PlannerOperatorEntity {
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@JoinTable()
	@ManyToMany(() => PlannerLabelEntity)
	public labels!: Array<PlannerLabelEntity>;

	@Column({ nullable: true, type: "varchar" })
	public name!: null | string;

	@ManyToOne(() => PlannerTeamEntity, { nullable: true })
	public team!: null | PlannerTeamEntity;
}

@Entity("planner_items")
class PlannerItemEntity {
	@PrimaryColumn({ type: "varchar" })
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

	@Column({ type: "varchar" })
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

	@ManyToOne(() => PlannerKeylessEntity)
	public keyless!: PlannerKeylessEntity;

	@ManyToOne(() => PlannerOperatorEntity)
	public operator!: PlannerOperatorEntity;

	public operatorId!: string;

	@OneToMany(() => PlannerTagEntity, (tag: PlannerTagEntity) => tag.item)
	public tags!: Array<PlannerTagEntity>;

	@Column({ type: "varchar" })
	public secret!: string;

	@Column({ type: "varchar" })
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

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "status", type: EApiPropertyDescribeType.UUID })
	public status!: string;
}

@Entity("planner_tags")
class PlannerTagEntity {
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@ManyToOne(() => PlannerItemEntity, (item: PlannerItemEntity) => item.tags)
	public item!: PlannerItemEntity;

	@Column({ type: "varchar" })
	public name!: string;
}

// The same fields with no TypeORM decorator, as for an entity registered only through an EntitySchema.
class PlannerUnmappedItemEntity {
	@ApiPropertyDescribe({ description: "featured", type: EApiPropertyDescribeType.BOOLEAN })
	public isFeatured!: boolean;

	@ApiPropertyDescribe({ description: "status", type: EApiPropertyDescribeType.UUID })
	public status!: string;
}

@Entity("planner_shadowed")
class PlannerShadowedEntity {
	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "code",
		exampleValue: "code-1",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public code!: string;
}

// An unrelated class that only shares the entity's name.
((): unknown => {
	class PlannerShadowedEntity {
		@ApiPropertyDescribe({ description: "unrelated code", type: EApiPropertyDescribeType.UUID })
		public code!: string;
	}

	return PlannerShadowedEntity;
})();

const resourceDefinition: IApiAuthorizationResourceDefinition<PlannerItemEntity> = {
	entity: PlannerItemEntity,
	fields: [
		{ isFilterable: true, path: "resource.id", queryPath: "id" },
		{ isFilterable: true, path: "resource.operatorId", queryPath: "operator.id" },
		{ isFilterable: true, path: "resource.status", queryPath: "status" },
		{ isFilterable: false, path: "resource.secret", queryPath: "secret" },
		{ isFilterable: true, path: "resource.externalId", queryPath: "externalId" },
		{ isFilterable: true, path: "resource.token", queryPath: "token" },
		{ isFilterable: true, path: "resource.operatorName", queryPath: "operator.name" },
		{ isFilterable: true, path: "resource.teamLabel", queryPath: "operator.team.label" },
		{ isFilterable: true, path: "resource.keylessLabel", queryPath: "keyless.label" },
		{ isFilterable: true, path: "resource.tagName", queryPath: "tags.name" },
		{ isFilterable: true, path: "resource.operatorLabelName", queryPath: "operator.labels.name" },
	],
	namespace: "admin:item",
	resourcePath: "gameport:admin:item/{id}",
	resourceType: "gameport:admin:item",
};

abstract class PlannerInheritedBaseEntity {
	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "code",
		exampleValue: "abc",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public code!: string;

	@Column({ type: "bigint" })
	@ApiPropertyDescribe({
		description: "external id",
		exampleValue: "9007199254740993",
		format: EApiPropertyStringType.BIGINT_STRING,
		maxLength: 20,
		minLength: 1,
		pattern: "/^[0-9]+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public inheritedExternalId!: string;
}

@Entity("planner_inherited_items")
class PlannerInheritedItemEntity extends PlannerInheritedBaseEntity {}

const inheritedResourceDefinition: IApiAuthorizationResourceDefinition<PlannerInheritedItemEntity> = {
	entity: PlannerInheritedItemEntity,
	fields: [
		{ isFilterable: true, path: "resource.code", queryPath: "code" },
		{ isFilterable: true, path: "resource.inheritedExternalId", queryPath: "inheritedExternalId" },
	],
	namespace: "admin:item",
	resourcePath: "gameport:admin:item/{code}",
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
		it.each(["StringEquals", "StringEqualsIfExists"])("compiles %s on a root column into an equality scope", (operator: string) => {
			expect(planAllow({ [operator]: { "resource.status": "archived" } })).toEqual({ isFullyCompilable: true, scope: { where: { status: "archived" } } });
		});

		it("compiles StringEquals on a relation column into an equality scope", () => {
			expect(planAllow({ StringEquals: { "resource.operatorId": "${principal.attributes.operatorId}" } })).toEqual({
				isFullyCompilable: true,
				scope: { where: { operator: { id: "operator-1" } } },
			});
		});

		it.each([
			["the relation primary key", "resource.operatorId", [{ operator: { id: "operator-1" } }, { operator: { id: IsNull() } }]],
			["a relation column", "resource.operatorName", [{ operator: { name: "operator-1" } }, { operator: { id: IsNull() } }]],
			["a column two relations away", "resource.teamLabel", [{ operator: { team: { label: "operator-1" } } }, { operator: { team: { code: IsNull() } } }]],
		])("also allows a missing relation for StringEqualsIfExists on %s", (_name: string, path: string, where: unknown) => {
			expect(planAllow({ StringEqualsIfExists: { [path]: "${principal.attributes.operatorId}" } })).toEqual({ isFullyCompilable: true, scope: { where } });
		});

		it("crosses the alternatives of several IfExists keys of one statement", () => {
			expect(planAllow({ StringEqualsIfExists: { "resource.operatorName": "ann", "resource.teamLabel": "red" } }).scope).toEqual({
				where: [{ operator: { name: "ann", team: { label: "red" } } }, { operator: { name: "ann", team: { code: IsNull() } } }, { operator: { id: IsNull(), team: { label: "red" } } }, { operator: { id: IsNull(), team: { code: IsNull() } } }],
			});
		});

		it("combines keys on one query path with And, so different values allow no row", () => {
			expect(planAllow({ StringEquals: { "resource.operatorId": "operator-1" }, StringEqualsIfExists: { "resource.operatorId": "operator-2" } }).scope).toEqual({
				where: [{ operator: { id: And(Equal("operator-1"), Equal("operator-2")) } }, { operator: { id: And(Equal("operator-1"), IsNull()) } }],
			});
		});

		it("keeps a condition repeated on one query path once", () => {
			expect(planAllow({ StringEquals: { "resource.status": "archived" }, StringEqualsIfExists: { "resource.status": "archived" } }).scope).toEqual({ where: { status: "archived" } });
		});

		it("fails closed once the IfExists alternatives exceed the where-branch cap", () => {
			const maxWhereBranches: number = AUTHORIZATION_IAM_SCOPE_CONSTANT.MAX_WHERE_BRANCHES;

			Reflect.set(AUTHORIZATION_IAM_SCOPE_CONSTANT, "MAX_WHERE_BRANCHES", 2);

			try {
				expect(planAllow({ StringEqualsIfExists: { "resource.operatorName": "ann" } }).isFullyCompilable).toBe(true);
				expect(planAllow({ StringEqualsIfExists: { "resource.operatorName": "ann", "resource.teamLabel": "red" } })).toEqual({ isFullyCompilable: false });
			} finally {
				Reflect.set(AUTHORIZATION_IAM_SCOPE_CONSTANT, "MAX_WHERE_BRANCHES", maxWhereBranches);
			}
		});

		it("does not compile StringEqualsIfExists through a relation to an entity without a primary column", () => {
			expect(planAllow({ StringEqualsIfExists: { "resource.keylessLabel": "red" } })).toEqual({ isFullyCompilable: false });
			expect(planAllow({ StringEquals: { "resource.keylessLabel": "red" } })).toEqual({ isFullyCompilable: true, scope: { where: { keyless: { label: "red" } } } });
		});

		it.each(["StringNotEquals", "StringNotEqualsIfExists"])("compiles %s with its NULL branch", (operator: string) => {
			expect(planAllow({ [operator]: { "resource.status": "archived" } })).toEqual({
				isFullyCompilable: true,
				scope: { where: [{ status: Not(Equal("archived")) }, { status: IsNull() }] },
			});
		});

		it.each(["resource.tagName", "resource.operatorLabelName"].flatMap((path: string) => ["StringEquals", "StringEqualsIfExists"].map((operator: string) => [operator, path])))("does not compile %s on the to-many path %s", (operator: string, path: string) => {
			expect(planAllow({ [operator]: { [path]: "red" } })).toEqual({ isFullyCompilable: false });
		});

		it.each([
			["a non-filterable field", { StringEquals: { "resource.secret": "value" } }],
			["an unmapped field", { StringEquals: { "resource.unknown": "value" } }],
			["an unresolved variable", { StringEquals: { "resource.status": "${principal.attributes.missing}" } }],
			["a variable resolving to null", { StringEquals: { "resource.status": "${principal.attributes.nullValue}" } }],
			["a variable resolving to an empty string", { StringEquals: { "resource.status": "${principal.attributes.emptyValue}" } }],
			["an empty string", { StringEqualsIfExists: { "resource.status": "" } }],
		])("does not compile %s", (_name: string, condition: Record<string, Record<string, unknown>>) => {
			expect(planAllow(condition)).toEqual({ isFullyCompilable: false });
		});

		it("reads a list of one value as that value", () => {
			expect(planAllow({ StringEquals: { "resource.status": ["archived"] } })).toEqual(planAllow({ StringEquals: { "resource.status": "archived" } }));
		});

		it.each([
			["an object value", { StringEquals: { "resource.status": { nested: true } } }, "iamPolicyConditionValueInvalid"],
			["several values", { StringEquals: { "resource.status": ["a", "b"] } }, "iamPolicyNotSupportedYet"],
			["a qualifier", { "ForAnyValue:StringEquals": { "principal.roles": "a" } }, "iamPolicyNotSupportedYet"],
		])("refuses a statement with %s", (_name: string, condition: Record<string, Record<string, unknown>>, code: string) => {
			expect(() => planAllow(condition)).toThrow(code);
			expect(() => planDeny([{ condition }])).toThrow(code);
		});

		it("returns no scope for statements without resource conditions", () => {
			expect(planAllow({ StringEquals: { "principal.id": "user-1" } })).toEqual({ isFullyCompilable: true, scope: undefined });
		});

		it("allows every row when one statement has no resource key, whatever the other statements allow", () => {
			expect(
				new ApiAuthorizationIamQueryPlanner().plan({
					principal,
					requestMetadata: {},
					resourceDefinition,
					statements: [createStatement(EApiPolicyEffect.ALLOW, { StringEquals: { "resource.status": "archived" } }), createStatement(EApiPolicyEffect.ALLOW, {})],
				}),
			).toEqual({ isFullyCompilable: true, scope: undefined });
		});

		it("binds the canonical text of a value", () => {
			expect(
				new ApiAuthorizationIamQueryPlanner().plan({
					principal: { ...principal, attributes: { level: 7 } },
					requestMetadata: {},
					resourceDefinition,
					statements: [createStatement(EApiPolicyEffect.ALLOW, { StringEquals: { "resource.status": "${principal.attributes.level}" } })],
				}).scope,
			).toEqual({ where: { status: "7" } });
		});

		it("lowers the scope to the dialect it is given and fails closed for an unresolved one", () => {
			const plan = (dialect: IApiAuthorizationIamDialect) => new ApiAuthorizationIamQueryPlanner().plan({ dialect, principal, requestMetadata: {}, resourceDefinition, statements: [createStatement(EApiPolicyEffect.ALLOW, { StringEquals: { "resource.status": "archived" } })] });
			const where = plan({ binaryCollation: "utf8mb4_nopad_bin", type: EApiAuthorizationIamDialect.MARIADB }).scope?.where as { status: FindOperator<unknown> };

			expect(where.status.getSql?.("item.status")).toMatch(/^CONVERT\(item\.status USING utf8mb4\) COLLATE utf8mb4_nopad_bin = :iam[0-9a-f]{24}$/);
			expect(plan({ type: EApiAuthorizationIamDialect.POSTGRES }).scope).toEqual({ where: { status: "archived" } });
			expect(plan({ type: EApiAuthorizationIamDialect.UNRESOLVED })).toEqual({ isFullyCompilable: false });
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

		it.each([
			["the relation primary key", "resource.operatorId", [{ operator: { id: Not(Equal("ann")) } }]],
			["a relation column", "resource.operatorName", [{ operator: { name: Not(Equal("ann")) } }, { operator: { id: Not(IsNull()), name: IsNull() } }]],
			["a column two relations away", "resource.teamLabel", [{ operator: { team: { label: Not(Equal("ann")) } } }, { operator: { team: { code: Not(IsNull()), label: IsNull() } } }]],
		])("keeps a NULL column but not a missing relation for a Deny StringEqualsIfExists on %s", (_name: string, path: string, where: Array<unknown>) => {
			expect(planDeny([{ condition: { StringEqualsIfExists: { [path]: "ann" } } }]).scope).toEqual({ where: where.length === 1 ? where[0] : where });
		});

		it("negates StringEquals on a relation column like a root column", () => {
			expect(planDeny([{ condition: { StringEquals: { "resource.teamLabel": "red" } } }]).scope).toEqual({ where: [{ operator: { team: { label: Not(Equal("red")) } } }, { operator: { team: { label: IsNull() } } }] });
		});

		it.each(["resource.tagName", "resource.operatorLabelName"].flatMap((path: string) => ["StringEquals", "StringEqualsIfExists", "StringNotEquals", "StringNotEqualsIfExists"].map((operator: string) => [operator, path])))("does not compile a Deny %s on the to-many path %s", (operator: string, path: string) => {
			expect(planDeny([{ condition: { [operator]: { [path]: "red" } } }])).toEqual({ isFullyCompilable: false });
		});

		it("does not compile a Deny StringEqualsIfExists through a relation to an entity without a primary column", () => {
			expect(planDeny([{ condition: { StringEqualsIfExists: { "resource.keylessLabel": "red" } } }])).toEqual({ isFullyCompilable: false });
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
			["a non-filterable field", { StringEquals: { "resource.secret": "value" } }],
			["an unmapped field", { StringEquals: { "resource.unknown": "value" } }],
			["an unresolved variable", { StringEquals: { "resource.status": "${principal.attributes.missing}" } }],
			["a variable resolving to null", { StringNotEquals: { "resource.status": "${principal.attributes.nullValue}" } }],
			["a variable resolving to an empty string", { StringEquals: { "resource.status": "${principal.attributes.emptyValue}" } }],
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

			const parameterNames: Array<string> = Object.keys(where[0].id.objectLiteralParameters ?? {});

			expect(where[0].id.type).toBe("raw");
			expect(parameterNames).toEqual([expect.stringMatching(/^iam[0-9a-f]{24}$/)]);
			expect(where[0].id.objectLiteralParameters).toEqual({ [parameterNames[0] ?? ""]: "a!%b!_c!!%" });
			expect(where[0].id.getSql?.("item.id")).toBe(`item.id NOT LIKE :${parameterNames[0] ?? ""} ESCAPE '!'`);
		});

		it("combines resource-pattern constraints and resource conditions of one statement as OR branches", () => {
			expect(planDeny([{ condition: { StringEqualsIfExists: { "resource.status": "archived" } }, resourceConstraints: [{ isPrefix: false, placeholder: "id", value: "item-1" }] }]).scope).toEqual({
				where: [{ id: Not(Equal("item-1")) }, { id: IsNull() }, { status: Not(Equal("archived")) }, { status: IsNull() }],
			});
		});

		it.each(["status", "operatorId", "externalId", "token"])("does not compile a prefix constraint on the non-text field %s", (placeholder: string) => {
			expect(planDeny([{ resourceConstraints: [{ isPrefix: true, placeholder, value: "abc" }] }])).toEqual({ isFullyCompilable: false });
		});

		it("compiles a prefix constraint on a text field inherited from an abstract base", () => {
			const result = new ApiAuthorizationIamQueryPlanner().planExclusion({
				exclusions: [{ resourceConstraints: [{ isPrefix: true, placeholder: "code", value: "abc" }], statement: createStatement(EApiPolicyEffect.DENY, {}) }],
				principal,
				requestMetadata: {},
				resourceDefinition: inheritedResourceDefinition,
			});
			const where = result.scope?.where as [{ code: FindOperator<unknown> }, { code: FindOperator<unknown> }];

			expect(result.isFullyCompilable).toBe(true);
			expect(Object.values(where[0].code.objectLiteralParameters ?? {})).toEqual(["abc%"]);
			expect(where[1]).toEqual({ code: IsNull() });
		});

		it("does not compile a prefix constraint on a non-text field inherited from an abstract base", () => {
			expect(
				new ApiAuthorizationIamQueryPlanner().planExclusion({
					exclusions: [{ resourceConstraints: [{ isPrefix: true, placeholder: "inheritedExternalId", value: "1" }], statement: createStatement(EApiPolicyEffect.DENY, {}) }],
					principal,
					requestMetadata: {},
					resourceDefinition: inheritedResourceDefinition,
				}),
			).toEqual({ isFullyCompilable: false });
		});

		it.each(["secret", "unknown"])("is not compilable when the placeholder maps to %s", (placeholder: string) => {
			expect(planDeny([{ resourceConstraints: [{ isPrefix: false, placeholder, value: "x" }] }])).toEqual({ isFullyCompilable: false });
		});

		it("reads the entity's own text column when an unrelated class shares the entity's name", () => {
			const plan = new ApiAuthorizationIamQueryPlanner().planExclusion({
				exclusions: [{ resourceConstraints: [{ isPrefix: true, placeholder: "code", value: "abc" }], statement: createStatement(EApiPolicyEffect.DENY, {}) }],
				principal,
				requestMetadata: {},
				resourceDefinition: { ...resourceDefinition, entity: PlannerShadowedEntity, fields: [{ isFilterable: true, path: "resource.code", queryPath: "code" }], resourcePath: "gameport:admin:item/{code}" } as unknown as IApiAuthorizationResourceDefinition<PlannerItemEntity>,
			});

			expect(plan.isFullyCompilable).toBe(true);
		});
	});
});

@Entity("planner_boolean_owners")
class PlannerBooleanOwnerEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "boolean" })
	@ApiPropertyDescribe({ description: "active", type: EApiPropertyDescribeType.BOOLEAN })
	public isActive!: boolean;
}

@Entity("planner_boolean_items")
class PlannerBooleanItemEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "boolean" })
	@ApiPropertyDescribe({ description: "featured", type: EApiPropertyDescribeType.BOOLEAN })
	public isFeatured!: boolean;

	@ManyToOne(() => PlannerBooleanOwnerEntity)
	@ApiPropertyDescribe({ description: "owner", type: EApiPropertyDescribeType.RELATION })
	public owner!: PlannerBooleanOwnerEntity;
}

const booleanResourceDefinition: IApiAuthorizationResourceDefinition<PlannerBooleanItemEntity> = {
	entity: PlannerBooleanItemEntity,
	fields: [
		{ isFilterable: true, path: "resource.isFeatured", queryPath: "isFeatured" },
		{ isFilterable: true, path: "resource.ownerActive", queryPath: "owner.isActive" },
	],
	namespace: "bool:item",
	resourcePath: "bool:item/{id}",
	resourceType: "bool:item",
};

const booleanPrincipal: IApiAuthorizationPrincipal = {
	attributes: { featured: true, featuredText: "true", notFeatured: false, numericFeatured: 1 },
	id: "user-1",
	roles: [],
	type: EApiAuthorizationPrincipalType.USER,
};

const planBooleanAllow = (condition: Record<string, Record<string, unknown>>) =>
	new ApiAuthorizationIamQueryPlanner().plan({
		principal: booleanPrincipal,
		requestMetadata: {},
		resourceDefinition: booleanResourceDefinition,
		statements: [createStatement(EApiPolicyEffect.ALLOW, condition)],
	});

const planBooleanDeny = (condition: Record<string, Record<string, unknown>>) =>
	new ApiAuthorizationIamQueryPlanner().planExclusion({
		exclusions: [{ resourceConstraints: [], statement: createStatement(EApiPolicyEffect.DENY, condition) }],
		principal: booleanPrincipal,
		requestMetadata: {},
		resourceDefinition: booleanResourceDefinition,
	});

// A boolean bound as text compares 'true' with the stored 1 on SQLite and matches no row.
const CANONICAL_BOOLEAN_VALUES: Array<[unknown, boolean]> = [
	["true", true],
	["false", false],
	[true, true],
	[false, false],
	["${principal.attributes.featured}", true],
	["${principal.attributes.notFeatured}", false],
	["${principal.attributes.featuredText}", true],
];

// The in-memory evaluator compares text, so these equal no stored boolean.
const NON_CANONICAL_BOOLEAN_VALUES: Array<unknown> = ["1", "0", "yes", "TRUE", " true", "banana", 1, "${principal.attributes.numericFeatured}"];

describe("ApiAuthorizationIamQueryPlanner on boolean columns", () => {
	it.each(CANONICAL_BOOLEAN_VALUES)("binds an Allow StringEquals %j as the boolean %j", (value: unknown, expected: boolean) => {
		expect(planBooleanAllow({ StringEquals: { "resource.isFeatured": value } })).toEqual({ isFullyCompilable: true, scope: { where: { isFeatured: expected } } });
	});

	it.each(CANONICAL_BOOLEAN_VALUES)("binds a one-hop Allow StringEquals %j as the boolean %j", (value: unknown, expected: boolean) => {
		expect(planBooleanAllow({ StringEquals: { "resource.ownerActive": value } })).toEqual({ isFullyCompilable: true, scope: { where: { owner: { isActive: expected } } } });
	});

	it.each(CANONICAL_BOOLEAN_VALUES)("binds a Deny StringEquals %j as the boolean %j", (value: unknown, expected: boolean) => {
		expect(planBooleanDeny({ StringEquals: { "resource.isFeatured": value } })).toEqual({ isFullyCompilable: true, scope: { where: [{ isFeatured: Not(Equal(expected)) }, { isFeatured: IsNull() }] } });
	});

	it.each(CANONICAL_BOOLEAN_VALUES)("binds a one-hop Deny StringNotEquals %j as the boolean %j", (value: unknown, expected: boolean) => {
		expect(planBooleanDeny({ StringNotEquals: { "resource.ownerActive": value } })).toEqual({ isFullyCompilable: true, scope: { where: { owner: { isActive: Equal(expected) } } } });
	});

	it.each(NON_CANONICAL_BOOLEAN_VALUES)("does not compile an Allow StringEquals %j", (value: unknown) => {
		expect(planBooleanAllow({ StringEquals: { "resource.isFeatured": value } })).toEqual({ isFullyCompilable: false });
		expect(planBooleanAllow({ StringEquals: { "resource.ownerActive": value } })).toEqual({ isFullyCompilable: false });
	});

	it.each(NON_CANONICAL_BOOLEAN_VALUES)("does not compile a Deny %j", (value: unknown) => {
		expect(planBooleanDeny({ StringEquals: { "resource.isFeatured": value } })).toEqual({ isFullyCompilable: false });
		expect(planBooleanDeny({ StringNotEqualsIfExists: { "resource.ownerActive": value } })).toEqual({ isFullyCompilable: false });
	});
});

@Entity("planner_boolean_companies")
class PlannerBooleanCompanyEntity {
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	// No describe metadata: the TypeORM column type alone marks it as a boolean.
	@Column({ type: "bool" })
	public isVerified!: boolean;
}

@Entity("planner_boolean_deep_owners")
class PlannerBooleanDeepOwnerEntity {
	@ManyToOne(() => PlannerBooleanCompanyEntity, { nullable: true })
	public company!: null | PlannerBooleanCompanyEntity;

	@PrimaryColumn({ type: "varchar" })
	public id!: string;
}

class PlannerBooleanMeta {
	@Column({ default: false, type: "boolean" })
	public isLocked!: boolean;

	@Column({ type: "varchar" })
	public note!: string;
}

abstract class PlannerBooleanArchivableEntity {
	@Column({ default: false, type: "boolean" })
	public isArchived!: boolean;
}

@Entity("planner_boolean_parts")
@TableInheritance({ column: { name: "kind", type: "varchar" } })
class PlannerBooleanPartEntity extends PlannerBooleanArchivableEntity {
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	// `design:type` gives the column type `Boolean` when the decorator names none.
	@Column()
	public isInternal!: boolean;

	// SQL Server stores a boolean as `bit`.
	@Column({ type: "bit" })
	public isLegacy!: boolean;

	@Column(() => PlannerBooleanMeta)
	public meta!: PlannerBooleanMeta;

	@ManyToOne(() => PlannerBooleanDeepOwnerEntity, { nullable: true })
	public owner!: null | PlannerBooleanDeepOwnerEntity;

	@Column({ type: "varchar" })
	public status!: string;
}

@ChildEntity("special")
class PlannerBooleanSpecialPartEntity extends PlannerBooleanPartEntity {
	@Column({ nullable: true, type: "boolean" })
	public isSpecial!: boolean | null;
}

@Entity("planner_boolean_cached")
class PlannerBooleanCachedEntity {
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@Column({ type: "boolean" })
	public isCached!: boolean;
}

const PART_FIELDS: Array<[string, string]> = [
	["archived", "isArchived"],
	["internal", "isInternal"],
	["legacy", "isLegacy"],
	["locked", "meta.isLocked"],
	["special", "isSpecial"],
	["verified", "owner.company.isVerified"],
];

const UNRESOLVABLE_PART_FIELDS: Array<[string, string]> = [
	["missing", "missing"],
	["ownerMissing", "owner.missing"],
	["companyMissing", "owner.company.missing"],
	["metaMissing", "meta.missing"],
	["owner", "owner"],
	["meta", "meta"],
	["statusChild", "status.length"],
];

const partResourceDefinition: IApiAuthorizationResourceDefinition<PlannerBooleanSpecialPartEntity> = {
	entity: PlannerBooleanSpecialPartEntity,
	fields: [...PART_FIELDS, ...UNRESOLVABLE_PART_FIELDS, ["note", "meta.note"] as [string, string]].map(([name, queryPath]: [string, string]) => ({ isFilterable: true, path: `resource.${name}`, queryPath })),
	namespace: "bool:part",
	resourcePath: "bool:part/{special}",
	resourceType: "bool:part",
};

const planPartAllow = (condition: Record<string, Record<string, unknown>>) => new ApiAuthorizationIamQueryPlanner().plan({ principal: booleanPrincipal, requestMetadata: {}, resourceDefinition: partResourceDefinition, statements: [createStatement(EApiPolicyEffect.ALLOW, condition)] });

const planPartDeny = (condition: Record<string, Record<string, unknown>>, resourceConstraints: ReadonlyArray<{ isPrefix: boolean; placeholder: string; value: string }> = []) => new ApiAuthorizationIamQueryPlanner().planExclusion({ exclusions: [{ resourceConstraints, statement: createStatement(EApiPolicyEffect.DENY, condition) }], principal: booleanPrincipal, requestMetadata: {}, resourceDefinition: partResourceDefinition });

// Builds the nested where a query path compiles to.
const nestWhere = (queryPath: string, value: unknown): Record<string, unknown> => queryPath.split(".").reduceRight<unknown>((inner: unknown, segment: string): Record<string, unknown> => ({ [segment]: inner }), value) as Record<string, unknown>;

describe("ApiAuthorizationIamQueryPlanner on boolean columns TypeORM maps", () => {
	describe.each(PART_FIELDS)("on resource.%s (%s)", (name: string, queryPath: string) => {
		it.each(CANONICAL_BOOLEAN_VALUES)("binds an Allow StringEquals %j as the boolean %j", (value: unknown, expected: boolean) => {
			expect(planPartAllow({ StringEquals: { [`resource.${name}`]: value } })).toEqual({ isFullyCompilable: true, scope: { where: nestWhere(queryPath, expected) } });
		});

		it.each(CANONICAL_BOOLEAN_VALUES)("binds a Deny StringEquals %j as the boolean %j", (value: unknown, expected: boolean) => {
			expect(planPartDeny({ StringEquals: { [`resource.${name}`]: value } })).toEqual({ isFullyCompilable: true, scope: { where: [nestWhere(queryPath, Not(Equal(expected))), nestWhere(queryPath, IsNull())] } });
		});

		it.each(NON_CANONICAL_BOOLEAN_VALUES)("does not compile an Allow or a Deny %j", (value: unknown) => {
			expect(planPartAllow({ StringEquals: { [`resource.${name}`]: value } })).toEqual({ isFullyCompilable: false });
			expect(planPartDeny({ StringEquals: { [`resource.${name}`]: value } })).toEqual({ isFullyCompilable: false });
			expect(planPartDeny({ StringNotEquals: { [`resource.${name}`]: value } })).toEqual({ isFullyCompilable: false });
		});
	});

	it("keeps text values on a text column inside an embedded entity", () => {
		expect(planPartAllow({ StringEquals: { "resource.note": "1" } })).toEqual({ isFullyCompilable: true, scope: { where: { meta: { note: "1" } } } });
	});

	it.each(UNRESOLVABLE_PART_FIELDS)("does not compile resource.%s (%s), which TypeORM cannot resolve to a column", (name: string) => {
		expect(planPartAllow({ StringEquals: { [`resource.${name}`]: "true" } })).toEqual({ isFullyCompilable: false });
		expect(planPartDeny({ StringEquals: { [`resource.${name}`]: "true" } })).toEqual({ isFullyCompilable: false });
	});

	it.each([
		["true", true],
		["false", false],
	])("binds an exact resource-pattern constraint %s on a boolean placeholder as the boolean %j", (value: string, expected: boolean) => {
		expect(planPartDeny({}, [{ isPrefix: false, placeholder: "special", value }])).toEqual({ isFullyCompilable: true, scope: { where: [{ isSpecial: Not(Equal(expected)) }, { isSpecial: IsNull() }] } });
	});

	it.each(["1", "0", "TRUE", "yes", " true"])("does not compile an exact resource-pattern constraint %j on a boolean placeholder", (value: string) => {
		expect(planPartDeny({}, [{ isPrefix: false, placeholder: "special", value }])).toEqual({ isFullyCompilable: false });
	});

	it.each([
		["a boolean", "resource.featured", "true"],
		["a text", "resource.status", "active"],
	])("does not compile %s condition on an entity no TypeORM decorator maps", (_name: string, path: string, value: string) => {
		const unmappedDefinition: IApiAuthorizationResourceDefinition<PlannerUnmappedItemEntity> = {
			entity: PlannerUnmappedItemEntity,
			fields: [
				{ isFilterable: true, path: "resource.featured", queryPath: "isFeatured" },
				{ isFilterable: true, path: "resource.status", queryPath: "status" },
			],
			namespace: "bool:unmapped",
			resourcePath: "bool:unmapped/{status}",
			resourceType: "bool:unmapped",
		};
		const planner = new ApiAuthorizationIamQueryPlanner();

		expect(planner.plan({ principal: booleanPrincipal, requestMetadata: {}, resourceDefinition: unmappedDefinition, statements: [createStatement(EApiPolicyEffect.ALLOW, { StringEquals: { [path]: value } })] })).toEqual({ isFullyCompilable: false });
		expect(planner.planExclusion({ exclusions: [{ resourceConstraints: [], statement: createStatement(EApiPolicyEffect.DENY, { StringEquals: { [path]: value } }) }], principal: booleanPrincipal, requestMetadata: {}, resourceDefinition: unmappedDefinition })).toEqual({ isFullyCompilable: false });
		expect(planner.planExclusion({ exclusions: [{ resourceConstraints: [{ isPrefix: false, placeholder: "status", value: "active" }], statement: createStatement(EApiPolicyEffect.DENY, {}) }], principal: booleanPrincipal, requestMetadata: {}, resourceDefinition: unmappedDefinition })).toEqual({ isFullyCompilable: false });
	});

	it("reads the TypeORM metadata of one entity and path once", () => {
		const readField = vi.spyOn(ApiAuthorizationIamQueryPlanner.prototype as unknown as { readField: (entity: object, queryPath: string) => unknown }, "readField");
		const resourceDefinition: IApiAuthorizationResourceDefinition<PlannerBooleanCachedEntity> = { entity: PlannerBooleanCachedEntity, fields: [{ isFilterable: true, path: "resource.cached", queryPath: "isCached" }], namespace: "bool:cached", resourcePath: "bool:cached/{id}", resourceType: "bool:cached" };

		try {
			for (const value of ["true", "false", true]) {
				expect(new ApiAuthorizationIamQueryPlanner().plan({ principal: booleanPrincipal, requestMetadata: {}, resourceDefinition, statements: [createStatement(EApiPolicyEffect.ALLOW, { StringEquals: { "resource.cached": value } })] }).isFullyCompilable).toBe(true);
			}

			expect(readField).toHaveBeenCalledTimes(1);
		} finally {
			readField.mockRestore();
		}
	});
});
