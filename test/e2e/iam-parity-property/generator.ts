import type { IApiPolicyStatement } from "../../../src/index";
import type { IE2eIamParityItem } from "./rows";

import { EApiPolicyEffect } from "../../../src/index";

import { E2E_IAM_PARITY_INT64_MAX, E2E_IAM_PARITY_INT64_MIN, E2E_IAM_PARITY_LONG_AMOUNT, E2E_IAM_PARITY_ROWS, E2E_IAM_PARITY_TWO_TO_53, E2E_IAM_PARITY_TWO_TO_53_PLUS_1, E2E_IAM_PARITY_UUID_A, E2E_IAM_PARITY_UUID_B } from "./rows";

/**
 * One resource path over the fixed entity. `{ns}` stands for the namespace of the definition, which holds the database,
 * because validation reads every controller of a namespace in the process.
 */
export interface IE2eIamParityDefinition {
	// Text of a pattern that names exactly this row, with its metacharacters still live.
	exact: (row: IE2eIamParityItem) => string;
	// Whether the route path holds every placeholder, as the read route must.
	hasRead: boolean;
	name: string;
	// Patterns over the path: a suffix after `{ns}`, resolved, wildcarded, misspelled, and naming nothing.
	patterns: ReadonlyArray<string>;
	// Resource path, a suffix after `{ns}`.
	path: string;
}

/**
 * Keys that take the same operators and values. To reach a new family or new keys, add an entry.
 */
export interface IE2eIamParityConditionEntry {
	keys: ReadonlyArray<string>;
	operators: ReadonlyArray<string>;
	values: ReadonlyArray<unknown>;
	// How often the entry is picked, relative to the others; 1 when absent.
	weight?: number;
}

/**
 * One generated policy. It depends only on the seed and the index, never on an earlier case or on the database, so one
 * index replays alone and the same policy runs on every database.
 */
export interface IE2eIamParityCase {
	definition: IE2eIamParityDefinition;
	index: number;
	seed: number;
	statements: Array<IApiPolicyStatement>;
}

/**
 * One policy a run found to disagree, reduced by hand and kept for every later run.
 */
export interface IE2eIamParityPinnedCase {
	definition: string;
	name: string;
	statements: Array<IApiPolicyStatement>;
}

type TE2eIamParityPick = <T>(values: ReadonlyArray<T>) => T;

interface IE2eIamParityRandom {
	chance: (probability: number) => boolean;
	pick: TE2eIamParityPick;
}

const UNRESOLVED: string = "${principal.attributes.missing}";
const EMPTY_VARIABLE: string = "${principal.attributes.empty}";
const ARRAY_VARIABLE: string = "${principal.attributes.list}";
const OBJECT_VARIABLE: string = "${principal.attributes.object}";
const NAME_VARIABLE: string = "${principal.attributes.name}";

const escapePattern = (text: string): string => text.replaceAll("$", "$${$}").replaceAll("*", "$${*}").replaceAll("?", "$${?}");
const render = (value: unknown): string => (value === null || value === undefined ? "" : value instanceof Date ? value.toISOString() : String(value));

/**
 * The resource paths. A placeholder that can hold the separator makes a glob ambiguous, and a column with an alphabet
 * settles it on the dialects where the database enforces that alphabet. Only the path of `{id}` has a read route: the
 * guard fills a placeholder from a path value, and startup refuses a read route that lacks one.
 */
