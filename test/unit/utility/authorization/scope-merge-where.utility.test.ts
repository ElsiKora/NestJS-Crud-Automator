import type { TApiAuthorizationScopeWhere } from "@type/class/api/authorization/scope-where.type";

import { AuthorizationScopeMergeWhere } from "@utility/authorization/scope-merge-where.utility";
import { describe, expect, it } from "vitest";

class ScopeEntity {
	public id?: string;
	public operator?: { id?: string };
	public operatorId?: string;
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

	it("keeps identical scalar filters unchanged", () => {
		const result = AuthorizationScopeMergeWhere(
			{ id: "entity-1", operatorId: "operator-1" } as TApiAuthorizationScopeWhere<ScopeEntity>,
			{ operatorId: "operator-1" } as TApiAuthorizationScopeWhere<ScopeEntity>,
		) as Record<string, unknown>;

		expect(result).toEqual({
			id: "entity-1",
			operatorId: "operator-1",
		});
	});

	it("converts conflicting id filters into a match-nothing branch", () => {
		const result = AuthorizationScopeMergeWhere(
			{ id: "foreign-id" } as TApiAuthorizationScopeWhere<ScopeEntity>,
			{ id: "own-id" } as TApiAuthorizationScopeWhere<ScopeEntity>,
		) as Record<string, unknown>;

		expect(result.id).toMatchObject({
			_type: "in",
			_value: [],
		});
	});

	it("converts conflicting operatorId filters into a match-nothing branch", () => {
		const result = AuthorizationScopeMergeWhere(
			{ operatorId: "foreign-operator" } as TApiAuthorizationScopeWhere<ScopeEntity>,
			{ operatorId: "own-operator" } as TApiAuthorizationScopeWhere<ScopeEntity>,
		) as Record<string, unknown>;

		expect(result.operatorId).toMatchObject({
			_type: "in",
			_value: [],
		});
	});

	it("converts nested path conflicts into a match-nothing branch", () => {
		const result = AuthorizationScopeMergeWhere(
			{ operator: { id: "foreign-operator" } } as TApiAuthorizationScopeWhere<ScopeEntity>,
			{ operator: { id: "own-operator" } } as TApiAuthorizationScopeWhere<ScopeEntity>,
		) as {
			operator?: {
				id?: unknown;
			};
		};

		expect(result.operator?.id).toMatchObject({
			_type: "in",
			_value: [],
		});
	});

	it("preserves cartesian OR branches without overwriting conflicting values", () => {
		const result = AuthorizationScopeMergeWhere(
			[{ id: "foreign-id" }, { id: "own-id" }] as TApiAuthorizationScopeWhere<ScopeEntity>,
			[{ operatorId: "operator-1" }, { id: "own-id" }] as TApiAuthorizationScopeWhere<ScopeEntity>,
		) as Array<Record<string, unknown>>;

		expect(result).toHaveLength(4);
		expect(result[0]).toMatchObject({
			id: "foreign-id",
			operatorId: "operator-1",
		});
		expect(result[1]?.id).toMatchObject({
			_type: "in",
			_value: [],
		});
		expect(result[2]).toMatchObject({
			id: "own-id",
			operatorId: "operator-1",
		});
		expect(result[3]).toMatchObject({
			id: "own-id",
		});
	});
});
