import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { TypeOrmModuleOptions } from "@nestjs/typeorm";
import type { StartedMySqlContainer } from "@testcontainers/mysql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedTestContainer } from "testcontainers";
import type { Repository } from "typeorm";
import type { IApiAuthorizationPrincipal, IApiPolicyDocumentRecord, IApiPolicyStatement } from "../../src/index";
import type { IE2eIamOperatorFixture, IE2eIamOperatorItem, IE2eIamOperatorOwner, TE2eIamOperatorDatabase } from "./iam-operator-parity";

import { HttpStatus } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MySqlContainer } from "@testcontainers/mysql";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { GenericContainer, Wait } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiAuthorizationSimulator, AuthorizationResolveDefaultPrincipal, EApiAuthorizationPrincipalType, EApiPolicyEffect, EApiPolicySourceType, EApiRouteType } from "../../src/index";
import { createE2eIamOperatorFixture, E2E_IAM_OPERATOR_USER, E2eIamOperatorGuard } from "./iam-operator-parity";

/**
 * One condition, and the rows it holds on. An Allow of it keeps exactly those rows and a Deny of it keeps the others,
 * in SQL as in memory. A database in `failClosedOn` cannot express it: the list answers 403 and no loaded row is
 * allowed. A database in `refusedOn` has no column of the family: the document does not validate.
 */
interface IOperatorCase {
	failClosedOn?: ReadonlyArray<TE2eIamOperatorDatabase>;
	field: string;
	operator: string;
	refusedOn?: ReadonlyArray<TE2eIamOperatorDatabase>;
	rows: string;
	value: unknown;
}

// A zone with daylight saving: a local hour repeats on 2024-11-03 and is skipped on 2024-03-10.
const TIME_ZONE: string = "America/New_York";
const TIME_ZONE_WINTER_OFFSET_MINUTES: number = 300;
const LIST_URL: string = "/iam-operator/items?limit=50&page=1";
const MARIADB_PASSWORD: string = "iam-operator";
const MYSQL_PORT: number = 3306;
const PRINCIPAL: IApiAuthorizationPrincipal = AuthorizationResolveDefaultPrincipal(E2E_IAM_OPERATOR_USER);

const MYSQL_FAMILY: ReadonlyArray<TE2eIamOperatorDatabase> = ["mariadb", "mysql"];
const NOT_POSTGRES: ReadonlyArray<TE2eIamOperatorDatabase> = ["mariadb", "mysql", "sqlite"];
const SQLITE: ReadonlyArray<TE2eIamOperatorDatabase> = ["sqlite"];
const EVERY_DATABASE: ReadonlyArray<TE2eIamOperatorDatabase> = ["mariadb", "mysql", "postgres", "sqlite"];

const OWNERS: ReadonlyArray<IE2eIamOperatorOwner> = [
	{ address: null, arn: "arn:aws:s3:::owner", id: "o-full", isActive: true, label: "ann", occurredAt: new Date("2024-06-01T00:00:00.000Z"), rank: 5 },
	{ address: null, arn: null, id: "o-null", isActive: null, label: null, occurredAt: null, rank: null },
];

const OWNER_FULL: IE2eIamOperatorOwner = { id: "o-full" };
const OWNER_NULL: IE2eIamOperatorOwner = { id: "o-null" };

const INT64_MAX: string = "9223372036854775807";
const INT64_MIN: string = "-9223372036854775808";
const TWO_TO_53: string = "9007199254740992";
const TWO_TO_53_PLUS_1: string = "9007199254740993";
const LONG_AMOUNT: string = "1234567890.1234567891";

// Rows `i` to `l` hold only a label and an ARN; `d` holds nothing.
const ITEM_ROWS: ReadonlyArray<IE2eIamOperatorItem> = [
	{ address: "10.0.0.1", amount: "1.5", arn: "arn:aws:s3:::bucket/a", big: INT64_MAX, day: "2024-01-01", id: "a", isActive: true, label: "ann", network: "10.0.0.0/8", occurredAt: new Date("2024-01-01T00:00:00.000Z"), owner: OWNER_FULL, rank: 1, ratio: 1.5, secondAt: new Date("2024-01-01T00:00:00.000Z"), wallAt: new Date("2024-01-01T00:00:00.000Z") },
	{ address: "2001:db8::1", amount: "-1.5", arn: "arn:aws:s3:eu:123:bucket/b", big: INT64_MIN, day: "2024-01-02", id: "b", isActive: false, label: "ANN", network: "2001:db8::/32", occurredAt: new Date("2024-01-01T02:00:00.123Z"), owner: OWNER_NULL, rank: 2, ratio: -1.5, wallAt: new Date("2024-01-01T02:00:00.123Z") },
	{ address: "::ffff:10.0.0.1", amount: "0.0000000001", arn: "arn:aws:iam::123:user/x:y", big: TWO_TO_53_PLUS_1, day: "2023-12-31", id: "c", isActive: true, label: "Ann", network: null, occurredAt: new Date("2023-12-31T23:59:59.999Z"), owner: null, rank: 0, ratio: 0.1, wallAt: new Date("2023-12-31T23:59:59.999Z") },
	{ address: null, amount: null, arn: null, big: null, day: null, id: "d", isActive: null, label: null, network: null, occurredAt: null, owner: null, rank: null, ratio: null, wallAt: null },
	{ address: "192.168.1.1/24", amount: "0", arn: "", big: "0", day: "2100-01-01", id: "e", isActive: false, label: "", network: "192.168.0.0/16", occurredAt: new Date("2100-01-01T00:00:00.000Z"), owner: OWNER_FULL, rank: -1, ratio: 0, wallAt: new Date("2030-01-01T00:00:00.000Z") },
	// 01:30 in New York, in the first of the two 01:30 hours of 2024-11-03.
	{ address: "10.255.255.255", amount: LONG_AMOUNT, arn: "arn:a.b:s3:::x", big: TWO_TO_53, day: "2024-11-03", id: "f", isActive: true, label: "ånn", network: null, occurredAt: new Date("2024-11-03T05:30:00.000Z"), owner: OWNER_NULL, rank: 2_147_483_647, ratio: 1e15, wallAt: new Date("2024-11-03T05:30:00.000Z") },
	// 03:30 in New York, right after the hour skipped on 2024-03-10.
	{ address: "11.0.0.1", amount: "-0.0000000001", arn: "arn:aaab:s3:::x", big: "-1", day: "2024-02-29", id: "g", isActive: false, label: "ÅNN", network: null, occurredAt: new Date("2024-03-10T07:30:00.000Z"), owner: null, rank: -2_147_483_648, ratio: -0.1, wallAt: new Date("2024-03-10T07:30:00.000Z") },
	{ address: null, amount: "3", arn: "arn:aws:s3:::a\nb", big: "5", day: null, id: "h", isActive: null, label: "a*n", network: null, occurredAt: null, owner: OWNER_FULL, rank: 3, ratio: 3, wallAt: null },
	{ arn: "arn:aws:s3:::*", id: "i", label: "x%y" },
	{ arn: "arn:aws:s3:::?", id: "j", label: "x_y" },
	{ arn: "ARN:aws:s3:::bucket/a", id: "k", label: "x?y" },
	{ arn: "arn:aws:s3:::é", id: "l", label: "😀nn" },
];