export const E2E_IAM_PARITY_DEFINITIONS: ReadonlyArray<IE2eIamParityDefinition> = [
	{
		exact: (row: IE2eIamParityItem): string => `/${row.id}`,
		hasRead: true,
		name: "id",
		patterns: ["/*", "/item-*", "/item-?", "/a?b", "/*b", "/i*1", "/ITEM-1", "/ITEM-*", "/Z", "/z ", "/trail", "/trail ", "/trail*", "/?", "/??", "/a%*", "/a_b", "/a${?}b", "/s${*}t", "/q${?}r", "/a\\*", "/a/*", "/%", "/_", "/${principal.attributes.itemId}", `/${UNRESOLVED}`, "/${principal.attributes.missing, 'z'}", `/${EMPTY_VARIABLE}`, `/${ARRAY_VARIABLE}`, "/${principal.id}", "/${request.parameters.id}", "/${request.parameters.id}*", "/"],
		path: "/{id}",
	},
	{
		exact: (row: IE2eIamParityItem): string => `/tenant/${render(row.note)}/item/${row.id}`,
		hasRead: false,
		name: "tenant",
		patterns: ["/tenant/*", "/tenant/ann/item/*", "/tenant/ANN/*", "/tenant/?nn/item/*", "/tenant//item/*", "/tenant/*/item/z", "/tenant/t-1*", "/tenant/t-1/item/*", "/tenant/a?b/*", "/tenant/${principal.attributes.name}/item/*", `/tenant/${UNRESOLVED}/item/*`, "/tenant/${principal.attributes.missing, 'ann'}/item/*", "/tenant/${*}/item/*"],
		path: "/tenant/{note}/item/{id}",
	},
	{
		exact: (row: IE2eIamParityItem): string => `/rank/${render(row.rank)}`,
		hasRead: false,
		name: "rank",
		patterns: ["/rank/*", "/rank/7", "/rank/-1", "/rank/07", "/rank/abc", "/rank/7*", "/rank/?", "/rank/", "/rank/1.0", "/rank/2147483648", "/rank/${principal.attributes.rank}", `/rank/${UNRESOLVED}`],
		path: "/rank/{rank}",
	},
	{
		exact: (row: IE2eIamParityItem): string => `/op/${render(row.operatorId)}/item/${row.id}`,
		hasRead: false,
		name: "uuid",
		patterns: ["/op/*", `/op/${E2E_IAM_PARITY_UUID_A}/item/*`, `/op/${E2E_IAM_PARITY_UUID_A.toUpperCase()}/item/*`, "/op//item/*", "/op/not-a-uuid/*", "/op/*/item/z", "/op/0b6f*/item/*", "/op/${principal.attributes.operatorId}/item/*", `/op/${UNRESOLVED}/item/*`],
		path: "/op/{operatorId}/item/{id}",
	},
	{
		exact: (row: IE2eIamParityItem): string => `/flag/${render(row.isActive)}`,
		hasRead: false,
		name: "flag",
		patterns: ["/flag/*", "/flag/true", "/flag/false", "/flag/TRUE", "/flag/1", "/flag/", "/flag/t*", "/flag/?rue", "/flag/${principal.attributes.isEnabled}"],
		path: "/flag/{isActive}",
	},
	{
		exact: (row: IE2eIamParityItem): string => `/day/${render(row.day)}`,
		hasRead: false,
		name: "day",
		patterns: ["/day/*", "/day/2024-01-01", "/day/2024-*", "/day/2024-13-01", "/day/2024-02-30", "/day/not-a-date", "/day/2024-01-01T00:00:00.000Z", "/day/", "/day/${principal.attributes.today}"],
		path: "/day/{day}",
	},
	{
		exact: (row: IE2eIamParityItem): string => `/at/${render(row.occurredAt)}`,
		hasRead: false,
		name: "at",
		patterns: ["/at/*", "/at/2024-*", "/at/2024-01-01T00:00:00.000Z", "/at/2024-01-01T00:00:00Z", "/at/2024-01-01", "/at/not-a-date", "/at/", "/at/${principal.attributes.since}"],
		path: "/at/{occurredAt}",
	},
	{
		exact: (row: IE2eIamParityItem): string => `/amount/${render(row.amount)}`,
		hasRead: false,
		name: "amount",
		patterns: ["/amount/*", "/amount/1.5", "/amount/1.50", "/amount/1.5000000000", "/amount/abc", "/amount/1e0", "/amount/0", "/amount/1*", "/amount/"],
		path: "/amount/{amount}",
	},
];

// Patterns every path takes: everything, its whole type, and another type.
const COMMON_RESOURCE_PATTERNS: ReadonlyArray<string> = ["*", "{ns}*", "{ns}/*", "{ns}-other/*", `{ns}/${UNRESOLVED}`, "?*"];

// `Action` patterns, for the `list` and `read` actions the views ask with.
const ACTION_PATTERNS: ReadonlyArray<string> = ["{ns}:*", "{ns}:*", "{ns}:*", "{ns}:*", "*", "{ns}:list", "{ns}:read", "{ns}:l*", "{ns}:?ist", "{ns}:*d", "{ns}:delete"];

const NOT_ACTION_PATTERNS: ReadonlyArray<string> = ["{ns}:delete", "{ns}:delete", "{ns}:list", "{ns}:read", "{ns}:re*", "{ns}:*"];

