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
			const result = ApiAuthorizationIamParser.readDocument({ Statement: [{ Action: ["*"], Condition: { "ForAnyValue:StringEquals": { "principal.groups": "a" } }, Effect: EApiPolicyEffect.DENY, Resource: ["*"] }], Version: "2012-10-17" });

			expect(result.failures.map((failure) => [failure.property, failure.code])).toEqual([['document.Statement[0].Condition["ForAnyValue:StringEquals"]["principal.groups"]', "iamPolicyNotSupportedYet"]]);
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