const ALL_ROWS: ReadonlyArray<string> = ITEM_ROWS.map((row: IE2eIamOperatorItem): string => row.id);

const STRING_CASES: ReadonlyArray<IOperatorCase> = [
	{ field: "label", operator: "StringNotEquals", rows: "b c d e f g h i j k l", value: "ann" },
	{ field: "label", operator: "StringEquals", rows: "", value: "'; DROP TABLE e2e_iam_operator_items; --" },
	{ failClosedOn: MYSQL_FAMILY, field: "label", operator: "StringEqualsIgnoreCase", rows: "a b c", value: "aNn" },
	{ failClosedOn: MYSQL_FAMILY, field: "label", operator: "StringEqualsIgnoreCase", rows: "f", value: "ånn" },
	{ failClosedOn: MYSQL_FAMILY, field: "label", operator: "StringEqualsIgnoreCase", rows: "g", value: "ÅNN" },
	{ failClosedOn: MYSQL_FAMILY, field: "label", operator: "StringEqualsIgnoreCase", rows: "h", value: "A*N" },
	{ failClosedOn: MYSQL_FAMILY, field: "label", operator: "StringEqualsIgnoreCase", rows: "i", value: "X%Y" },
	{ failClosedOn: MYSQL_FAMILY, field: "label", operator: "StringEqualsIgnoreCase", rows: "j", value: "X_Y" },
	{ failClosedOn: MYSQL_FAMILY, field: "label", operator: "StringEqualsIgnoreCase", rows: "k", value: "X?Y" },
	{ failClosedOn: MYSQL_FAMILY, field: "label", operator: "StringNotEqualsIgnoreCase", rows: "d e f g h i j k l", value: "ANN" },
	{ field: "label", operator: "StringLike", rows: "a h", value: "a*" },
	{ field: "label", operator: "StringLike", rows: "a c f l", value: "?nn" },
	{ field: "label", operator: "StringLike", rows: "b g", value: "?NN" },
	{ field: "label", operator: "StringLike", rows: "i j k", value: "x?y" },
	{ field: "label", operator: "StringLike", rows: "i j k", value: "x*y" },
	{ field: "label", operator: "StringLike", rows: "i", value: "x%y" },
	{ field: "label", operator: "StringLike", rows: "j", value: "x_y" },
	{ field: "label", operator: "StringLike", rows: "k", value: "x${?}y" },
	{ field: "label", operator: "StringLike", rows: "h", value: "a${*}n" },
	{ field: "label", operator: "StringLike", rows: "a b c d e f g h i j k l", value: "*" },
	{ field: "label", operator: "StringNotLike", rows: "b c d e f g i j k l", value: "a*" },
	{ field: "label", operator: "StringEquals", rows: "a", value: "${principal.attributes.name}" },
	{ field: "label", operator: "StringEquals", rows: "b", value: "${principal.attributes.missing, 'ANN'}" },
	{ field: "label", operator: "StringEquals", rows: "i", value: "x${principal.attributes.missing, '%'}y" },
	{ field: "label", operator: "StringLike", rows: "a", value: "${principal.attributes.name}" },
	{ field: "label", operator: "StringLike", rows: "a h", value: "a*${principal.attributes.missing, 'n'}" },
	{ failClosedOn: MYSQL_FAMILY, field: "label", operator: "StringEqualsIgnoreCase", rows: "a b c", value: "${principal.attributes.name}" },
	// "" and NULL compare alike in memory and not under an SQL equality, so a scope does not compare the empty value; a glob does.
	{ failClosedOn: EVERY_DATABASE, field: "label", operator: "StringEquals", rows: "", value: "" },
	{ field: "label", operator: "StringLike", rows: "d e", value: "" },
	{ failClosedOn: EVERY_DATABASE, field: "label", operator: "StringEqualsIgnoreCase", rows: "", value: "" },
	{ field: "arn", operator: "ArnEquals", refusedOn: EVERY_DATABASE, rows: "", value: "" },
];