const TEXT_VALUES: ReadonlyArray<unknown> = [
	"ann",
	"ANN",
	"Ann",
	"ann ",
	" ann",
	"ANN ",
	"ånn",
	"ÅNN",
	"😀nn",
	"é",
	"E",
	"a%b",
	"a_b",
	"axb",
	"a\\b",
	"a/b",
	"a*b",
	"a?b",
	"[a]b",
	"*",
	"?",
	"%",
	"_",
	"  ",
	"t-1",
	"bob",
	"'; --",
	"'; DROP TABLE x; --",
	"a\nb",
	"a\u0000b",
	"",
	1,
	true,
	NAME_VARIABLE,
	UNRESOLVED,
	"${principal.attributes.missing, 'ANN'}",
	"${principal.attributes.missing, 'a%b'}",
	`x${NAME_VARIABLE}`,
	EMPTY_VARIABLE,
	ARRAY_VARIABLE,
	OBJECT_VARIABLE,
	"${principal.attributes.rank}",
	"${principal.attributes.isEnabled}",
	"${principal.id}",
	"${resource.note}",
	"${resource.label}",
	"${request.parameters.id}",
	"${request.sourceIp}",
];

const GLOB_VALUES: ReadonlyArray<unknown> = ["a*", "A*", "?nn", "?NN", "*nn", "*nn ", "ann*", "a?b", "a*b", "a%b", "a_b", "a${*}b", "a${?}b", "a\\b", "a\\*", "[a]*", "[a]b", "[a-z]nn", "*", "?", "??", "???", "%", "_", "", "😀*", "?nn", "é", "'*", NAME_VARIABLE, `${NAME_VARIABLE}*`, UNRESOLVED, `a*${UNRESOLVED}`, "a*${principal.attributes.missing, 'n'}", EMPTY_VARIABLE, ARRAY_VARIABLE, "${resource.note}"];

const NUMERIC_VALUES: ReadonlyArray<unknown> = [
	0,
	1,
	-1,
	2,
	3,
	5,
	7,
	1.5,
	-1.5,
	0.1,
	"0",
	"1",
	"-1",
	"1.5",
	"1.50",
	"-1.5",
	"0.5",
	"-0.5",
	"0.1",
	"0.0000000001",
	"-0.0000000001",
	"2147483647",
	"2147483648",
	"-2147483648",
	"-2147483649",
	"1000000000000000",
	"99999999999999999999",
	E2E_IAM_PARITY_INT64_MAX,
	E2E_IAM_PARITY_INT64_MIN,
	"9223372036854775808",
	E2E_IAM_PARITY_TWO_TO_53,
	E2E_IAM_PARITY_TWO_TO_53_PLUS_1,
	E2E_IAM_PARITY_LONG_AMOUNT,
	"1234567890.123456789",
	"0.1234567890123456",
	"${principal.attributes.rank}",
	"${principal.attributes.textRank}",
	UNRESOLVED,
	"${principal.attributes.missing, '1'}",
	NAME_VARIABLE,
	EMPTY_VARIABLE,
	ARRAY_VARIABLE,
	"${resource.rank}",
];

const INSTANT_VALUES: ReadonlyArray<unknown> = [
	"2024-01-01T00:00:00Z",
	"2024-01-01T00:00:00.000Z",
	"2023-12-31T19:00:00-05:00",
	"2024-01-01T02:00:00.123Z",
	"2024-01-01T04:00:00.123+02:00",
	"2023-12-31T23:59:59.999Z",
	"2100-01-01T00:00:00Z",
	"2024-11-03T05:30:00Z",
	"2024-11-03T06:30:00Z",
	"2024-03-10T07:30:00Z",
	"2024-06-01T00:00:00Z",
	"2024-01-01T00:00:00.500Z",
	"0001-01-01T00:00:00Z",
	"9999-12-31T23:59:59.999Z",
	"${principal.attributes.since}",
	"${request.time}",
	UNRESOLVED,
	"${principal.attributes.missing, '2024-01-01T00:00:00Z'}",
	NAME_VARIABLE,
	"${principal.attributes.today}",
	EMPTY_VARIABLE,
];

const CALENDAR_VALUES: ReadonlyArray<unknown> = ["2024-01-01", "2024-01-02", "2023-12-31", "2024-02-29", "2100-01-01", "0001-01-01", "9999-12-31", "${principal.attributes.today}", "${principal.attributes.since}", "${request.time}", UNRESOLVED, "${principal.attributes.missing, '2024-01-01'}", NAME_VARIABLE];

