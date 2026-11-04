import type { IApiAuthorizationResourceDefinition, IApiPolicyDocumentRecord } from "@interface/class/api/authorization";
import type { ValidationError } from "class-validator";

import { ApiAuthorizationIamDocumentValidator, ApiAuthorizationIamResourceDefinitionRegistry } from "@class/api/authorization/iam";
import { ApiRequestValidationException } from "@class/api/request-validation-exception.class";
import { AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT } from "@constant/class/authorization";
import { EApiPolicyConditionOperator, EApiPolicyEffect, EApiPolicySourceType } from "@enum/class/authorization";
import { IsApiPolicyDocument } from "@validator/policy-document.validator";
import { validate as validateObject } from "class-validator";
import { Column, Entity, PrimaryColumn } from "typeorm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

@Entity("validator_items")
class ValidatorItemEntity {
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@Column({ type: "boolean" })
	public isArchived!: boolean;

	@Column({ type: "varchar" })
	public secret!: string;

	@Column({ type: "varchar" })
	public status!: string;
}

const itemResourceDefinition: IApiAuthorizationResourceDefinition<ValidatorItemEntity> = {
	entity: ValidatorItemEntity,
	fields: [
		{ isFilterable: true, path: "resource.id", queryPath: "id" },
		{ isFilterable: true, path: "resource.isArchived", queryPath: "isArchived" },
		{ isFilterable: true, path: "resource.status", queryPath: "status" },
		{ isFilterable: false, path: "resource.secret", queryPath: "secret" },
	],
	namespace: "admin:item",
	resourcePath: "gameport:admin:item/{id}",
	resourceType: "gameport:admin:item",
};

const baseStatement: Record<string, unknown> = { Action: ["admin:item:read"], Effect: EApiPolicyEffect.DENY, Resource: ["gameport:admin:item/*"] };

const inspectDocument = (document: unknown, namespace: string = "admin:item"): Array<[string, string]> => new ApiAuthorizationIamDocumentValidator().inspect(document, { namespace }).map((failure: ValidationError): [string, string] => [failure.property, Object.keys(failure.constraints ?? {})[0] ?? ""]);

const inspectStatement = (statement: Record<string, unknown>): Array<[string, string]> => inspectDocument({ Statement: [{ ...baseStatement, ...statement }], Version: "2012-10-17" });

const inspectCondition = (condition: unknown): Array<[string, string]> => inspectStatement({ Condition: condition });

const createRecord = (document: unknown, namespace: string = "admin:item"): IApiPolicyDocumentRecord => ({ document: document as IApiPolicyDocumentRecord["document"], id: "policy-a", namespace, sourceType: EApiPolicySourceType.MANAGED, version: "1" });

const codes = AUTHORIZATION_POLICY_DOCUMENT_FAILURE_CONSTANT;

const operatorProperty = (operator: string, key: string): string => (/^\w+$/.test(operator) ? `document.Statement[0].Condition.${operator}[${JSON.stringify(key)}]` : `document.Statement[0].Condition[${JSON.stringify(operator)}][${JSON.stringify(key)}]`);