const NUMERIC_CASES: ReadonlyArray<IOperatorCase> = [
	{ field: "rank", operator: "NumericEquals", rows: "a", value: 1 },
	{ field: "rank", operator: "NumericEquals", rows: "a", value: "1" },
	{ field: "rank", operator: "NumericEquals", rows: "a", value: "${principal.attributes.rank}" },
	{ field: "rank", operator: "NumericEquals", rows: "", value: "1.5" },
	{ field: "rank", operator: "NumericNotEquals", rows: "b c d e f g h i j k l", value: 1 },
	{ field: "rank", operator: "NumericNotEquals", rows: "a b c d e f g h i j k l", value: "1.5" },
	{ field: "rank", operator: "NumericGreaterThan", rows: "a b f h", value: "0.5" },
	{ field: "rank", operator: "NumericLessThan", rows: "e g", value: "-0.5" },
	{ field: "rank", operator: "NumericLessThanEquals", rows: "a b c e f g h", value: "2147483647" },
	{ field: "rank", operator: "NumericGreaterThanEquals", rows: "f", value: "2147483647" },
	{ field: "rank", operator: "NumericGreaterThan", rows: "", value: "2147483647" },
	{ field: "rank", operator: "NumericLessThanEquals", rows: "g", value: "-2147483648" },
	{ failClosedOn: SQLITE, field: "rank", operator: "NumericGreaterThan", rows: "", value: "99999999999999999999" },
	{ failClosedOn: SQLITE, field: "rank", operator: "NumericLessThan", rows: "a b c e f g h", value: "99999999999999999999" },
	{ failClosedOn: SQLITE, field: "big", operator: "NumericEquals", rows: "a", value: INT64_MAX },
	{ failClosedOn: SQLITE, field: "big", operator: "NumericLessThanEquals", rows: "b", value: INT64_MIN },
	{ failClosedOn: SQLITE, field: "big", operator: "NumericLessThan", rows: "", value: INT64_MIN },
	{ failClosedOn: SQLITE, field: "big", operator: "NumericEquals", rows: "c", value: TWO_TO_53_PLUS_1 },
	{ failClosedOn: SQLITE, field: "big", operator: "NumericEquals", rows: "f", value: TWO_TO_53 },
	{ failClosedOn: SQLITE, field: "big", operator: "NumericGreaterThan", rows: "a c", value: TWO_TO_53 },
	{ failClosedOn: SQLITE, field: "big", operator: "NumericGreaterThan", rows: "", value: "9223372036854775808" },
	{ field: "big", operator: "NumericLessThan", rows: "b e g h", value: 10 },
	{ field: "amount", operator: "NumericEquals", rows: "a", value: "1.50" },
	{ field: "amount", operator: "NumericGreaterThan", rows: "a c f h", value: "0" },
	{ field: "amount", operator: "NumericLessThan", rows: "b g", value: "0" },
	{ field: "amount", operator: "NumericEquals", rows: "c", value: "0.0000000001" },
	{ field: "amount", operator: "NumericGreaterThan", rows: "a c e f h", value: "-0.0000000001" },
	{ failClosedOn: SQLITE, field: "amount", operator: "NumericEquals", rows: "f", value: LONG_AMOUNT },
	{ failClosedOn: SQLITE, field: "amount", operator: "NumericEquals", rows: "", value: "1234567890.123456789" },
	{ field: "ratio", operator: "NumericEquals", rows: "c", value: "0.1" },
	{ field: "ratio", operator: "NumericEquals", rows: "a", value: 1.5 },
	{ field: "ratio", operator: "NumericEquals", rows: "f", value: "1000000000000000" },
	{ field: "ratio", operator: "NumericGreaterThan", rows: "a c e f h", value: "-0.1" },
	{ failClosedOn: EVERY_DATABASE, field: "ratio", operator: "NumericEquals", rows: "", value: "0.1234567890123456" },
];

const DATE_CASES: ReadonlyArray<IOperatorCase> = [
	{ field: "occurredAt", operator: "DateEquals", rows: "a", value: "2024-01-01T00:00:00Z" },
	{ field: "occurredAt", operator: "DateEquals", rows: "a", value: "2023-12-31T19:00:00-05:00" },
	{ field: "occurredAt", operator: "DateEquals", rows: "b", value: "2024-01-01T04:00:00.123+02:00" },
	{ field: "occurredAt", operator: "DateNotEquals", rows: "b c d e f g h i j k l", value: "2024-01-01T00:00:00Z" },
	{ field: "occurredAt", operator: "DateGreaterThan", rows: "b e f g", value: "2024-01-01T00:00:00Z" },
	{ field: "occurredAt", operator: "DateGreaterThanEquals", rows: "a b e f g", value: "2024-01-01T00:00:00Z" },
	{ field: "occurredAt", operator: "DateLessThan", rows: "c", value: "2024-01-01T00:00:00Z" },
	{ field: "occurredAt", operator: "DateLessThan", rows: "c", value: "${principal.attributes.since}" },
	{ field: "occurredAt", operator: "DateLessThanEquals", rows: "a b c", value: "2024-01-01T02:00:00.123Z" },
	{ field: "occurredAt", operator: "DateGreaterThan", refusedOn: EVERY_DATABASE, rows: "", value: "2024-01-01T00:00:00.0005Z" },
	{ field: "occurredAt", operator: "DateEquals", refusedOn: EVERY_DATABASE, rows: "", value: "2024-01-01T00:00:00.0005Z" },
	// The two 01:30 hours of 2024-11-03 are one wall-clock text on a MySQL or MariaDB datetime column, which reads back as the
	// first of them: that instant compares exactly, and the second one, which no row reads back as, fails closed.
	{ field: "occurredAt", operator: "DateEquals", rows: "f", value: "2024-11-03T05:30:00Z" },
	{ failClosedOn: MYSQL_FAMILY, field: "occurredAt", operator: "DateEquals", rows: "", value: "2024-11-03T06:30:00Z" },
	// A bare MySQL or MariaDB datetime holds whole seconds: a literal finer than the column cannot be compared with it.
	{ field: "secondAt", operator: "DateEquals", rows: "a", value: "2024-01-01T00:00:00Z" },
	{ failClosedOn: MYSQL_FAMILY, field: "secondAt", operator: "DateEquals", rows: "", value: "2024-01-01T00:00:00.500Z" },
	{ field: "occurredAt", operator: "DateEquals", rows: "g", value: "2024-03-10T07:30:00Z" },
	{ field: "wallAt", operator: "DateGreaterThan", rows: "b e f g", value: "2024-01-01T00:00:00Z" },
	{ field: "wallAt", operator: "DateEquals", rows: "b", value: "2024-01-01T02:00:00.123Z" },
	{ field: "wallAt", operator: "DateEquals", rows: "f", value: "2024-11-03T05:30:00Z" },
	{ failClosedOn: ["mariadb", "mysql", "postgres"], field: "wallAt", operator: "DateEquals", rows: "", value: "2024-11-03T06:30:00Z" },
	{ field: "day", operator: "DateEquals", rows: "g", value: "2024-02-29" },
	{ field: "day", operator: "DateNotEquals", rows: "b c d e f g h i j k l", value: "2024-01-01" },
	{ field: "day", operator: "DateGreaterThan", rows: "b e f g", value: "2024-01-01" },
	{ field: "day", operator: "DateLessThan", rows: "c", value: "2024-01-01" },
	{ field: "day", operator: "DateLessThanEquals", rows: "a c", value: "2024-01-01" },
	{ field: "day", operator: "DateEquals", refusedOn: EVERY_DATABASE, rows: "", value: "2024-01-01T00:00:00Z" },
	{ field: "occurredAt", operator: "DateEquals", refusedOn: EVERY_DATABASE, rows: "", value: "2024-01-01" },
];

