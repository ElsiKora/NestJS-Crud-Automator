import type { IApiPolicyStatement } from "../../../src/index";
import type { IE2eIamParityPinnedCase } from "./generator";

import { EApiPolicyEffect } from "../../../src/index";

// Zeros of a number no floating-point column can hold.
const OVERFLOW_ZEROS: number = 400;

const ALLOW_EVERYTHING: IApiPolicyStatement = { Action: ["{ns}:*"], Effect: EApiPolicyEffect.ALLOW, Resource: ["*"] };

const denyRow = (definition: string, name: string, pattern: string): IE2eIamParityPinnedCase => ({ definition, name: `a Deny of ${name}`, statements: [ALLOW_EVERYTHING, { Action: ["{ns}:*"], Effect: EApiPolicyEffect.DENY, Resource: [`{ns}${pattern}`] }] });
const allowOthers = (definition: string, name: string, pattern: string): IE2eIamParityPinnedCase => ({ definition, name: `an Allow of what is not ${name}`, statements: [{ Action: ["{ns}:*"], Effect: EApiPolicyEffect.ALLOW, NotResource: [`{ns}${pattern}`] }] });

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
];
