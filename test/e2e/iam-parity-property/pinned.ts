import type { IApiPolicyStatement } from "../../../src/index";
import type { IE2eIamParityPinnedCase } from "./generator";

import { EApiPolicyEffect } from "../../../src/index";

// Zeros of a number no floating-point column can hold.
const OVERFLOW_ZEROS: number = 400;

const ALLOW_EVERYTHING: IApiPolicyStatement = { Action: ["{ns}:*"], Effect: EApiPolicyEffect.ALLOW, Resource: ["*"] };

const denyRow = (definition: string, name: string, pattern: string): IE2eIamParityPinnedCase => ({ definition, name: `a Deny of ${name}`, statements: [ALLOW_EVERYTHING, { Action: ["{ns}:*"], Effect: EApiPolicyEffect.DENY, Resource: [`{ns}${pattern}`] }] });
const allowOthers = (definition: string, name: string, pattern: string): IE2eIamParityPinnedCase => ({ definition, name: `an Allow of what is not ${name}`, statements: [{ Action: ["{ns}:*"], Effect: EApiPolicyEffect.ALLOW, NotResource: [`{ns}${pattern}`] }] });
const allowWhen = (operator: string, key: string, value: unknown): IE2eIamParityPinnedCase => ({ definition: "id", name: `an Allow when ${operator} ${key} is ${JSON.stringify(value)}`, statements: [{ Action: ["{ns}:*"], Condition: { [operator]: { [key]: value } }, Effect: EApiPolicyEffect.ALLOW, Resource: ["*"] }] });
const denyWhen = (operator: string, key: string, value: unknown): IE2eIamParityPinnedCase => ({ definition: "id", name: `a Deny when ${operator} ${key} is ${JSON.stringify(value)}`, statements: [ALLOW_EVERYTHING, { Action: ["{ns}:*"], Condition: { [operator]: { [key]: value } }, Effect: EApiPolicyEffect.DENY, Resource: ["*"] }] });

/**
 * Disagreements a seeded run found, each reduced to its smallest policy.
 *
 * An instant placeholder renders ISO text in memory, while a list compared that text with the column natively: SQLite
 * holds other text, and MySQL and MariaDB a wall clock, so the row a Deny names stayed on the list.
 *
 * A date placeholder reached the database with text the column cannot hold, and PostgreSQL and MySQL answered with an error.
 *
 * MySQL compares a single-precision column as a double, so a Deny of the text memory reads did not match the row.
 *
 * TypeORM rewrites the value of a condition through a column transformer in place, so a condition shared between where
 * branches was rewritten once per branch and compared with text no row holds: a Deny over two patterns kept its row.
 */