const BOOL_AND_NULL_CASES: ReadonlyArray<IOperatorCase> = [
	{ field: "isActive", operator: "Bool", rows: "a c f", value: true },
	{ field: "isActive", operator: "Bool", rows: "a c f", value: "true" },
	{ field: "isActive", operator: "Bool", rows: "b e g", value: false },
	{ field: "isActive", operator: "Bool", rows: "a c f", value: "${principal.attributes.isEnabled}" },
	{ field: "label", operator: "Bool", refusedOn: EVERY_DATABASE, rows: "", value: true },
	{ field: "label", operator: "Null", rows: "d", value: true },
	{ field: "label", operator: "Null", rows: "a b c e f g h i j k l", value: false },
	{ field: "rank", operator: "Null", rows: "d i j k l", value: "true" },
	{ field: "ownerRank", operator: "Null", rows: "b c d f g i j k l", value: true },
	{ field: "ownerLabel", operator: "Null", rows: "a e h", value: false },
];

// A missing relation makes the key absent; a NULL column of a present relation still takes the base operator.
const IF_EXISTS_CASES: ReadonlyArray<IOperatorCase> = [
	{ field: "ownerLabel", operator: "StringEqualsIfExists", rows: "a c d e g h i j k l", value: "ann" },
	{ field: "ownerLabel", operator: "StringNotEqualsIfExists", rows: "b c d f g i j k l", value: "ann" },
	{ failClosedOn: MYSQL_FAMILY, field: "ownerLabel", operator: "StringEqualsIgnoreCaseIfExists", rows: "a c d e g h i j k l", value: "ANN" },
	{ failClosedOn: MYSQL_FAMILY, field: "ownerLabel", operator: "StringNotEqualsIgnoreCaseIfExists", rows: "b c d f g i j k l", value: "ANN" },
	{ field: "ownerLabel", operator: "StringLikeIfExists", rows: "a c d e g h i j k l", value: "a*" },
	{ field: "ownerLabel", operator: "StringNotLikeIfExists", rows: "b c d f g i j k l", value: "a*" },
	{ field: "ownerRank", operator: "NumericEqualsIfExists", rows: "a c d e g h i j k l", value: 5 },
	{ field: "ownerRank", operator: "NumericNotEqualsIfExists", rows: "b c d f g i j k l", value: 5 },
	{ field: "ownerRank", operator: "NumericGreaterThanIfExists", rows: "c d g i j k l", value: 5 },
	{ field: "ownerRank", operator: "NumericGreaterThanEqualsIfExists", rows: "a c d e g h i j k l", value: 5 },
	{ field: "ownerRank", operator: "NumericLessThanIfExists", rows: "c d g i j k l", value: 5 },
	{ field: "ownerRank", operator: "NumericLessThanEqualsIfExists", rows: "a c d e g h i j k l", value: 5 },
	{ field: "ownerAt", operator: "DateEqualsIfExists", rows: "a c d e g h i j k l", value: "2024-06-01T00:00:00Z" },
	{ field: "ownerAt", operator: "DateNotEqualsIfExists", rows: "b c d f g i j k l", value: "2024-06-01T00:00:00Z" },
	{ field: "ownerAt", operator: "DateGreaterThanIfExists", rows: "c d g i j k l", value: "2024-06-01T00:00:00Z" },
	{ field: "ownerAt", operator: "DateGreaterThanEqualsIfExists", rows: "a c d e g h i j k l", value: "2024-06-01T00:00:00Z" },
	{ field: "ownerAt", operator: "DateLessThanIfExists", rows: "c d g i j k l", value: "2024-06-01T00:00:00Z" },
	{ field: "ownerAt", operator: "DateLessThanEqualsIfExists", rows: "a c d e g h i j k l", value: "2024-06-01T00:00:00Z" },
	{ field: "ownerActive", operator: "BoolIfExists", rows: "a c d e g h i j k l", value: true },
	{ field: "ownerActive", operator: "BoolIfExists", rows: "c d g i j k l", value: false },
	{ failClosedOn: NOT_POSTGRES, field: "ownerArn", operator: "ArnEqualsIfExists", rows: "a c d e g h i j k l", value: "arn:aws:s3:::owner" },
	{ failClosedOn: NOT_POSTGRES, field: "ownerArn", operator: "ArnNotEqualsIfExists", rows: "b c d f g i j k l", value: "arn:aws:s3:::owner" },
	{ failClosedOn: NOT_POSTGRES, field: "ownerArn", operator: "ArnLikeIfExists", rows: "a c d e g h i j k l", value: "arn:aws:s3:::*" },
	{ failClosedOn: NOT_POSTGRES, field: "ownerArn", operator: "ArnNotLikeIfExists", rows: "b c d f g i j k l", value: "arn:aws:s3:::*" },
	{ field: "ownerAddress", operator: "IpAddressIfExists", refusedOn: NOT_POSTGRES, rows: "c d g i j k l", value: "192.168.0.0/16" },
	{ field: "ownerAddress", operator: "NotIpAddressIfExists", refusedOn: NOT_POSTGRES, rows: "a b c d e f g h i j k l", value: "192.168.0.0/16" },
	// A NULL column of the row itself takes the base operator, so IfExists changes nothing here.
	{ field: "rank", operator: "NumericEqualsIfExists", rows: "a", value: 1 },
	{ field: "isActive", operator: "BoolIfExists", rows: "a c f", value: true },
];