const BOOLEAN_VALUES: ReadonlyArray<unknown> = [true, false, "true", "false", "${principal.attributes.isEnabled}", UNRESOLVED, "${principal.attributes.missing, 'false'}", NAME_VARIABLE, "${principal.attributes.rank}", EMPTY_VARIABLE, ARRAY_VARIABLE];

const ARN_VALUES: ReadonlyArray<unknown> = ["arn:aws:s3:::bucket/a", "arn:aws:s3:::*", "arn:aws:s3:*:*:*", "arn:*:s3:::x", "arn:a.b:s3:::x", "arn:a?b:s3:::x", "arn:a+b:s3:::x", "arn:aws:iam::123:*", "arn:aws:iam::123:*:*", "*:*:*:*:*:*", "arn:aws:s3:::${*}", "arn:aws:s3:::${?}", "arn:aws:s3:::?", "ARN:aws:s3:::bucket/a", "project:internal:x", "project:*:x", "x", "*", "arn:aws:${principal.attributes.name}:::*", `arn:aws:${UNRESOLVED}:::*`, "arn:aws:s3:::'; DROP TABLE x; --"];

const NETWORK_VALUES: ReadonlyArray<unknown> = ["10.0.0.0/8", "10.0.0.1", "2001:db8::/32", "::ffff:10.0.0.0/104", "192.168.0.0/16", "192.168.1.1/32", "0.0.0.0/0", "::/0", "127.0.0.0/8", "127.0.0.1", "${principal.attributes.network}", UNRESOLVED, NAME_VARIABLE];

const STRING_OPERATORS: ReadonlyArray<string> = ["StringEquals", "StringNotEquals"];
const IGNORE_CASE_OPERATORS: ReadonlyArray<string> = ["StringEqualsIgnoreCase", "StringNotEqualsIgnoreCase"];
const LIKE_OPERATORS: ReadonlyArray<string> = ["StringLike", "StringNotLike"];
const NUMERIC_OPERATORS: ReadonlyArray<string> = ["NumericEquals", "NumericNotEquals", "NumericLessThan", "NumericLessThanEquals", "NumericGreaterThan", "NumericGreaterThanEquals"];
const DATE_OPERATORS: ReadonlyArray<string> = ["DateEquals", "DateNotEquals", "DateLessThan", "DateLessThanEquals", "DateGreaterThan", "DateGreaterThanEquals"];
const ARN_OPERATORS: ReadonlyArray<string> = ["ArnEquals", "ArnNotEquals", "ArnLike", "ArnNotLike"];
const IP_OPERATORS: ReadonlyArray<string> = ["IpAddress", "NotIpAddress"];

const TEXT_KEYS: ReadonlyArray<string> = ["resource.label", "resource.note", "resource.id", "resource.ownerLabel"];

