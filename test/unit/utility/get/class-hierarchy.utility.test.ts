import { GetClassHierarchy } from "@utility/get/class-hierarchy.utility";
import { describe, expect, it } from "vitest";

abstract class HierarchyRoot {}

class HierarchyMiddle extends HierarchyRoot {}

class HierarchyLeaf extends HierarchyMiddle {}

describe("GetClassHierarchy", () => {
	it("lists the class and every parent class, nearest first", () => {
		expect(GetClassHierarchy(HierarchyLeaf)).toEqual([HierarchyLeaf, HierarchyMiddle, HierarchyRoot]);
	});

	it.each([undefined, null, "HierarchyLeaf", {}])("gives an empty list for %s", (target: unknown) => {
		expect(GetClassHierarchy(target)).toEqual([]);
	});
});