const IP_CASES: ReadonlyArray<IOperatorCase> = [
	{ field: "address", operator: "IpAddress", refusedOn: NOT_POSTGRES, rows: "a f", value: "10.0.0.0/8" },
	{ field: "address", operator: "IpAddress", refusedOn: NOT_POSTGRES, rows: "a f", value: "${principal.attributes.network}" },
	{ field: "address", operator: "IpAddress", refusedOn: NOT_POSTGRES, rows: "a", value: "10.0.0.1" },
	{ field: "address", operator: "IpAddress", refusedOn: NOT_POSTGRES, rows: "b", value: "2001:db8::/32" },
	{ field: "address", operator: "IpAddress", refusedOn: NOT_POSTGRES, rows: "c", value: "::ffff:10.0.0.0/104" },
	{ field: "address", operator: "IpAddress", refusedOn: NOT_POSTGRES, rows: "e", value: "192.168.0.0/16" },
	{ field: "address", operator: "IpAddress", refusedOn: NOT_POSTGRES, rows: "e", value: "192.168.1.0/24" },
	{ field: "address", operator: "IpAddress", refusedOn: NOT_POSTGRES, rows: "", value: "192.168.1.1/32" },
	{ field: "address", operator: "IpAddress", refusedOn: NOT_POSTGRES, rows: "a e f g", value: "0.0.0.0/0" },
	{ field: "address", operator: "IpAddress", refusedOn: NOT_POSTGRES, rows: "b c", value: "::/0" },
	{ field: "address", operator: "NotIpAddress", refusedOn: NOT_POSTGRES, rows: "b c d e g h i j k l", value: "10.0.0.0/8" },
	{ field: "network", operator: "IpAddress", refusedOn: NOT_POSTGRES, rows: "a", value: "10.0.0.0/8" },
	{ field: "network", operator: "IpAddress", refusedOn: NOT_POSTGRES, rows: "", value: "10.1.0.0/16" },
	{ field: "network", operator: "IpAddress", refusedOn: NOT_POSTGRES, rows: "a e", value: "0.0.0.0/0" },
	{ field: "network", operator: "IpAddress", refusedOn: NOT_POSTGRES, rows: "b", value: "::/0" },
];

const ARN_CASES: ReadonlyArray<IOperatorCase> = [
	{ failClosedOn: NOT_POSTGRES, field: "arn", operator: "ArnEquals", rows: "a", value: "arn:aws:s3:::bucket/a" },
	{ failClosedOn: NOT_POSTGRES, field: "arn", operator: "ArnNotEquals", rows: "b c d e f g h i j k l", value: "arn:aws:s3:::bucket/a" },
	{ failClosedOn: NOT_POSTGRES, field: "arn", operator: "ArnLike", rows: "a h i j l", value: "arn:aws:s3:::*" },
	{ failClosedOn: NOT_POSTGRES, field: "arn", operator: "ArnLike", rows: "a b h i j l", value: "arn:aws:s3:*:*:*" },
	{ failClosedOn: NOT_POSTGRES, field: "arn", operator: "ArnLike", rows: "f g", value: "arn:*:s3:::x" },
	{ failClosedOn: NOT_POSTGRES, field: "arn", operator: "ArnLike", rows: "f", value: "arn:a.b:s3:::x" },
	{ failClosedOn: NOT_POSTGRES, field: "arn", operator: "ArnLike", rows: "f", value: "arn:a?b:s3:::x" },
	{ failClosedOn: NOT_POSTGRES, field: "arn", operator: "ArnLike", rows: "", value: "arn:a+b:s3:::x" },
	{ failClosedOn: NOT_POSTGRES, field: "arn", operator: "ArnLike", rows: "", value: "arn:aws:iam::123:*" },
	{ failClosedOn: NOT_POSTGRES, field: "arn", operator: "ArnLike", rows: "c", value: "arn:aws:iam::123:*:*" },
	{ failClosedOn: NOT_POSTGRES, field: "arn", operator: "ArnLike", rows: "a b f g h i j k l", value: "*:*:*:*:*:*" },
	{ failClosedOn: NOT_POSTGRES, field: "arn", operator: "ArnLike", rows: "i", value: "arn:aws:s3:::${*}" },
	{ failClosedOn: NOT_POSTGRES, field: "arn", operator: "ArnLike", rows: "j", value: "arn:aws:s3:::${?}" },
	{ failClosedOn: NOT_POSTGRES, field: "arn", operator: "ArnLike", rows: "i j l", value: "arn:aws:s3:::?" },
	{ failClosedOn: NOT_POSTGRES, field: "arn", operator: "ArnLike", rows: "a h i j l", value: "arn:aws:${principal.attributes.arnService}:::*" },
	{ failClosedOn: NOT_POSTGRES, field: "arn", operator: "ArnLike", rows: "", value: "arn:aws:s3:::'; DROP TABLE x; --" },
	{ failClosedOn: NOT_POSTGRES, field: "arn", operator: "ArnNotLike", rows: "b c d e f g k", value: "arn:aws:s3:::*" },
];