// Keys and values of every operator family. The grammar refuses a few on purpose: on a database without the column type, or an operator that does not fit the column, every view must refuse alike.
export const E2E_IAM_PARITY_CONDITION_ENTRIES: ReadonlyArray<IE2eIamParityConditionEntry> = [
	{ keys: TEXT_KEYS, operators: STRING_OPERATORS, values: TEXT_VALUES, weight: 4 },
	{ keys: TEXT_KEYS, operators: IGNORE_CASE_OPERATORS, values: TEXT_VALUES, weight: 2 },
	{ keys: TEXT_KEYS, operators: LIKE_OPERATORS, values: GLOB_VALUES, weight: 4 },
	{ keys: ["resource.coded"], operators: STRING_OPERATORS, values: ["ann", "ANN", "x-ann", "a%b", "", "a*", "x-*", NAME_VARIABLE, UNRESOLVED] },
	{ keys: ["resource.operatorId"], operators: STRING_OPERATORS, values: [E2E_IAM_PARITY_UUID_A, E2E_IAM_PARITY_UUID_B, E2E_IAM_PARITY_UUID_A.toUpperCase(), "not-a-uuid", "", "${principal.attributes.operatorId}", NAME_VARIABLE, UNRESOLVED], weight: 2 },
	{ keys: ["resource.kind"], operators: STRING_OPERATORS, values: ["alpha", "beta", "Alpha", "gamma", "", NAME_VARIABLE, UNRESOLVED], weight: 2 },
	{ keys: ["resource.isActive", "resource.ownerActive"], operators: STRING_OPERATORS, values: [true, false, "true", "false", "${principal.attributes.isEnabled}", NAME_VARIABLE, UNRESOLVED] },
	{ keys: ["resource.rank", "resource.ownerRank"], operators: NUMERIC_OPERATORS, values: NUMERIC_VALUES, weight: 3 },
	{ keys: ["resource.amount"], operators: NUMERIC_OPERATORS, values: NUMERIC_VALUES, weight: 2 },
	{ keys: ["resource.big"], operators: NUMERIC_OPERATORS, values: NUMERIC_VALUES, weight: 2 },
	{ keys: ["resource.ratio"], operators: NUMERIC_OPERATORS, values: NUMERIC_VALUES, weight: 2 },
	{ keys: ["resource.occurredAt", "resource.ownerAt"], operators: DATE_OPERATORS, values: INSTANT_VALUES, weight: 3 },
	{ keys: ["resource.day"], operators: DATE_OPERATORS, values: CALENDAR_VALUES, weight: 2 },
	{ keys: ["resource.isActive", "resource.ownerActive"], operators: ["Bool"], values: BOOLEAN_VALUES, weight: 2 },
	{ keys: ["resource.label", "resource.note", "resource.rank", "resource.amount", "resource.isActive", "resource.occurredAt", "resource.day", "resource.operatorId", "resource.kind", "resource.ownerLabel", "resource.ownerRank", "resource.ownerActive", "resource.ownerAt", "resource.coded"], operators: ["Null"], values: [true, false, "true", "false"], weight: 2 },
	{ keys: ["resource.arn", "resource.ownerArn"], operators: ARN_OPERATORS, values: ARN_VALUES },
	{ keys: ["resource.address"], operators: IP_OPERATORS, values: NETWORK_VALUES, weight: 0.5 },
	{ keys: ["principal.attributes.name"], operators: [...STRING_OPERATORS, ...IGNORE_CASE_OPERATORS, ...LIKE_OPERATORS], values: ["ann", "ANN", "a*", "bob", "", "${resource.note}", "${resource.label}", UNRESOLVED] },
	{ keys: ["principal.id", "principal.type"], operators: STRING_OPERATORS, values: ["user-1", "user", "bob", UNRESOLVED] },
	{ keys: ["principal.attributes.rank"], operators: NUMERIC_OPERATORS, values: [0, 1, 2, "1", "1.5", "${resource.rank}", UNRESOLVED] },
	{ keys: ["principal.attributes.isEnabled"], operators: ["Bool"], values: [true, false, "${resource.isActive}", UNRESOLVED] },
	{ keys: ["principal.attributes.since"], operators: DATE_OPERATORS, values: ["2024-01-01T00:00:00Z", "2020-01-01T00:00:00Z", "${resource.occurredAt}", "${request.time}"] },
	{ keys: ["principal.attributes.missing", "principal.attributes.empty", "principal.attributes.list"], operators: ["Null"], values: [true, false] },
	{ keys: ["principal.attributes.list"], operators: STRING_OPERATORS, values: ["ann", "bob"] },
	{ keys: ["principal.attributes.missing", "principal.attributes.empty"], operators: [...STRING_OPERATORS, ...LIKE_OPERATORS], values: ["ann", "", "*"] },
	{ keys: ["request.time"], operators: DATE_OPERATORS, values: ["2999-01-01T00:00:00Z", "2000-01-01T00:00:00Z", "${principal.attributes.since}", "${resource.occurredAt}"] },
	{ keys: ["request.sourceIp", "request.ip"], operators: IP_OPERATORS, values: ["127.0.0.0/8", "127.0.0.1", "10.0.0.0/8", "2001:db8::/32", "${principal.attributes.network}", UNRESOLVED] },
	{ keys: ["request.parameters.id"], operators: [...STRING_OPERATORS, ...LIKE_OPERATORS], values: ["z", "item-*", "*", NAME_VARIABLE, "${resource.id}"] },
	// An operator that does not fit its column: the grammar refuses the document.
	{ keys: ["resource.rank", "resource.amount"], operators: [...STRING_OPERATORS, ...LIKE_OPERATORS], values: ["1", "${principal.attributes.rank}"], weight: 0.25 },
	{ keys: ["resource.label"], operators: ["NumericEquals", "Bool", "DateEquals"], values: ["1", "true", "2024-01-01"], weight: 0.25 },
];

