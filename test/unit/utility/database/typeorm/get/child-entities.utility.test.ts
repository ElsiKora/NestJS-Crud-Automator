import { DatabaseTypeOrmGetChildEntities } from "@utility/database/typeorm/get/child-entities.utility";
import { ChildEntity, Entity, PrimaryColumn, TableInheritance } from "typeorm";
import { describe, expect, it } from "vitest";

@Entity("child_entities_utility_roots")
@TableInheritance({ column: { name: "kind", type: "varchar" } })
class ChildEntitiesUtilityRoot {
	@PrimaryColumn({ type: "varchar" })
	public id!: string;
}

@ChildEntity("FIRST")
class ChildEntitiesUtilityFirst extends ChildEntitiesUtilityRoot {}

@ChildEntity("SECOND")
class ChildEntitiesUtilitySecond extends ChildEntitiesUtilityRoot {}

@Entity("child_entities_utility_others")
class ChildEntitiesUtilityOther {
	@PrimaryColumn({ type: "varchar" })
	public id!: string;
}

describe("DatabaseTypeOrmGetChildEntities", () => {
	it("lists the child entities of a table inheritance root in registration order", () => {
		expect(DatabaseTypeOrmGetChildEntities(ChildEntitiesUtilityRoot)).toEqual([ChildEntitiesUtilityFirst, ChildEntitiesUtilitySecond]);
	});

	it.each([
		["a child entity", ChildEntitiesUtilityFirst],
		["an entity without table inheritance", ChildEntitiesUtilityOther],
		["a value that is not a class", "ChildEntitiesUtilityRoot"],
	])("gives an empty list for %s", (_name: string, root: unknown) => {
		expect(DatabaseTypeOrmGetChildEntities(root)).toEqual([]);
	});
});