describe("ApiAuthorizationIamDocumentValidator", () => {
	beforeEach(() => {
		ApiAuthorizationIamResourceDefinitionRegistry.getInstance().register(itemResourceDefinition);
	});

	afterEach(() => {
		ApiAuthorizationIamResourceDefinitionRegistry.getInstance().clear();
	});

	describe("inspect", () => {
		it.each([
			["a deny on a resource column", { StringEquals: { "resource.status": "archived" } }],
			["a list of one value", { StringNotEquals: { "resource.status": ["archived"] } }],
			["a number", { StringEqualsIfExists: { "principal.attributes.level": 7 } }],
			["a boolean on a boolean column", { StringEquals: { "resource.isArchived": true } }],
			["boolean text on a boolean column", { StringNotEqualsIfExists: { "resource.isArchived": "false" } }],
			["a principal variable", { StringEquals: { "resource.status": "${principal.attributes.status}" } }],
			["a claim variable", { StringEquals: { "resource.status": "${principal.claims.status}" } }],
			["a principal id variable", { StringEquals: { "resource.id": "${principal.id}" } }],
			["a path parameter variable", { StringEquals: { "resource.id": "${request.parameters.id}" } }],
			["a request ip variable", { StringEquals: { "principal.attributes.ip": "${request.ip}" } }],
			["a resource variable", { StringEquals: { "principal.attributes.status": "${resource.status}" } }],
			["an escape", { StringEquals: { "resource.status": "${$}{literal}" } }],
			["a request body key", { StringEquals: { "request.body.status": "archived" } }],
			["a request header key", { StringEquals: { "request.headers.x-tenant-id": "t-1" } }],
			["a request ip key", { StringEquals: { "request.ip": "127.0.0.1" } }],
			["a principal role key", { StringEquals: { "principal.roles": "admin" } }],
			["an empty Condition", {}],
		])("accepts %s", (_name: string, condition: unknown) => {
			expect(inspectCondition(condition)).toEqual([]);
		});

		it.each([["*"], ["admin:*"], ["*:read"], ["admin:item:?ead"], ["admin:item*"]])("accepts the Action pattern %s inside the namespace", (pattern: string) => {
			expect(inspectStatement({ Action: [pattern] })).toEqual([]);
		});

		it("accepts a full document with an Id and distinct Sids", () => {
			expect(
				inspectDocument({
					Id: "doc",
					Statement: [
						{ ...baseStatement, Sid: "one" },
						{ ...baseStatement, Effect: EApiPolicyEffect.ALLOW, Resource: ["gameport:admin:item/${?}${*}"], Sid: "two" },
					],
					Version: "2012-10-17",
				}),
			).toEqual([]);
		});

		it.each([
			["a string", "document", "x", codes.DOCUMENT_INVALID],
			["no Version", "document.Version", { Statement: [] }, codes.VERSION_INVALID],
			["a non-string Id", "document.Id", { Id: 5, Statement: [], Version: "2012-10-17" }, codes.DOCUMENT_INVALID],
			["an unknown field", "document.Extra", { Extra: true, Statement: [], Version: "2012-10-17" }, codes.FIELD_UNKNOWN],
			["one statement object", "document.Statement", { Statement: baseStatement, Version: "2012-10-17" }, codes.SHORTHAND_NOT_ALLOWED],
			["a Statement string", "document.Statement", { Statement: "x", Version: "2012-10-17" }, codes.DOCUMENT_INVALID],
			["a non-object statement", "document.Statement[0]", { Statement: [1], Version: "2012-10-17" }, codes.DOCUMENT_INVALID],
			[
				"a duplicate Sid",
				"document.Statement[1].Sid",
				{
					Statement: [
						{ ...baseStatement, Sid: "a" },
						{ ...baseStatement, Sid: "a" },
					],
					Version: "2012-10-17",
				},
				codes.SID_DUPLICATE,
			],
		])("refuses a document with %s", (_name: string, property: string, document: unknown, code: string) => {
			expect(inspectDocument(document)).toEqual([[property, code]]);
		});

		it.each([
			["an unknown field", { Principal: "*" }, "document.Statement[0].Principal", codes.FIELD_UNKNOWN],
			["an empty Sid", { Sid: "" }, "document.Statement[0].Sid", codes.SID_INVALID],
			["a lowercase Effect", { Effect: "allow" }, "document.Statement[0].Effect", codes.EFFECT_INVALID],
			["no Action", { Action: undefined }, "document.Statement[0]", codes.ACTION_MISSING],
			["an empty Action", { Action: [] }, "document.Statement[0].Action", codes.ACTION_MISSING],
			["a scalar Action", { Action: "admin:item:read" }, "document.Statement[0].Action", codes.SHORTHAND_NOT_ALLOWED],
			["Action and NotAction", { NotAction: ["admin:item:read"] }, "document.Statement[0]", codes.ACTION_CONFLICT],
			["no Resource", { Resource: undefined }, "document.Statement[0]", codes.RESOURCE_MISSING],
			["a scalar Resource", { Resource: "gameport:admin:item/*" }, "document.Statement[0].Resource", codes.SHORTHAND_NOT_ALLOWED],
			["an object Resource", { Resource: {} }, "document.Statement[0].Resource", codes.PATTERN_INVALID],
			["Resource and NotResource", { NotResource: ["gameport:admin:item/1"] }, "document.Statement[0]", codes.RESOURCE_CONFLICT],
			["an empty pattern", { Resource: [""] }, "document.Statement[0].Resource[0]", codes.PATTERN_INVALID],
			["a non-string pattern", { Resource: [5] }, "document.Statement[0].Resource[0]", codes.PATTERN_INVALID],
			["a malformed ${...}", { Resource: ["gameport:admin:item/${"] }, "document.Statement[0].Resource[0]", codes.PATTERN_INVALID],
			["an Action outside the namespace", { Action: ["other:item:read"] }, "document.Statement[0].Action[0]", codes.PATTERN_OUTSIDE_NAMESPACE],
			["an Action on a longer namespace", { Action: ["admin:items*"] }, "document.Statement[0].Action[0]", codes.PATTERN_OUTSIDE_NAMESPACE],
			["a variable in Action", { Action: ["admin:item:${principal.id}"] }, "document.Statement[0].Action[0]", codes.VARIABLE_NOT_ALLOWED],
			["a client-controlled variable in Resource", { Resource: ["gameport:admin:item/${request.body.id}"] }, "document.Statement[0].Resource[0]", codes.VARIABLE_NOT_ALLOWED],
			["an unknown variable in Resource", { Resource: ["gameport:admin:item/${user.id}"] }, "document.Statement[0].Resource[0]", codes.VARIABLE_UNKNOWN],
			["a principal variable in Resource", { Resource: ["gameport:admin:item/${principal.id}"] }, "document.Statement[0].Resource[0]", codes.NOT_SUPPORTED_YET],
			["NotAction", { Action: undefined, NotAction: ["admin:item:read"] }, "document.Statement[0].NotAction", codes.NOT_SUPPORTED_YET],
			["NotResource", { NotResource: ["gameport:admin:item/1"], Resource: undefined }, "document.Statement[0].NotResource", codes.NOT_SUPPORTED_YET],
			["a non-object Condition", { Condition: "x" }, "document.Statement[0].Condition", codes.CONDITION_INVALID],
		])("refuses a statement with %s", (_name: string, statement: Record<string, unknown>, property: string, code: string) => {
			expect(inspectStatement(statement)).toEqual([[property, code]]);
		});

		it.each([
			["an empty key map", { StringEquals: {} }, "document.Statement[0].Condition.StringEquals", codes.CONDITION_INVALID],
			["a scalar key map", { StringEquals: "x" }, "document.Statement[0].Condition.StringEquals", codes.CONDITION_INVALID],
			["an unknown operator", { StringMatches: { "principal.id": "a" } }, "document.Statement[0].Condition.StringMatches", codes.CONDITION_OPERATOR_UNKNOWN],
			["an operator in another case", { stringequals: { "principal.id": "a" } }, "document.Statement[0].Condition.stringequals", codes.CONDITION_OPERATOR_UNKNOWN],
			["NullIfExists", { NullIfExists: { "principal.id": "true" } }, "document.Statement[0].Condition.NullIfExists", codes.CONDITION_OPERATOR_UNKNOWN],
			["BinaryEquals", { BinaryEquals: { "principal.id": "a" } }, "document.Statement[0].Condition.BinaryEquals", codes.CONDITION_OPERATOR_NOT_ALLOWED],
			["StringLikeIgnoreCase", { StringLikeIgnoreCaseIfExists: { "principal.id": "a" } }, "document.Statement[0].Condition.StringLikeIgnoreCaseIfExists", codes.CONDITION_OPERATOR_NOT_ALLOWED],
			["an unknown qualifier", { "ForSomeValues:StringEquals": { "principal.roles": "a" } }, 'document.Statement[0].Condition["ForSomeValues:StringEquals"]', codes.CONDITION_QUALIFIER_UNKNOWN],
			["a qualifier on Null", { "ForAnyValue:Null": { "principal.roles": "true" } }, 'document.Statement[0].Condition["ForAnyValue:Null"]', codes.CONDITION_QUALIFIER_UNSUPPORTED],
			["a qualifier on a single-valued key", { "ForAllValues:StringEquals": { "principal.id": "a" } }, operatorProperty("ForAllValues:StringEquals", "principal.id"), codes.CONDITION_QUALIFIER_UNSUPPORTED],
			["a qualifier on a multi-valued key", { "ForAnyValue:StringEquals": { "principal.roles": "a" } }, operatorProperty("ForAnyValue:StringEquals", "principal.roles"), codes.NOT_SUPPORTED_YET],
			["an unknown key", { StringEquals: { "user.id": "a" } }, operatorProperty("StringEquals", "user.id"), codes.CONDITION_KEY_UNKNOWN],
			["an unmapped resource key", { StringEquals: { "resource.unknown": "a" } }, operatorProperty("StringEquals", "resource.unknown"), codes.CONDITION_KEY_UNKNOWN],
			["request.secureTransport", { StringEquals: { "request.secureTransport": "true" } }, operatorProperty("StringEquals", "request.secureTransport"), codes.CONDITION_KEY_NOT_ALLOWED],
			["request.time", { StringEquals: { "request.time": "a" } }, operatorProperty("StringEquals", "request.time"), codes.NOT_SUPPORTED_YET],
			["request.sourceIp", { StringEquals: { "request.sourceIp": "a" } }, operatorProperty("StringEquals", "request.sourceIp"), codes.NOT_SUPPORTED_YET],
			["a non-filterable resource key", { StringEquals: { "resource.secret": "a" } }, operatorProperty("StringEquals", "resource.secret"), codes.CONDITION_KEY_NOT_FILTERABLE],
			["text other than true or false on a boolean column", { StringEquals: { "resource.isArchived": "yes" } }, operatorProperty("StringEquals", "resource.isArchived"), codes.CONDITION_KEY_TYPE_MISMATCH],
			["an object value", { StringEquals: { "principal.id": { nested: true } } }, operatorProperty("StringEquals", "principal.id"), codes.CONDITION_VALUE_INVALID],
			["a null value", { StringEquals: { "principal.id": null } }, operatorProperty("StringEquals", "principal.id"), codes.CONDITION_VALUE_INVALID],
			["a malformed ${...} value", { StringEquals: { "principal.id": "${principal" } }, operatorProperty("StringEquals", "principal.id"), codes.CONDITION_VALUE_INVALID],
			["an empty value list", { StringEquals: { "principal.id": [] } }, operatorProperty("StringEquals", "principal.id"), codes.CONDITION_VALUE_EMPTY],
			["65 values", { StringEquals: { "principal.id": Array.from({ length: 65 }, (_value: unknown, index: number) => `v${index}`) } }, operatorProperty("StringEquals", "principal.id"), codes.CONDITION_VALUE_TOO_MANY],
			["several values", { StringEquals: { "principal.id": ["a", "b"] } }, operatorProperty("StringEquals", "principal.id"), codes.NOT_SUPPORTED_YET],
			["an unknown variable", { StringEquals: { "principal.id": "${user.id}" } }, operatorProperty("StringEquals", "principal.id"), codes.VARIABLE_UNKNOWN],
			["a whole-resource variable", { StringEquals: { "principal.id": "${resource}" } }, operatorProperty("StringEquals", "principal.id"), codes.VARIABLE_UNKNOWN],
			["a request body variable", { StringEquals: { "resource.status": "${request.body.status}" } }, operatorProperty("StringEquals", "resource.status"), codes.VARIABLE_NOT_ALLOWED],
			["a request query variable", { StringEquals: { "resource.status": "${request.query.status}" } }, operatorProperty("StringEquals", "resource.status"), codes.VARIABLE_NOT_ALLOWED],
			["a request header variable", { StringEquals: { "resource.status": "${request.headers.x-status}" } }, operatorProperty("StringEquals", "resource.status"), codes.VARIABLE_NOT_ALLOWED],
			["a role list variable", { StringEquals: { "resource.status": "${principal.roles}" } }, operatorProperty("StringEquals", "resource.status"), codes.VARIABLE_NOT_ALLOWED],
			["a request.secureTransport variable", { StringEquals: { "resource.status": "${request.secureTransport}" } }, operatorProperty("StringEquals", "resource.status"), codes.VARIABLE_NOT_ALLOWED],
			["a request.time variable", { StringEquals: { "resource.status": "${request.time}" } }, operatorProperty("StringEquals", "resource.status"), codes.NOT_SUPPORTED_YET],
			["an embedded variable", { StringEquals: { "resource.status": "pre-${principal.id}" } }, operatorProperty("StringEquals", "resource.status"), codes.NOT_SUPPORTED_YET],
			["a variable default", { StringEquals: { "resource.status": "${principal.attributes.status, 'none'}" } }, operatorProperty("StringEquals", "resource.status"), codes.NOT_SUPPORTED_YET],
		])("refuses a condition with %s", (_name: string, condition: unknown, property: string, code: string) => {
			expect(inspectCondition(condition)).toEqual([[property, code]]);
		});

		it.each(Object.values(EApiPolicyConditionOperator).filter((operator: EApiPolicyConditionOperator) => !operator.startsWith("String") || operator.includes("IgnoreCase") || operator.includes("Like")))("refuses the %s operator as not supported yet", (operator: EApiPolicyConditionOperator) => {
			expect(inspectCondition({ [operator]: { "principal.attributes.flag": "true" } })).toContainEqual([`document.Statement[0].Condition.${operator}`, codes.NOT_SUPPORTED_YET]);
		});

		it.each([EApiPolicyConditionOperator.STRING_EQUALS, EApiPolicyConditionOperator.STRING_EQUALS_IF_EXISTS, EApiPolicyConditionOperator.STRING_NOT_EQUALS, EApiPolicyConditionOperator.STRING_NOT_EQUALS_IF_EXISTS])("accepts the %s operator", (operator: EApiPolicyConditionOperator) => {
			expect(inspectCondition({ [operator]: { "principal.id": "user-1" } })).toEqual([]);
		});

		it.each([
			["DateEquals", 1_700_000_000, codes.CONDITION_VALUE_EPOCH_NOT_ALLOWED],
			["DateEquals", "1700000000", codes.CONDITION_VALUE_EPOCH_NOT_ALLOWED],
			["DateEquals", "2024-01-01T10:00:00", codes.CONDITION_VALUE_NO_TIME_ZONE],
			["DateEquals", "2024-01-01T10:00:00.1234Z", codes.CONDITION_VALUE_TOO_PRECISE],
			["DateEquals", "2024-13-01", codes.CONDITION_VALUE_INVALID],
			["DateEquals", "2024-02-30T10:00:00Z", codes.CONDITION_VALUE_INVALID],
			["DateEquals", "2024-01-01T24:00:00Z", codes.CONDITION_VALUE_INVALID],
			["NumericEquals", "ten", codes.CONDITION_VALUE_INVALID],
			["NumericEquals", 0.123_456_789_012_345_67, codes.CONDITION_VALUE_TOO_PRECISE],
			["NumericEquals", "pre-${principal.id}", codes.CONDITION_VALUE_INVALID],
			["Bool", "yes", codes.CONDITION_VALUE_INVALID],
			["Null", "${principal.id}", codes.CONDITION_VALUE_INVALID],
			["IpAddress", "10.0.0.0/33", codes.CONDITION_VALUE_INVALID],
			["IpAddress", "host", codes.CONDITION_VALUE_INVALID],
		])("checks the %s value %s already", (operator: string, value: unknown, code: string) => {
			expect(inspectCondition({ [operator]: { "principal.attributes.value": value } })).toEqual([
				[`document.Statement[0].Condition.${operator}`, codes.NOT_SUPPORTED_YET],
				[operatorProperty(operator, "principal.attributes.value"), code],
			]);
		});

		it.each([
			["DateEquals", "2024-01-01"],
			["DateEquals", "2024-01-01T10:00:00.123+02:00"],
			["NumericEquals", "-12.5"],
			["NumericEquals", 12],
			["Bool", true],
			["Null", "false"],
			["IpAddress", "10.0.0.0/8"],
			["IpAddress", "2001:db8::/32"],
			["ArnLike", "arn:*:item/?"],
		])("finds only that %s is not supported yet for %s", (operator: string, value: unknown) => {
			expect(inspectCondition({ [operator]: { "principal.attributes.value": value } })).toEqual([[`document.Statement[0].Condition.${operator}`, codes.NOT_SUPPORTED_YET]]);
		});

		it("refuses Bool on a column that is not boolean", () => {
			expect(inspectCondition({ Bool: { "resource.status": "true" } })).toEqual([
				["document.Statement[0].Condition.Bool", codes.NOT_SUPPORTED_YET],
				[operatorProperty("Bool", "resource.status"), codes.CONDITION_KEY_TYPE_MISMATCH],
			]);
		});

		it("reports every failure of a document", () => {
			expect(
				inspectDocument({
					Statement: [
						{ ...baseStatement, Effect: "allow" },
						{ ...baseStatement, Condition: { StringEquals: { "user.id": "a" } }, Resource: "x" },
					],
					Version: "2012-10-17",
				}),
			).toEqual([
				["document.Statement[0].Effect", codes.EFFECT_INVALID],
				["document.Statement[1].Resource", codes.SHORTHAND_NOT_ALLOWED],
				[operatorProperty("StringEquals", "user.id").replace("Statement[0]", "Statement[1]"), codes.CONDITION_KEY_UNKNOWN],
			]);
		});

		it("maps no resource key for a namespace no IAM controller registered", () => {
			const document = { Statement: [{ ...baseStatement, Action: ["other:item:read"], Condition: { StringEquals: { "resource.status": "a" } } }], Version: "2012-10-17" };

			expect(inspectDocument(document, "other:item")).toEqual([[operatorProperty("StringEquals", "resource.status"), codes.CONDITION_KEY_UNKNOWN]]);
		});
	});

	describe("assertSavable", () => {
		it("throws a request validation failure with one failure per problem", () => {
			let error: unknown;

			try {
				new ApiAuthorizationIamDocumentValidator().assertSavable({ Statement: [{ ...baseStatement, Effect: "allow", Sid: "" }], Version: "2012-10-17" }, { namespace: "admin:item" });
			} catch (caught: unknown) {
				error = caught;
			}

			expect(error).toBeInstanceOf(ApiRequestValidationException);
			expect((error as ApiRequestValidationException).validationErrors.map((failure: ValidationError) => [failure.property, Object.keys(failure.constraints ?? {})])).toEqual([
				["document.Statement[0].Sid", [codes.SID_INVALID]],
				["document.Statement[0].Effect", [codes.EFFECT_INVALID]],
			]);
		});

		it("does not throw for a valid document", () => {
			expect(() => new ApiAuthorizationIamDocumentValidator().assertSavable({ Statement: [baseStatement], Version: "2012-10-17" }, { namespace: "admin:item" })).not.toThrow();
		});
	});

	describe("validate", () => {
		it("refuses a loaded document that fails the grammar", () => {
			expect(() => new ApiAuthorizationIamDocumentValidator().validate(createRecord({ Statement: [{ ...baseStatement, Condition: { StringLike: { "principal.id": "a*" } } }], Version: "2012-10-17" }))).toThrow('Policy document "policy-a" is invalid: iamPolicyNotSupportedYet at document.Statement[0].Condition.StringLike');
		});

		it("checks resource keys of a registered namespace", () => {
			expect(() => new ApiAuthorizationIamDocumentValidator().validate(createRecord({ Statement: [{ ...baseStatement, Condition: { StringEquals: { "resource.unknown": "a" } } }], Version: "2012-10-17" }))).toThrow(codes.CONDITION_KEY_UNKNOWN);
		});

		it("skips resource keys of a namespace no IAM controller registered", () => {
			const document = { Statement: [{ ...baseStatement, Action: ["other:item:read"], Condition: { StringEquals: { "resource.unknown": "a" } } }], Version: "2012-10-17" };

			expect(() => new ApiAuthorizationIamDocumentValidator().validate(createRecord(document, "other:item"))).not.toThrow();
		});

		it.each<[string, Record<string, string>, string]>([
			["id", { id: "" }, "Policy document record id must be a non-empty string"],
			["namespace", { namespace: "" }, 'Policy document "policy-a" namespace must be a non-empty string'],
			["sourceType", { sourceType: "" }, 'Policy document "policy-a" sourceType must be a non-empty string'],
			["version", { version: "" }, 'Policy document "policy-a" version must be a non-empty string'],
		])("refuses a record with an empty %s", (_name: string, override: Record<string, string>, message: string) => {
			expect(() => new ApiAuthorizationIamDocumentValidator().validate({ ...createRecord({ Statement: [baseStatement], Version: "2012-10-17" }), ...override } as IApiPolicyDocumentRecord)).toThrow(message);
		});
	});

	describe("IsApiPolicyDocument", () => {
		class PolicyBody {
			@IsApiPolicyDocument({ namespace: "admin:item" })
			public document!: unknown;
		}

		const validateBody = async (document: unknown): Promise<Array<ValidationError>> => await validateObject(Object.assign(new PolicyBody(), { document }));

		it("accepts a valid document", async () => {
			expect(await validateBody({ Statement: [baseStatement], Version: "2012-10-17" })).toEqual([]);
		});

		it("fails with isApiPolicyDocument and lists each path and code in the message", async () => {
			const errors: Array<ValidationError> = await validateBody({ Statement: [{ ...baseStatement, Condition: { StringEquals: { "resource.secret": "a" } } }], Version: "2012-10-17" });

			expect(errors).toHaveLength(1);
			expect(errors[0]?.constraints).toEqual({ isApiPolicyDocument: `document must be a valid IAM policy document: ${operatorProperty("StringEquals", "resource.secret")} ${codes.CONDITION_KEY_NOT_FILTERABLE}` });
		});
	});
});