// Prefixes of an operator: phase P5 adds "ForAnyValue:" and "ForAllValues:".
export const E2E_IAM_PARITY_QUALIFIERS: ReadonlyArray<string> = [""];

// How many values one key takes: phase P5 adds counts above 1, which the grammar refuses today.
export const E2E_IAM_PARITY_VALUE_COUNTS: ReadonlyArray<number> = [1];

const CONDITION_KEY_COUNTS: ReadonlyArray<number> = [0, 1, 1, 1, 2];
const STATEMENT_COUNTS: ReadonlyArray<number> = [1, 1, 2, 2, 3];
const PATTERN_COUNTS: ReadonlyArray<number> = [1, 1, 1, 2];

// Mixes a seed and an index into a 32-bit state, so neighbouring indices draw unrelated sequences.
const mix = (seed: number, index: number): number => {
	let state: number = (Math.trunc(seed) ^ 0x9e_37_79_b9) >>> 0;

	for (const part of [index, index >>> 16]) {
		state = Math.imul(state ^ (part & 0xff_ff), 0x85_eb_ca_6b) >>> 0;
		state = (state ^ (state >>> 13)) >>> 0;
	}

	return state;
};

/**
 * Creates the random source of one case: mulberry32, which has no dependency on the Node version.
 * @param {number} seed - Seed of the run.
 * @param {number} index - Index of the case.
 * @returns {IE2eIamParityRandom} The source.
 */
function createRandom(seed: number, index: number): IE2eIamParityRandom {
	let state: number = mix(seed, index);

	const next = (): number => {
		state = (state + 0x6d_2b_79_f5) >>> 0;

		let value: number = state;

		value = Math.imul(value ^ (value >>> 15), value | 1);
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

		return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
	};

	return {
		chance: (probability: number): boolean => next() < probability,
		pick: <T>(values: ReadonlyArray<T>): T => values[Math.floor(next() * values.length)] as T,
	};
}

const pickEntry = (random: IE2eIamParityRandom): IE2eIamParityConditionEntry => {
	const scaled: Array<IE2eIamParityConditionEntry> = E2E_IAM_PARITY_CONDITION_ENTRIES.flatMap((entry: IE2eIamParityConditionEntry): Array<IE2eIamParityConditionEntry> => Array.from({ length: Math.round((entry.weight ?? 1) * 4) }, (): IE2eIamParityConditionEntry => entry));

	return random.pick(scaled);
};

const generateCondition = (random: IE2eIamParityRandom): Record<string, Record<string, unknown>> | undefined => {
	const condition: Record<string, Record<string, unknown>> = {};

	for (let count: number = random.pick(CONDITION_KEY_COUNTS); count > 0; count--) {
		const entry: IE2eIamParityConditionEntry = pickEntry(random);
		const base: string = random.pick(entry.operators);
		// `Null` has no IfExists form.
		const operator: string = `${random.pick(E2E_IAM_PARITY_QUALIFIERS)}${base}${base !== "Null" && random.chance(0.25) ? "IfExists" : ""}`;
		const valueCount: number = random.pick(E2E_IAM_PARITY_VALUE_COUNTS);
		const values: Array<unknown> = Array.from({ length: valueCount }, (): unknown => random.pick(entry.values));

		// One value is written as a scalar or as a list of one, which read alike.
		(condition[operator] ??= {})[random.pick(entry.keys)] = values.length === 1 && random.chance(0.85) ? values[0] : values;
	}

	return Object.keys(condition).length > 0 ? condition : undefined;
};

const generatePattern = (random: IE2eIamParityRandom, definition: IE2eIamParityDefinition): string => {
	if (random.chance(0.15)) {
		return random.pick(COMMON_RESOURCE_PATTERNS);
	}

	if (random.chance(0.35)) {
		const exact: string = definition.exact(random.pick(E2E_IAM_PARITY_ROWS));

		// The text of a row, its metacharacters live or escaped.
		return `{ns}${random.chance(0.5) ? exact : escapePattern(exact)}`;
	}

	return `{ns}${random.pick(definition.patterns)}`;
};

const generateTarget = (random: IE2eIamParityRandom, pool: () => string): Array<string> => [...new Set(Array.from({ length: random.pick(PATTERN_COUNTS) }, pool))];

