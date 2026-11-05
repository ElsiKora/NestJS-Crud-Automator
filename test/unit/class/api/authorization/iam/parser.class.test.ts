import type { IApiAuthorizationIamStatement } from "@interface/class/api/authorization";

import { ApiAuthorizationIamParser } from "@class/api/authorization/iam";
import { EApiAuthorizationIamTokenType, EApiPolicyConditionOperator, EApiPolicyConditionOperatorFamily, EApiPolicyEffect } from "@enum/class/authorization";
import { describe, expect, it } from "vitest";

describe("ApiAuthorizationIamParser", () => {
	describe("readStatement", () => {
		it("reads a statement into the normalized model", () => {
			const statement: IApiAuthorizationIamStatement = ApiAuthorizationIamParser.readStatement({
				Action: ["admin:item:*"],
				Condition: { StringEquals: { "resource.status": ["${principal.attributes.status}"] }, StringNotEqualsIfExists: { "principal.id": 7 } },
				Effect: EApiPolicyEffect.ALLOW,
				Resource: ["gameport:admin:item/a${?}?"],
				Sid: "read",
			});

			expect(statement).toEqual({
				action: { isNegated: false, patterns: [{ source: "admin:item:*", tokens: [{ type: EApiAuthorizationIamTokenType.LITERAL, value: "admin:item:" }, { type: EApiAuthorizationIamTokenType.STAR }] }] },
				conditions: [
					{
						family: EApiPolicyConditionOperatorFamily.STRING,
						isIfExists: false,
						isNegated: false,
						key: "resource.status",
						operator: EApiPolicyConditionOperator.STRING_EQUALS,
						source: "StringEquals",
						values: [{ parts: [{ type: EApiAuthorizationIamTokenType.VARIABLE, variable: { path: "principal.attributes.status" } }], source: "${principal.attributes.status}" }],
					},
					{
						family: EApiPolicyConditionOperatorFamily.STRING,
						isIfExists: true,
						isNegated: true,
						key: "principal.id",
						operator: EApiPolicyConditionOperator.STRING_NOT_EQUALS,
						source: "StringNotEqualsIfExists",
						values: [{ parts: [], source: 7 }],
					},
				],
				effect: EApiPolicyEffect.ALLOW,
				resource: { isNegated: false, patterns: [{ source: "gameport:admin:item/a${?}?", tokens: [{ type: EApiAuthorizationIamTokenType.LITERAL, value: "gameport:admin:item/a?" }, { type: EApiAuthorizationIamTokenType.QUESTION_MARK }] }] },
				sid: "read",
			});
		});

		it("reads NotAction and NotResource as negated targets", () => {
			const statement = ApiAuthorizationIamParser.readStatement({ Effect: EApiPolicyEffect.DENY, NotAction: ["admin:item:read"], NotResource: ["gameport:admin:item/${principal.id}"] });

			expect(statement.action.isNegated).toBe(true);
			expect(statement.action.patterns.map((pattern) => pattern.source)).toEqual(["admin:item:read"]);
			expect(statement.resource.isNegated).toBe(true);
			expect(statement.resource.patterns.map((pattern) => pattern.source)).toEqual(["gameport:admin:item/${principal.id}"]);
		});

		it("reads a statement object once", () => {
			const input = { Action: ["admin:item:read"], Effect: EApiPolicyEffect.DENY, Resource: ["*"] };

			expect(ApiAuthorizationIamParser.readStatement(input)).toBe(ApiAuthorizationIamParser.readStatement(input));
		});

		it("throws with every failure of a statement", () => {
			expect(() => ApiAuthorizationIamParser.readStatement({ Action: "admin:item:read", Effect: "allow", Resource: ["*"] })).toThrow('IAM policy statement is invalid: iamPolicyEffectInvalid at statement.Effect (Statement Effect must be "Allow" or "Deny"); iamPolicyShorthandNotAllowed at statement.Action');
		});

		it("does not check namespaces or resource keys without them", () => {
			expect(() => ApiAuthorizationIamParser.readStatement({ Action: ["other:item:read"], Condition: { StringEquals: { "resource.unknown": "a" } }, Effect: EApiPolicyEffect.DENY, Resource: ["*"] })).not.toThrow();
		});
	});

	describe("readDocument", () => {
		it("reads every statement of a valid document", () => {
			const result = ApiAuthorizationIamParser.readDocument({ Statement: [{ Action: ["admin:item:read"], Effect: EApiPolicyEffect.DENY, Resource: ["*"] }], Version: "2012-10-17" }, { namespace: "admin:item" });

			expect(result.failures).toEqual([]);
			expect(result.statements).toHaveLength(1);
		});

		it("reports the qualifier and operator path in bracket form", () => {
			const result = ApiAuthorizationIamParser.readDocument({ Statement: [{ Action: ["*"], Condition: { "ForAnyValue:StringEquals": { "principal.id": "a" } }, Effect: EApiPolicyEffect.DENY, Resource: ["*"] }], Version: "2012-10-17" });

			expect(result.failures.map((failure) => [failure.property, failure.code])).toEqual([['document.Statement[0].Condition["ForAnyValue:StringEquals"]["principal.id"]', "iamPolicyConditionQualifierUnsupported"]]);
		});

		it("reads several values of a key in order, and each with its variables", () => {
			const statement = ApiAuthorizationIamParser.readStatement({ Action: ["*"], Condition: { StringEquals: { "principal.id": ["a", "${principal.attributes.other}"] } }, Effect: EApiPolicyEffect.DENY, Resource: ["*"] });

			expect(statement.conditions[0]?.values.map((value) => value.source)).toEqual(["a", "${principal.attributes.other}"]);
		});

		it("reads a qualifier on a key that holds a list", () => {
			const statement = ApiAuthorizationIamParser.readStatement({ Action: ["*"], Condition: { "ForAllValues:StringLikeIfExists": { "principal.groups": ["a*", "b*"] }, "ForAnyValue:StringEquals": { "principal.roles": "a" } }, Effect: EApiPolicyEffect.DENY, Resource: ["*"] });

			expect(statement.conditions.map((condition) => [condition.qualifier, condition.operator, condition.isIfExists, condition.key, condition.values.length])).toEqual([
				["ForAllValues", "StringLike", true, "principal.groups", 2],
				["ForAnyValue", "StringEquals", false, "principal.roles", 1],
			]);
		});

		it("reads a qualifier on a resource key when the namespace has no definitions to check it against", () => {
			const statement = ApiAuthorizationIamParser.readStatement({ Action: ["*"], Condition: { "ForAnyValue:StringEquals": { "resource.tags": "a" } }, Effect: EApiPolicyEffect.DENY, Resource: ["*"] });

			expect(statement.conditions[0]?.qualifier).toBe("ForAnyValue");
		});
	});

	describe("header keys and empty defaults", () => {
		it("lower-cases a header name in a condition key, as Node reads it", () => {
			const statement = ApiAuthorizationIamParser.readStatement({ Action: ["*"], Condition: { StringEquals: { "request.headers.X-Foo": "bad" } }, Effect: EApiPolicyEffect.DENY, Resource: ["*"] });

			expect(statement.conditions[0]?.key).toBe("request.headers.x-foo");
		});

		it.each([
			["a StringLike value", { Action: ["*"], Condition: { StringLike: { "resource.tenant": "${principal.attributes.missing, ''}*" } }, Effect: EApiPolicyEffect.DENY, Resource: ["*"] }, 'document.Statement[0].Condition.StringLike["resource.tenant"]', "iamPolicyConditionValueInvalid"],
			["a StringNotLike value", { Action: ["*"], Condition: { StringNotLike: { "principal.id": "a${principal.attributes.missing,''}" } }, Effect: EApiPolicyEffect.DENY, Resource: ["*"] }, 'document.Statement[0].Condition.StringNotLike["principal.id"]', "iamPolicyConditionValueInvalid"],
			["an ArnLike value", { Action: ["*"], Condition: { ArnLike: { "principal.id": "${principal.attributes.missing, ''}" } }, Effect: EApiPolicyEffect.DENY, Resource: ["*"] }, 'document.Statement[0].Condition.ArnLike["principal.id"]', "iamPolicyConditionValueInvalid"],
			["a Resource pattern", { Action: ["*"], Effect: EApiPolicyEffect.ALLOW, Resource: ["ns:item/${principal.attributes.missing, ''}*"] }, "document.Statement[0].Resource[0]", "iamPolicyPatternInvalid"],
			["a NotResource pattern", { Action: ["*"], Effect: EApiPolicyEffect.DENY, NotResource: ["ns:item/${principal.attributes.missing, ''}"] }, "document.Statement[0].NotResource[0]", "iamPolicyPatternInvalid"],
		])("refuses an empty default in %s", (_name: string, statement: Record<string, unknown>, property: string, code: string) => {
			const result = ApiAuthorizationIamParser.readDocument({ Statement: [statement], Version: "2012-10-17" });

			expect(result.failures.map((failure) => [failure.property, failure.code])).toEqual([[property, code]]);
		});

		it("keeps an empty default where the value is no pattern", () => {
			const result = ApiAuthorizationIamParser.readDocument({ Statement: [{ Action: ["*"], Condition: { StringEquals: { "principal.id": "${principal.attributes.missing, ''}" } }, Effect: EApiPolicyEffect.DENY, Resource: ["*"] }], Version: "2012-10-17" });

			expect(result.failures).toEqual([]);
		});
	});

	describe("findContextKey", () => {
		it.each([
			["principal.id", "principal.id"],
			["principal.attributes.team", "principal.attributes"],
			["request.headers.x-tenant-id", "request.headers"],
			["resource.owner.name", "resource"],
			["resource", undefined],
			["principal.attributes", undefined],
			["principal.idx", undefined],
		])("finds %s under %s", (path: string, expected: string | undefined) => {
			expect(ApiAuthorizationIamParser.findContextKey(path)?.path).toBe(expected);
		});
	});
});
