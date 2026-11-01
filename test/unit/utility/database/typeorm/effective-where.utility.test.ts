import { DatabaseTypeOrmAssertEffectiveWhere } from "@utility/database/typeorm/assert/effective-where.utility";
import { DatabaseTypeOrmAssertRequiredWhere } from "@utility/database/typeorm/assert/required-where.utility";
import { In, IsNull, MoreThan } from "typeorm";
import { describe, expect, it } from "vitest";

describe("DatabaseTypeOrmAssertEffectiveWhere and DatabaseTypeOrmAssertRequiredWhere", () => {
	it("accepts scalar, operator, date, nested and OR conditions", () => {
		expect(() => DatabaseTypeOrmAssertRequiredWhere({ createdAt: new Date(0), deletedAt: IsNull(), id: "a", rank: MoreThan(1) })).not.toThrow();
		expect(() => DatabaseTypeOrmAssertRequiredWhere({ owner: { id: "o" }, tags: In(["x"]) })).not.toThrow();
		expect(() => DatabaseTypeOrmAssertRequiredWhere([{ id: "a" }, { id: "b", owner: { name: "n" } }])).not.toThrow();
		expect(() => DatabaseTypeOrmAssertRequiredWhere({ id: ["a", "b"] })).not.toThrow();
	});

	it("allows a missing or empty WHERE only when the operation does not target a single row", () => {
		expect(() => DatabaseTypeOrmAssertEffectiveWhere(undefined)).not.toThrow();
		expect(() => DatabaseTypeOrmAssertEffectiveWhere({})).not.toThrow();
		expect(() => DatabaseTypeOrmAssertRequiredWhere(undefined)).toThrow("WHERE criteria are required for a single-row operation");
		expect(() => DatabaseTypeOrmAssertRequiredWhere({ id: undefined })).toThrow('WHERE property "id" is undefined');
		expect(() => DatabaseTypeOrmAssertRequiredWhere({})).toThrow("WHERE criteria are required for a single-row operation");
	});

	it("refuses undefined and null conditions instead of dropping them", () => {
		expect(() => DatabaseTypeOrmAssertEffectiveWhere({ id: "a", tenantId: undefined })).toThrow('WHERE property "tenantId" is undefined; use IsNull() or remove the property');
		expect(() => DatabaseTypeOrmAssertEffectiveWhere({ deletedAt: null })).toThrow('WHERE property "deletedAt" is null; use IsNull() or remove the property');
		expect(() => DatabaseTypeOrmAssertEffectiveWhere({ owner: { id: undefined } })).toThrow('WHERE property "owner.id" is undefined');
		expect(() => DatabaseTypeOrmAssertEffectiveWhere([{ id: "a" }, { id: undefined }])).toThrow('WHERE property "[1].id" is undefined');
		expect(() => DatabaseTypeOrmAssertEffectiveWhere({ id: ["a", undefined] })).toThrow('WHERE property "id[1]" is undefined');
	});

	it("refuses empty branches that TypeORM would read as match-all", () => {
		expect(() => DatabaseTypeOrmAssertEffectiveWhere([])).toThrow("WHERE cannot be an empty array of branches");
		expect(() => DatabaseTypeOrmAssertEffectiveWhere([{}])).toThrow('WHERE property "[0]" must contain at least one condition');
		expect(() => DatabaseTypeOrmAssertEffectiveWhere({ owner: {} })).toThrow('WHERE property "owner" must contain at least one condition');
		expect(() => DatabaseTypeOrmAssertEffectiveWhere(["a"])).toThrow("WHERE branch 0 must be a plain object");
		expect(() => DatabaseTypeOrmAssertEffectiveWhere("id = 1")).toThrow("WHERE must be a plain object or an array of plain objects");
	});

	it("walks entity instances used as relation conditions", () => {
		class OwnerEntity {
			public id?: string;
		}
		const owner: OwnerEntity = new OwnerEntity();

		expect(() => DatabaseTypeOrmAssertEffectiveWhere({ owner })).toThrow('WHERE property "owner.id" is undefined');
		owner.id = "o";
		expect(() => DatabaseTypeOrmAssertEffectiveWhere({ owner })).not.toThrow();

		class OwnerLookalike {
			public get id(): string {
				return "o";
			}
		}

		// TypeORM 1 reads only own keys and drops an instance that has none
		expect(() => DatabaseTypeOrmAssertEffectiveWhere({ owner: new OwnerLookalike() })).toThrow('WHERE property "owner" must contain at least one condition');
	});
});