const generateStatement = (random: IE2eIamParityRandom, definition: IE2eIamParityDefinition, effect: EApiPolicyEffect): IApiPolicyStatement => {
	const condition: Record<string, Record<string, unknown>> | undefined = generateCondition(random);
	const action: Partial<IApiPolicyStatement> = random.chance(0.2) ? { NotAction: generateTarget(random, (): string => random.pick(NOT_ACTION_PATTERNS)) } : { Action: generateTarget(random, (): string => random.pick(ACTION_PATTERNS)) };
	const patterns: Array<string> = generateTarget(random, (): string => generatePattern(random, definition));
	const resource: Partial<IApiPolicyStatement> = random.chance(0.25) ? { NotResource: patterns } : { Resource: random.chance(0.35) ? ["*"] : patterns };

	return { ...action, ...(condition ? { Condition: condition } : {}), Effect: effect, ...resource } as IApiPolicyStatement;
};

// Writes the namespace into every pattern of a statement.
const placeNamespace = (statement: IApiPolicyStatement, namespace: string): IApiPolicyStatement => {
	const place = (patterns?: ReadonlyArray<string>): Array<string> | undefined => patterns?.map((pattern: string): string => pattern.replaceAll("{ns}", namespace));
	const placed: IApiPolicyStatement = { ...statement };

	for (const field of ["Action", "NotAction", "Resource", "NotResource"] as const) {
		if (statement[field]) {
			placed[field] = place(statement[field]);
		}
	}

	return placed;
};

/**
 * Places a policy written by hand on a database, as the generator does.
 * @param {IE2eIamParityPinnedCase} pinned - Policy with `{ns}` in its patterns.
 * @param {string} database - Database under test.
 * @returns {IE2eIamParityCase} The policy, which holds index 0 of seed 0.
 */
export function createE2eIamParityPinnedCase(pinned: IE2eIamParityPinnedCase, database: string): IE2eIamParityCase {
	const definition: IE2eIamParityDefinition = E2E_IAM_PARITY_DEFINITIONS.find((candidate: IE2eIamParityDefinition): boolean => candidate.name === pinned.definition) as IE2eIamParityDefinition;
	const namespace: string = readE2eIamParityNamespace(definition, database);

	return { definition, index: 0, seed: 0, statements: pinned.statements.map((statement: IApiPolicyStatement): IApiPolicyStatement => placeNamespace(statement, namespace)) };
}

/**
 * Tells the namespace of a definition on a database.
 * @param {IE2eIamParityDefinition} definition - Resource path.
 * @param {string} database - Database under test.
 * @returns {string} The namespace, unique in the process.
 */
export function readE2eIamParityNamespace(definition: IE2eIamParityDefinition, database: string): string {
	return `pp${definition.name}${database}:item`;
}

/**
 * Generates one policy. Half of them start from an Allow of everything, so a Deny has rows to take away; the others start
 * from a random Allow, so a list may hold only part of the rows.
 * @param {number} seed - Seed of the run.
 * @param {number} index - Index of the case in the run.
 * @param {string} database - Database under test, which only names the namespace.
 * @returns {IE2eIamParityCase} The policy.
 */
export function generateE2eIamParityCase(seed: number, index: number, database: string): IE2eIamParityCase {
	const random: IE2eIamParityRandom = createRandom(seed, index);
	// The path of `{id}` is the one with all three views.
	const definition: IE2eIamParityDefinition = random.chance(0.5) ? (E2E_IAM_PARITY_DEFINITIONS[0] as IE2eIamParityDefinition) : random.pick(E2E_IAM_PARITY_DEFINITIONS);
	const statements: Array<IApiPolicyStatement> = [];
	const statementCount: number = random.pick(STATEMENT_COUNTS);

	if (random.chance(0.5)) {
		statements.push({ Action: ["{ns}:*"], Effect: EApiPolicyEffect.ALLOW, Resource: ["*"] });
	}

	while (statements.length < statementCount + (statements.length > 0 ? 1 : 0)) {
		statements.push(generateStatement(random, definition, statements.length === 0 || random.chance(0.3) ? EApiPolicyEffect.ALLOW : EApiPolicyEffect.DENY));
	}

	const namespace: string = readE2eIamParityNamespace(definition, database);

	return { definition, index, seed, statements: statements.map((statement: IApiPolicyStatement): IApiPolicyStatement => placeNamespace(statement, namespace)) };
}