const FAMILIES: ReadonlyArray<[string, ReadonlyArray<IOperatorCase>]> = [
	["String", STRING_CASES],
	["Numeric", NUMERIC_CASES],
	["Date", DATE_CASES],
	["Bool and Null", BOOL_AND_NULL_CASES],
	["IfExists", IF_EXISTS_CASES],
	["IP address", IP_CASES],
	["ARN", ARN_CASES],
];

const startMariaDb = async (): Promise<StartedTestContainer> =>
	await new GenericContainer("mariadb:11")
		.withEnvironment({ MARIADB_DATABASE: "iam", MARIADB_ROOT_PASSWORD: MARIADB_PASSWORD })
		.withExposedPorts(MYSQL_PORT)
		// The image first runs a temporary server on port 0 to initialize the database.
		.withWaitStrategy(Wait.forLogMessage(/port: 3306\s/u))
		.withStartupTimeout(240_000)
		.start();

const previousTimeZone: string | undefined = process.env.TZ;

describe.each<{ database: TE2eIamOperatorDatabase; databaseName: string }>([
	{ database: "sqlite", databaseName: "SQLite" },
	{ database: "postgres", databaseName: "PostgreSQL 17" },
	{ database: "mysql", databaseName: "MySQL 8.4" },
	{ database: "mariadb", databaseName: "MariaDB 11" },
])("IAM operator families match the in-memory evaluator on $databaseName (E2E)", ({ database }: { database: TE2eIamOperatorDatabase; databaseName: string }) => {
	let app: INestApplication | undefined;
	let fastify: { inject: (options: { method: string; remoteAddress?: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };
	let fixture: IE2eIamOperatorFixture;
	let mariaDbContainer: StartedTestContainer | undefined;
	let mysqlContainer: StartedMySqlContainer | undefined;
	let statements: Array<IApiPolicyStatement> = [];
	let postgresContainer: StartedPostgreSqlContainer | undefined;
	let simulator: ApiAuthorizationSimulator;

	// Validation reads every controller of a namespace in the process, so each database has its own.
	const namespace: string = `opr${database}:item`;

	const statement = (effect: EApiPolicyEffect, options: { condition?: Record<string, Record<string, unknown>>; resource?: Array<string> } = {}): IApiPolicyStatement => ({
		Action: [`${namespace}:*`],
		...(options.condition ? { Condition: options.condition } : {}),
		Effect: effect,
		Resource: options.resource ?? ["*"],
	});

	const ALLOW_ALL: IApiPolicyStatement = statement(EApiPolicyEffect.ALLOW);

	const repository = (): Repository<IE2eIamOperatorItem> => (app!.get(fixture.service) as { repository: Repository<IE2eIamOperatorItem> }).repository;

	const connection = (entities: Array<new () => unknown>): TypeOrmModuleOptions => {
		if (mariaDbContainer) {
			return { database: "iam", dropSchema: true, entities, host: mariaDbContainer.getHost(), password: MARIADB_PASSWORD, port: mariaDbContainer.getMappedPort(MYSQL_PORT), synchronize: true, type: "mysql", username: "root" };
		}

		if (mysqlContainer) {
			return { database: mysqlContainer.getDatabase(), dropSchema: true, entities, host: mysqlContainer.getHost(), password: mysqlContainer.getUserPassword(), port: mysqlContainer.getPort(), synchronize: true, type: "mysql", username: mysqlContainer.getUsername() };
		}

		if (postgresContainer) {
			return { dropSchema: true, entities, synchronize: true, type: "postgres", url: postgresContainer.getConnectionUri() };
		}

		return { database: ":memory:", dropSchema: true, entities, synchronize: true, type: "better-sqlite3" };
	};

	// The rows the in-memory evaluator allows once each resource is loaded with its relations.
	const allowedInMemory = async (requestMetadata: Record<string, unknown> = {}): Promise<Array<string>> => {
		const allowed: Array<string> = [];

		for (const row of await repository().find({ relations: { owner: true } as never })) {
			const decision = await simulator.evaluate({ action: EApiRouteType.GET, authorization: fixture.authorization as never, entity: fixture.item as never, principal: PRINCIPAL, requestMetadata: requestMetadata as never, resource: row as never, routeType: EApiRouteType.GET });

			if (decision.effect === EApiPolicyEffect.ALLOW) {
				allowed.push(row.id);
			}
		}

		return allowed.sort();
	};

	const list = async (remoteAddress?: string): Promise<{ ids: Array<string>; statusCode: number }> => {
		const response = await fastify.inject({ method: "GET", ...(remoteAddress === undefined ? {} : { remoteAddress }), url: LIST_URL });

		return { ids: response.statusCode === HttpStatus.OK ? (response.json() as { items: Array<{ id: string }> }).items.map((item: { id: string }): string => item.id).sort() : [], statusCode: response.statusCode };
	};

	beforeAll(async () => {
		process.env.TZ = TIME_ZONE;
		expect(new Date("2024-01-15T00:00:00Z").getTimezoneOffset()).toBe(TIME_ZONE_WINTER_OFFSET_MINUTES);

		if (database === "postgres") {
			postgresContainer = await new PostgreSqlContainer("postgres:17-alpine").start();
		}

		if (database === "mysql") {
			mysqlContainer = await new MySqlContainer("mysql:8.4").start();
		}

		if (database === "mariadb") {
			mariaDbContainer = await startMariaDb();
		}

		fixture = createE2eIamOperatorFixture(database);

		const entities: Array<new () => unknown> = [fixture.owner, fixture.item];
		const moduleReference = await Test.createTestingModule({
			controllers: [fixture.controller],
			imports: [
				TypeOrmModule.forRoot(connection(entities)),
				TypeOrmModule.forFeature(entities),
				ApiAuthorizationModule.forRoot({
					iam: {
						attachmentSources: [{ getAttachments: async () => await Promise.resolve({ attachments: [{ policyId: "opr-policy", principalId: PRINCIPAL.id, principalType: EApiAuthorizationPrincipalType.USER }], boundaries: [] }) }],
						documentSources: [
							{
								getDocumentsByIds: async (ids: ReadonlyArray<string>): Promise<ReadonlyArray<IApiPolicyDocumentRecord>> => await Promise.resolve(ids.includes("opr-policy") ? [{ document: { Statement: statements, Version: "2012-10-17" }, id: "opr-policy", namespace, sourceType: EApiPolicySourceType.DATABASE, version: "1" }] : []),
							},
						],
					},
					principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) },
				} as never),
			],
			providers: [fixture.service, E2eIamOperatorGuard],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		fastify = app.getHttpAdapter().getInstance();
		simulator = app.get(ApiAuthorizationSimulator);

		await repository()
			.manager.getRepository(fixture.owner)
			.save(OWNERS as never);
		await repository().save(ITEM_ROWS as never);
	}, 300_000);

	afterAll(async () => {
		await app?.close();
		await postgresContainer?.stop();
		await mysqlContainer?.stop();
		await mariaDbContainer?.stop();

		if (previousTimeZone === undefined) {
			delete process.env.TZ;
		} else {
			process.env.TZ = previousTimeZone;
		}
	});

	describe.each(FAMILIES)("%s", (_family: string, cases: ReadonlyArray<IOperatorCase>) => {
		const name = (operatorCase: IOperatorCase): string => `${operatorCase.operator} ${operatorCase.field} ${JSON.stringify(operatorCase.value)}`;

		it.each(cases.map((operatorCase: IOperatorCase): [string, IOperatorCase] => [name(operatorCase), operatorCase]))("%s", async (_name: string, operatorCase: IOperatorCase) => {
			const condition: Record<string, Record<string, unknown>> = { [operatorCase.operator]: { [`resource.${operatorCase.field}`]: operatorCase.value } };
			const holding: Array<string> = operatorCase.rows === "" ? [] : operatorCase.rows.split(" ");
			const kept: Array<string> = ALL_ROWS.filter((id: string): boolean => !holding.includes(id));

			for (const [policy, rows] of [
				[[statement(EApiPolicyEffect.ALLOW, { condition })], holding],
				[[ALLOW_ALL, statement(EApiPolicyEffect.DENY, { condition })], kept],
			] as Array<[Array<IApiPolicyStatement>, Array<string>]>) {
				statements = policy;

				if (operatorCase.refusedOn?.includes(database)) {
					expect((await list()).statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
					await expect(allowedInMemory()).rejects.toThrow();

					continue;
				}

				if (operatorCase.failClosedOn?.includes(database)) {
					expect(await list()).toEqual({ ids: [], statusCode: HttpStatus.FORBIDDEN });
					expect(await allowedInMemory()).toEqual([]);

					continue;
				}

				expect(await allowedInMemory()).toEqual(rows);
				expect(await list()).toEqual({ ids: rows, statusCode: HttpStatus.OK });
			}
		});
	});

	describe("a value that holds no text or no row", () => {
		it.each([
			["StringEquals", "label", "${principal.attributes.missing}"],
			["StringLike", "label", "x${principal.attributes.missing}"],
			["NumericEquals", "rank", "${principal.attributes.missing}"],
			["DateEquals", "occurredAt", "${principal.attributes.missing}"],
			["Bool", "isActive", "${principal.attributes.missing}"],
		])("%s %s with the unresolved %s: an Allow allows nothing and a Deny denies the request", async (operator: string, field: string, value: string) => {
			const condition: Record<string, Record<string, unknown>> = { [operator]: { [`resource.${field}`]: value } };

			statements = [statement(EApiPolicyEffect.ALLOW, { condition })];
			expect((await list()).ids).toEqual([]);
			expect(await allowedInMemory()).toEqual([]);

			statements = [ALLOW_ALL, statement(EApiPolicyEffect.DENY, { condition })];
			expect(await list()).toEqual({ ids: [], statusCode: HttpStatus.FORBIDDEN });
			expect(await allowedInMemory()).toEqual([]);
		});
	});

	describe("variables in Resource", () => {
		// An Allow pattern allows a list only when it covers every row, with or without a variable: it reads one row alone.
		it.each([
			[`${namespace}/\${principal.attributes.rowId}`, ["a"]],
			[`${namespace}/\${principal.attributes.missing, 'b'}`, ["b"]],
		])("an Allow on %s allows the row it names, and not the list", async (resource: string, rows: Array<string>) => {
			statements = [statement(EApiPolicyEffect.ALLOW, { resource: [resource] })];

			expect(await allowedInMemory()).toEqual(rows);
			expect(await list()).toEqual({ ids: [], statusCode: HttpStatus.FORBIDDEN });
		});

		it("a Deny on a resolved variable excludes the row it names", async () => {
			statements = [ALLOW_ALL, statement(EApiPolicyEffect.DENY, { resource: [`${namespace}/\${principal.attributes.rowId}`] })];

			const rows: Array<string> = ALL_ROWS.filter((id: string): boolean => id !== "a");

			expect(await allowedInMemory()).toEqual(rows);
			expect(await list()).toEqual({ ids: rows, statusCode: HttpStatus.OK });
		});

		it("an Allow on an unresolved variable allows nothing", async () => {
			statements = [statement(EApiPolicyEffect.ALLOW, { resource: [`${namespace}/\${principal.attributes.missing}`] })];

			expect(await allowedInMemory()).toEqual([]);
			expect(await list()).toEqual({ ids: [], statusCode: HttpStatus.FORBIDDEN });
		});

		it("a Deny on an unresolved variable denies the request", async () => {
			statements = [ALLOW_ALL, statement(EApiPolicyEffect.DENY, { resource: [`${namespace}/\${principal.attributes.missing}`] })];

			expect(await allowedInMemory()).toEqual([]);
			expect(await list()).toEqual({ ids: [], statusCode: HttpStatus.FORBIDDEN });
		});
	});

	describe("request.time", () => {
		it("compares the time of the request as a key", async () => {
			statements = [statement(EApiPolicyEffect.ALLOW, { condition: { DateLessThan: { "request.time": "2999-01-01T00:00:00Z" } } })];
			expect(await allowedInMemory()).toEqual(ALL_ROWS);
			expect(await list()).toEqual({ ids: ALL_ROWS, statusCode: HttpStatus.OK });

			statements = [statement(EApiPolicyEffect.ALLOW, { condition: { DateGreaterThan: { "request.time": "2999-01-01T00:00:00Z" } } })];
			expect(await allowedInMemory()).toEqual([]);
			expect(await list()).toEqual({ ids: [], statusCode: HttpStatus.FORBIDDEN });
		});

		it("compares a date column with the time of the request as a value", async () => {
			const condition: Record<string, Record<string, unknown>> = { DateLessThan: { "resource.occurredAt": "${request.time}" } };

			statements = [statement(EApiPolicyEffect.ALLOW, { condition })];
			expect(await allowedInMemory()).toEqual(["a", "b", "c", "f", "g"]);
			expect(await list()).toEqual({ ids: ["a", "b", "c", "f", "g"], statusCode: HttpStatus.OK });

			statements = [ALLOW_ALL, statement(EApiPolicyEffect.DENY, { condition })];
			expect(await allowedInMemory()).toEqual(["d", "e", "h", "i", "j", "k", "l"]);
			expect(await list()).toEqual({ ids: ["d", "e", "h", "i", "j", "k", "l"], statusCode: HttpStatus.OK });
		});

		it.runIf(database === "mariadb" || database === "mysql")("fails closed on a whole-second datetime column, which is coarser than the time of a request", async () => {
			statements = [statement(EApiPolicyEffect.ALLOW, { condition: { DateLessThan: { "resource.secondAt": "${request.time}" } } })];

			expect(await allowedInMemory()).toEqual([]);
			expect(await list()).toEqual({ ids: [], statusCode: HttpStatus.FORBIDDEN });
		});

		it("fails closed on a calendar date column, which an instant does not compare with", async () => {
			const condition: Record<string, Record<string, unknown>> = { DateLessThan: { "resource.day": "${request.time}" } };

			statements = [statement(EApiPolicyEffect.ALLOW, { condition })];
			expect(await allowedInMemory()).toEqual([]);
			expect(await list()).toEqual({ ids: [], statusCode: HttpStatus.FORBIDDEN });

			statements = [ALLOW_ALL, statement(EApiPolicyEffect.DENY, { condition })];
			expect(await allowedInMemory()).toEqual([]);
			expect(await list()).toEqual({ ids: [], statusCode: HttpStatus.FORBIDDEN });
		});
	});

	describe("request.sourceIp", () => {
		it.each([
			["IpAddress", "request.sourceIp", "127.0.0.1", "127.0.0.0/8", true],
			["IpAddress", "request.sourceIp", "127.0.0.1", "10.0.0.0/8", false],
			["NotIpAddress", "request.sourceIp", "127.0.0.1", "10.0.0.0/8", true],
			["NotIpAddress", "request.sourceIp", "127.0.0.1", "127.0.0.1", false],
			["IpAddress", "request.ip", "127.0.0.1", "127.0.0.1", true],
			["IpAddress", "request.sourceIp", "2001:db8::1", "2001:db8::/32", true],
			["IpAddress", "request.sourceIp", "2001:db8::1", "10.0.0.0/8", false],
		])("%s %s from %s against %s", async (operator: string, key: string, remoteAddress: string, value: string, isAllowed: boolean) => {
			statements = [statement(EApiPolicyEffect.ALLOW, { condition: { [operator]: { [key]: value } } })];

			expect(await allowedInMemory({ ip: remoteAddress })).toEqual(isAllowed ? ALL_ROWS : []);
			expect(await list(remoteAddress)).toEqual({ ids: isAllowed ? ALL_ROWS : [], statusCode: isAllowed ? HttpStatus.OK : HttpStatus.FORBIDDEN });
		});
	});

	// A column finer than a millisecond: JavaScript reads the row floored to the millisecond, and SQL must compare it so too.
	it.skipIf(database === "sqlite")("compares a microsecond row as the millisecond memory reads it", async () => {
		const value: string = database === "postgres" ? "2024-05-05 00:00:00.123456+00" : "2024-05-04 20:00:00.123456";

		await repository().save({ id: "m", label: "m" } as never);
		await repository().query(database === "postgres" ? `UPDATE e2e_iam_operator_items SET "occurredAt" = '${value}' WHERE id = 'm'` : `UPDATE e2e_iam_operator_items SET occurredAt = '${value}' WHERE id = 'm'`);

		try {
			for (const [operator, literal, rows] of [
				["DateEquals", "2024-05-05T00:00:00.123Z", ["m"]],
				["DateGreaterThan", "2024-05-05T00:00:00.123Z", ["e", "f"]],
				["DateLessThanEquals", "2024-05-05T00:00:00.123Z", ["a", "b", "c", "g", "m"]],
			] as Array<[string, string, Array<string>]>) {
				statements = [statement(EApiPolicyEffect.ALLOW, { condition: { [operator]: { "resource.occurredAt": literal } } })];

				const memory: Array<string> = await allowedInMemory();

				expect(memory).toEqual(rows);
				expect(await list()).toEqual({ ids: memory, statusCode: HttpStatus.OK });
			}
		} finally {
			await repository().delete("m");
		}
	});
});
