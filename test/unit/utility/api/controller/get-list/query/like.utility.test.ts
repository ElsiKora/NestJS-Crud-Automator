import type { FindOperator } from "typeorm";

import { ApiControllerGetListQueryLike } from "@utility/api/controller/get-list/query/like.utility";
import { describe, expect, it } from "vitest";

const CONTAINS: { hasLeadingWildcard: boolean; hasTrailingWildcard: boolean; isCaseInsensitive: boolean } = { hasLeadingWildcard: true, hasTrailingWildcard: true, isCaseInsensitive: false };
const EXACT: { hasLeadingWildcard: boolean; hasTrailingWildcard: boolean; isCaseInsensitive: boolean } = { hasLeadingWildcard: false, hasTrailingWildcard: false, isCaseInsensitive: true };

describe("ApiControllerGetListQueryLike", () => {
	it.each(["postgres", "mysql", "mariadb"])("escapes %%, _ and a backslash with a backslash in an ordinary operator on %s", (driverType: string) => {
		const contains: FindOperator<string> = ApiControllerGetListQueryLike(String.raw`a\%_b`, CONTAINS, driverType);
		const exact: FindOperator<string> = ApiControllerGetListQueryLike("%", EXACT, driverType);

		expect(contains.type).toBe("like");
		expect(contains.value).toBe(String.raw`%a\\\%\_b%`);
		expect(exact.type).toBe("ilike");
		expect(exact.value).toBe(String.raw`\%`);
	});

	it.each(["better-sqlite3", "sqljs", undefined])("names an escape character in an ESCAPE clause and binds the text on %s", (driverType: string | undefined) => {
		const contains: FindOperator<string> = ApiControllerGetListQueryLike("a!%_\\b", CONTAINS, driverType);
		const exact: FindOperator<string> = ApiControllerGetListQueryLike("a_b", EXACT, driverType);
		const containsParameters: Record<string, unknown> = contains.objectLiteralParameters ?? {};
		const exactParameters: Record<string, unknown> = exact.objectLiteralParameters ?? {};
		const [containsName]: Array<string> = Object.keys(containsParameters);
		const [exactName]: Array<string> = Object.keys(exactParameters);

		expect(contains.type).toBe("raw");
		expect(Object.values(containsParameters)).toEqual(["%a!!!%!_\\b%"]);
		expect(contains.getSql?.("item.label")).toBe(`item.label LIKE :${String(containsName)} ESCAPE '!'`);
		expect(Object.values(exactParameters)).toEqual(["a!_b"]);
		expect(exact.getSql?.("item.label")).toBe(`UPPER(item.label) LIKE UPPER(:${String(exactName)}) ESCAPE '!'`);
	});

	it("names one parameter per pattern, so two patterns of one query never share a name", () => {
		const first: FindOperator<string> = ApiControllerGetListQueryLike("a", CONTAINS, "better-sqlite3");
		const second: FindOperator<string> = ApiControllerGetListQueryLike("b", CONTAINS, "better-sqlite3");

		expect(Object.keys(first.objectLiteralParameters ?? {})).not.toEqual(Object.keys(second.objectLiteralParameters ?? {}));
	});
});
