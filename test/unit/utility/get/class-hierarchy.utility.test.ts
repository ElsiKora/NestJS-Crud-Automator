import { GetClassHierarchy } from "@utility/get/class-hierarchy.utility";
import { describe, expect, it } from "vitest";

abstract class HierarchyRoot {}

class HierarchyMiddle extends HierarchyRoot {}

class HierarchyLeaf extends HierarchyMiddle {}

abstract class HierarchyUnnamed extends HierarchyRoot {}

Object.defineProperty(HierarchyUnnamed, "name", { value: "" });

class HierarchyBelowUnnamed extends HierarchyUnnamed {}

describe("GetClassHierarchy", () => {
	it("lists the class and every parent class, nearest first", () => {
		expect(GetClassHierarchy(HierarchyLeaf)).toEqual([HierarchyLeaf, HierarchyMiddle, HierarchyRoot]);
	});

	it("stops at the first parent class without a name, as TypeORM does", () => {
		expect(GetClassHierarchy(HierarchyBelowUnnamed)).toEqual([HierarchyBelowUnnamed]);
	});

	it.each([undefined, null, "HierarchyLeaf", {}])("gives an empty list for %s", (target: unknown) => {
		expect(GetClassHierarchy(target)).toEqual([]);
	});
});
