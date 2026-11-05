export interface IE2eIamParityOwner {
	arn?: null | string;
	id: string;
	isActive?: boolean | null;
	label?: null | string;
	occurredAt?: Date | null;
	rank?: null | number;
}

// A related row of an item, through its to-many relation.
export interface IE2eIamParityNote {
	coded?: null | string;
	day?: null | string;
	deletedAt?: Date | null;
	id: string;
	isActive?: boolean | null;
	occurredAt?: Date | null;
	score?: null | number;
	text?: null | string;
}

export interface IE2eIamParityItem {
	address?: null | string;
	amount?: null | number | string;
	arn?: null | string;
	big?: null | number | string;
	coded?: null | string;
	day?: null | string;
	id: string;
	isActive?: boolean | null;
	kind?: null | string;
	label: string;
	note?: null | string;
	notes?: Array<IE2eIamParityNote>;
	occurredAt?: Date | null;
	operatorId?: null | string;
	owner?: IE2eIamParityOwner | null;
	rank?: null | number;
	ratio?: null | number;
	single?: null | number;
}

// A related row as it is saved: the item it belongs to, and whether it is soft-deleted after the save.
export interface IE2eIamParityNoteSeed extends Omit<IE2eIamParityNote, "deletedAt"> {
	isDeleted: boolean;
	itemId: string;
}

export const E2E_IAM_PARITY_UUID_A: string = "0b6f1c1e-7d2a-4c8e-9a51-3f4e2d1c0b9a";
export const E2E_IAM_PARITY_UUID_B: string = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
export const E2E_IAM_PARITY_UUID_C: string = "16fd2706-8baf-433b-82eb-8c7fada847da";

const INT32_MAX: number = 2_147_483_647;
const INT32_MIN: number = -2_147_483_648;

export const E2E_IAM_PARITY_INT64_MAX: string = "9223372036854775807";
export const E2E_IAM_PARITY_INT64_MIN: string = "-9223372036854775808";
export const E2E_IAM_PARITY_TWO_TO_53: string = "9007199254740992";
export const E2E_IAM_PARITY_TWO_TO_53_PLUS_1: string = "9007199254740993";
export const E2E_IAM_PARITY_LONG_AMOUNT: string = "1234567890.1234567891";

export const E2E_IAM_PARITY_OWNERS: ReadonlyArray<IE2eIamParityOwner> = [
	{ arn: "arn:aws:s3:::owner", id: "o-full", isActive: true, label: "ann", occurredAt: new Date("2024-06-01T00:00:00.000Z"), rank: 5 },
	{ arn: null, id: "o-null", isActive: null, label: null, occurredAt: null, rank: null },
	{ arn: "", id: "o-edge", isActive: false, label: "ANN ", occurredAt: new Date("2024-11-03T05:30:00.000Z"), rank: -1 },
];

// Primary keys hold LIKE and GLOB metacharacters, the path separator and a code point outside the Basic Multilingual Plane. No two differ only in
// letter case, accents or trailing spaces, because the default MySQL and MariaDB collations would read them as one key.
const IDS: ReadonlyArray<string> = ["a%b", "a_b", "axb", "a\\b", "a/b", "s*t", "q?r", "🙂", "item-1", "item-10", "item-2", "z", "trail ", "o'x", "00", "é", "[a]", "r-18"];

