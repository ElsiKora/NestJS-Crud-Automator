import type { TApiAuthorizationScopeWhere } from "@type/class/api/authorization/scope-where.type";

import { AuthorizationScopeMergeWhere } from "@utility/authorization/scope-merge-where.utility";
import { describe, expect, it } from "vitest";

class ScopeEntity {
	public id?: string;
	public status?: string;
	public tenantId?: string;
}

describe("AuthorizationScopeMergeWhere", () => {
	it("returns scoped filter when base is empty", () => {
		const scopedWhere = { tenantId: "t1" } as TApiAuthorizationScopeWhere<ScopeEntity>;
		const result = AuthorizationScopeMergeWhere(undefined as unknown as TApiAuthorizationScopeWhere<ScopeEntity>, scopedWhere);

		expect(result).toEqual(scopedWhere);
	});

	it("merges arrays of filters into cartesian product", () => {
		const baseWhere = [{ id: "1" }, { id: "2" }] as TApiAuthorizationScopeWhere<ScopeEntity>;
		const scopedWhere = { status: "active" } as TApiAuthorizationScopeWhere<ScopeEntity>;

		const result = AuthorizationScopeMergeWhere(baseWhere, scopedWhere) as Array<Record<string, unknown>>;

		expect(result).toHaveLength(2);
		expect(result[0]).toMatchObject({ id: "1", status: "active" });
		expect(result[1]).toMatchObject({ id: "2", status: "active" });
	});
});