export const E2E_IAM_PARITY_PINNED_CASES: ReadonlyArray<IE2eIamParityPinnedCase> = [
	denyRow("at", "an instant placeholder", "/at/2024-01-01T00:00:00.000Z"),
	denyRow("at", "an instant placeholder in the hour after a skipped one", "/at/2024-03-10T07:30:00.000Z"),
	denyRow("at", "an instant placeholder written with another offset", "/at/2024-01-01T00:00:00Z"),
	allowOthers("at", "an instant placeholder", "/at/2024-01-01T00:00:00.000Z"),
	denyRow("at", "text no instant placeholder holds", "/at/not-a-date"),
	allowOthers("at", "text no instant placeholder holds", "/at/not-a-date"),
	denyRow("day", "a date placeholder", "/day/2024-01-01"),
	allowOthers("day", "a date placeholder", "/day/2024-01-01"),
	denyRow("day", "a month that does not exist", "/day/2024-13-01"),
	denyRow("day", "a day that does not exist", "/day/2024-02-30"),
	denyRow("day", "text no date placeholder holds", "/day/not-a-date"),
	allowOthers("day", "text no date placeholder holds", "/day/not-a-date"),
	denyRow("amount", "a decimal placeholder", "/amount/1.5"),
	denyRow("amount", "another spelling of a decimal placeholder", "/amount/1.50"),
	denyRow("amount", "text that is no number", "/amount/abc"),
	allowOthers("amount", "text that is no number", "/amount/abc"),
	denyRow("day", "the first day of the first year", "/day/0001-01-01"),
	denyRow("ratio", "a double placeholder", "/ratio/0.1"),
	denyRow("ratio", "a number no double holds", `/ratio/1${"0".repeat(OVERFLOW_ZEROS)}`),
	denyRow("single", "a single-precision placeholder", "/single/0.1"),
	denyRow("single", "a number no single-precision column holds", `/single/1${"0".repeat(OVERFLOW_ZEROS)}`),
	allowOthers("single", "a single-precision placeholder", "/single/0.1"),
	{
		definition: "id",
		name: "a Deny on a transformer column, over two patterns",
		statements: [
			{ Action: ["{ns}:*"], Effect: EApiPolicyEffect.ALLOW, Resource: ["{ns}/s${*}t"] },
			{ Action: ["{ns}:*"], Condition: { StringEquals: { "resource.coded": "ann" } }, Effect: EApiPolicyEffect.DENY, Resource: ["{ns}/a?b", "{ns}/s${*}t"] },
		],
	},
	{
		definition: "id",
		name: "a Deny on a transformer column, over every row",
		statements: [ALLOW_EVERYTHING, { Action: ["{ns}:*"], Condition: { StringEquals: { "resource.coded": "ann" } }, Effect: EApiPolicyEffect.DENY, Resource: ["*"] }],
	},
	{
		definition: "id",
		name: "an Allow on a transformer column",
		statements: [{ Action: ["{ns}:*"], Condition: { StringEquals: { "resource.coded": "ann" } }, Effect: EApiPolicyEffect.ALLOW, Resource: ["*"] }],
	},
	// The edges of a set, kept so every seed reaches them: an empty set, a set of only soft-deleted rows, NULL related values and an unreadable context set.
	allowWhen("ForAllValues:StringEquals", "resource.noteText", "ann"),
	allowWhen("ForAllValues:StringEqualsIfExists", "resource.noteText", ["ann", "bob"]),
	allowWhen("ForAnyValue:StringEquals", "resource.noteText", "ann"),
	allowWhen("ForAnyValue:StringNotEqualsIfExists", "resource.noteText", ["ann", "bob"]),
	allowWhen("ForAllValues:StringNotEquals", "resource.noteText", ["ann", "ANN"]),
	allowWhen("ForAnyValue:NumericGreaterThan", "resource.noteScore", "1"),
	allowWhen("ForAllValues:NumericLessThanEquals", "resource.noteScore", ["7", "2147483647"]),
	allowWhen("ForAnyValue:Bool", "resource.noteActive", "false"),
	allowWhen("ForAllValues:DateLessThan", "resource.noteAt", "2024-06-01T00:00:00Z"),
	allowWhen("ForAnyValue:DateEquals", "resource.noteDay", ["2024-01-01", "2024-02-29"]),
	denyWhen("ForAnyValue:StringEquals", "resource.noteText", "ANN"),
	denyWhen("ForAnyValue:StringEqualsIgnoreCase", "resource.noteText", "ann"),
	denyWhen("ForAllValues:StringLike", "resource.noteText", ["a*", "b*"]),
	denyWhen("ForAnyValue:StringLikeIfExists", "resource.noteText", "*"),
	denyWhen("ForAllValues:NumericNotEquals", "resource.noteScore", ["1", "7"]),
	denyWhen("ForAnyValue:StringEquals", "principal.attributes.nullList", "ann"),
	denyWhen("ForAllValues:StringEquals", "principal.groups", "x"),
	allowWhen("ForAllValues:StringLike", "principal.attributes.objectList", "*"),
	allowWhen("ForAnyValue:StringEquals", "principal.roles", ["dev", "x"]),
	{
		definition: "id",
		name: "an Allow on a set of roles and a Deny on a to-many key",
		statements: [
			{ Action: ["{ns}:*"], Condition: { "ForAnyValue:StringLike": { "principal.roles": "ad*" } }, Effect: EApiPolicyEffect.ALLOW, Resource: ["*"] },
			{ Action: ["{ns}:*"], Condition: { "ForAllValues:StringNotEquals": { "resource.noteText": "bob" }, "ForAnyValue:StringEquals": { "principal.attributes.several": "bob" } }, Effect: EApiPolicyEffect.DENY, Resource: ["*"] },
		],
	},
];