// Text that differs only in letter case, accents or spaces, and the metacharacters of a LIKE, a GLOB or a quoted string.
const LABELS: ReadonlyArray<string> = ["ann", "ANN", "Ann", "ann ", " ann", "", "a%b", "a_b", "axb", "a\\b", "a*b", "a?b", "ånn", "ÅNN", "😀nn", "'; --", "[a]b", "a\nb"];
const NOTES: ReadonlyArray<null | string> = [null, "ann", "", "ANN", "ann ", "a%b", "a_b", "a\\b", "a/b", "é", "😀", "t-1", "t-1/item/x", "*", "?", "  ", null, "Ann"];
const CODED: ReadonlyArray<null | string> = ["ann", null, "ANN", "", "a%b"];
const ARNS: ReadonlyArray<null | string> = ["arn:aws:s3:::bucket/a", "arn:aws:s3:eu:123:bucket/b", null, "", "ARN:aws:s3:::bucket/a", "arn:aws:iam::123:user/x:y", "arn:aws:s3:::*", "arn:aws:s3:::?", "project:internal:x", "arn:a.b:s3:::x"];
const ADDRESSES: ReadonlyArray<null | string> = ["10.0.0.1", "2001:db8::1", null, "::ffff:10.0.0.1", "192.168.1.1/24", "11.0.0.1"];
const RANKS: ReadonlyArray<null | number> = [null, 0, 1, -1, 2, 7, 70, INT32_MAX, INT32_MIN, 3];
const AMOUNTS: ReadonlyArray<null | string> = ["1.5", null, "-1.5", "0", "0.0000000001", "-0.0000000001", E2E_IAM_PARITY_LONG_AMOUNT, "3"];
const BIGS: ReadonlyArray<null | string> = ["0", "-1", null, "5", E2E_IAM_PARITY_TWO_TO_53, E2E_IAM_PARITY_TWO_TO_53_PLUS_1, E2E_IAM_PARITY_INT64_MAX, E2E_IAM_PARITY_INT64_MIN];
const RATIOS: ReadonlyArray<null | number> = [1.5, -1.5, 0, null, 0.1, -0.1, 1e15, 3];
// 0.1 and 1.1 have no exact binary form, and a single-precision column widens each to another number than the double it is compared with.
const SINGLES: ReadonlyArray<null | number> = [0.1, null, 1.5, 1.1];
const BOOLEANS: ReadonlyArray<boolean | null> = [true, false, null];
// The instants hold the first of the two 01:30 hours of 2024-11-03 and the hour right after the one skipped on 2024-03-10, in New York.
const INSTANTS: ReadonlyArray<Date | null> = [new Date("2024-01-01T00:00:00.000Z"), new Date("2024-01-01T02:00:00.123Z"), null, new Date("2023-12-31T23:59:59.999Z"), new Date("2100-01-01T00:00:00.000Z"), new Date("2024-11-03T05:30:00.000Z"), new Date("2024-03-10T07:30:00.000Z")];
const DAYS: ReadonlyArray<null | string> = ["2024-01-01", null, "2024-01-02", "2023-12-31", "2024-02-29", "2100-01-01"];
const UUIDS: ReadonlyArray<null | string> = [E2E_IAM_PARITY_UUID_A, null, E2E_IAM_PARITY_UUID_B, E2E_IAM_PARITY_UUID_C];
const KINDS: ReadonlyArray<null | string> = ["alpha", null, "beta"];
const ROW_OWNERS: ReadonlyArray<IE2eIamParityOwner | null> = [{ id: "o-full" }, null, { id: "o-null" }, { id: "o-edge" }];

const cycle = <T>(values: ReadonlyArray<T>, index: number): T => values[index % values.length] as T;

/**
 * The fixed rows. Each column cycles through its edge values with a length of its own, so its values meet those of the
 * others in many pairs; to reach a new edge value, add it to the column's list.
 */
export const E2E_IAM_PARITY_ROWS: ReadonlyArray<IE2eIamParityItem> = IDS.map((id: string, index: number): IE2eIamParityItem => ({
	address: cycle(ADDRESSES, index),
	amount: cycle(AMOUNTS, index),
	arn: cycle(ARNS, index),
	big: cycle(BIGS, index),
	coded: cycle(CODED, index),
	day: cycle(DAYS, index),
	id,
	isActive: cycle(BOOLEANS, index),
	kind: cycle(KINDS, index),
	label: cycle(LABELS, index),
	note: cycle(NOTES, index),
	occurredAt: cycle(INSTANTS, index),
	operatorId: cycle(UUIDS, index),
	owner: cycle(ROW_OWNERS, index),
	rank: cycle(RANKS, index),
	ratio: cycle(RATIOS, index),
	single: cycle(SINGLES, index),
}));

