import { DatabaseTypeOrmIsInverseSideRelation } from "@utility/database/typeorm/is/inverse-side-relation.utility";
import { describe, expect, it } from "vitest";

import { InverseSideChildEntity, InverseSideParentEntity, InverseSideSubclassEntity } from "./fixture/inverse-side-relation.entity";

describe("DatabaseTypeOrmIsInverseSideRelation", () => {
	it.each([
		["a OneToMany", "children", true],
		["the inverse side of a OneToOne", "profile", true],
		["the owning side of a OneToOne", "owned", false],
		["a ManyToOne", "owner", false],
		["a ManyToMany", "tags", false],
		["a column", "id", false],
		["an unknown property", "missing", false],
	])("tells %s apart", (_name: string, propertyName: string, isInverseSide: boolean) => {
		expect(DatabaseTypeOrmIsInverseSideRelation(InverseSideParentEntity, propertyName)).toBe(isInverseSide);
	});

	it("reads relations declared on a parent class", () => {
		expect(DatabaseTypeOrmIsInverseSideRelation(InverseSideSubclassEntity, "children")).toBe(true);
		expect(DatabaseTypeOrmIsInverseSideRelation(InverseSideSubclassEntity, "profile")).toBe(true);
		expect(DatabaseTypeOrmIsInverseSideRelation(InverseSideSubclassEntity, "owned")).toBe(false);
	});

	it("reads the owning side of a OneToOne on the other entity", () => {
		expect(DatabaseTypeOrmIsInverseSideRelation(InverseSideChildEntity, "profileOf")).toBe(false);
	});

	it("answers false for a value that is not an entity class", () => {
		expect(DatabaseTypeOrmIsInverseSideRelation(undefined, "children")).toBe(false);
	});
});
