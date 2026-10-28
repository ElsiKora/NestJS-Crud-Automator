import type { IApiPolicyDocumentRecord } from "@interface/class/api/authorization";

import { ApiAuthorizationIamDocumentValidator } from "@class/api/authorization/iam";
import { EApiPolicyConditionOperator, EApiPolicyEffect, EApiPolicySourceType } from "@enum/class/authorization";
import { describe, expect, it } from "vitest";

const createRecord = (condition: Record<string, Record<string, unknown>>): IApiPolicyDocumentRecord => ({
	document: {
		Statement: [
			{
				Action: ["admin:item:list"],
				Condition: condition,
				Effect: EApiPolicyEffect.DENY,
				Resource: ["gameport:admin:item/*"],
			},
		],
		Version: "2012-10-17",
	},
	id: "policy-a",
	namespace: "admin:item",
	sourceType: EApiPolicySourceType.MANAGED,
	version: "1",
});

describe("ApiAuthorizationIamDocumentValidator", () => {
	it.each(Object.values(EApiPolicyConditionOperator))("accepts the %s condition operator", (operator: EApiPolicyConditionOperator) => {
		expect(() => new ApiAuthorizationIamDocumentValidator().validate(createRecord({ [operator]: { "resource.status": "archived" } }))).not.toThrow();
	});

	it.each(["StringLike", "stringequals", "ArnEquals"])("rejects the unsupported %s condition operator", (operator: string) => {
		expect(() => new ApiAuthorizationIamDocumentValidator().validate(createRecord({ [operator]: { "resource.status": "archived" } }))).toThrow(`Policy document "policy-a" contains an unsupported Condition operator "${operator}"`);
	});

	it.each([
		["an array", ["a", "b"]],
		["an object", { nested: true }],
		["null", null],
	])("rejects %s condition operand", (_name: string, operand: unknown) => {
		expect(() => new ApiAuthorizationIamDocumentValidator().validate(createRecord({ StringEquals: { "resource.status": operand } }))).toThrow(`Policy document "policy-a" contains a non-scalar Condition operand for "resource.status"`);
	});

	it.each(["archived", 7, true])("accepts the scalar condition operand %s", (operand: unknown) => {
		expect(() => new ApiAuthorizationIamDocumentValidator().validate(createRecord({ StringEquals: { "resource.status": operand } }))).not.toThrow();
	});
});