type TE2eIamParityNoteValues = [text: null | string, score: null | number, isActive: boolean | null, occurredAt: Date | null, day: null | string, coded: null | string, isDeleted?: boolean];

const NOTE_NULL: TE2eIamParityNoteValues = [null, null, null, null, null, null];
const NOTE_ANN: TE2eIamParityNoteValues = ["ann", 1, true, new Date("2024-01-01T00:00:00.000Z"), "2024-01-01", "ann"];

/**
 * The related rows of an item, by the item's index: none, one, several, a related row of NULL values, several that agree,
 * and soft-deleted ones, which do not count, so a set of only soft-deleted rows is empty. Its length differs from that of
 * every column, so each set meets other values of the item.
 */
const NOTE_SETS: ReadonlyArray<ReadonlyArray<TE2eIamParityNoteValues>> = [
	[],
	[NOTE_ANN],
	[NOTE_ANN, ["bob", 7, false, new Date("2024-11-03T05:30:00.000Z"), "2024-01-02", "bob"]],
	[NOTE_NULL],
	[NOTE_ANN, [null, 7, null, new Date("2024-03-10T07:30:00.000Z"), null, null]],
	[["ann", 1, true, new Date("2024-01-01T00:00:00.000Z"), "2024-01-01", "ann", true]],
	[
		["bob", -1, false, new Date("2023-12-31T23:59:59.999Z"), "2023-12-31", "ANN"],
		["ANN", 7, true, new Date("2024-01-01T00:00:00.000Z"), "2024-01-01", "ann", true],
	],
	[NOTE_ANN, NOTE_ANN],
	[
		["a%b", -1, false, new Date("2024-01-01T02:00:00.123Z"), "2024-02-29", "a%b"],
		["ann ", INT32_MAX, true, new Date("2100-01-01T00:00:00.000Z"), "2100-01-01", ""],
		["", 0, null, null, "2023-12-31", null],
		["😀nn", INT32_MIN, true, new Date("2024-01-01T00:00:00.000Z"), "2024-01-01", "ANN"],
	],
	[["Ann", 2, true, new Date("2024-06-01T00:00:00.000Z"), "2024-01-01", "ann"], NOTE_NULL, ["*", 1, false, null, null, "*", true]],
	[
		["ANN ", 3, false, new Date("2024-03-10T07:30:00.000Z"), "2024-02-29", "a%b"],
		["bob", 70, null, new Date("2024-01-01T00:00:00.000Z"), null, "bob"],
	],
];

// Every related row, with the item it belongs to.
export const E2E_IAM_PARITY_NOTES: ReadonlyArray<IE2eIamParityNoteSeed> = IDS.flatMap((itemId: string, index: number): Array<IE2eIamParityNoteSeed> => cycle(NOTE_SETS, index).map(([text, score, isActive, occurredAt, day, coded, isDeleted]: TE2eIamParityNoteValues, position: number): IE2eIamParityNoteSeed => ({ coded, day, id: `n${String(index)}-${String(position)}`, isActive, isDeleted: isDeleted ?? false, itemId, occurredAt, score, text })));

/**
 * The one principal: its attributes feed the variables of a policy, resolved, empty, and of the wrong type. Its sets hold
 * several values, one, none, a `null` or an object; `principal.roles` holds two values and `principal.groups` none.
 */
export const E2E_IAM_PARITY_USER: Record<string, unknown> = {
	empty: "",
	emptyList: [],
	id: "user-1",
	isEnabled: true,
	itemId: "item-1",
	list: ["ann"],
	name: "ann",
	network: "10.0.0.0/8",
	nothing: null,
	nullList: ["ann", null],
	object: { name: "ann" },
	objectList: ["ann", { name: "ann" }],
	operatorId: E2E_IAM_PARITY_UUID_A,
	rank: 1,
	ranks: [1, 7],
	roles: ["admin", "dev"],
	several: ["ann", "bob", "ANN"],
	since: "2024-01-01T00:00:00Z",
	textRank: "1.5",
	today: "2024-01-01",
};
