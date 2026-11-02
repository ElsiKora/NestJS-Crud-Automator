import "reflect-metadata";

import { GenerateRelationEntityInformation } from "@utility/generate-relation-entity-information.utility";
import { Entity, PrimaryGeneratedColumn } from "typeorm";
import { describe, expect, it } from "vitest";

@Entity("relation_information_targets")
class RelationInformationTarget {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;
}

const RelationInformationDuplicate = (() => {
	@Entity("relation_information_duplicates_first")
	class RelationInformationDuplicate {
		@PrimaryGeneratedColumn("uuid")
		public id!: string;
	}

	return RelationInformationDuplicate;
})();

(() => {
	@Entity("relation_information_duplicates_second")
	class RelationInformationDuplicate {
		@PrimaryGeneratedColumn("uuid")
		public id!: string;
	}

	return RelationInformationDuplicate;
})();

class RelationInformationPlainClass {}

describe("GenerateRelationEntityInformation", () => {
	it("generates information for an entity class and for the one class a name matches", () => {
		expect(GenerateRelationEntityInformation(RelationInformationTarget)?.tableName).toBe("relation_information_targets");
		expect(GenerateRelationEntityInformation({ name: "RelationInformationTarget" })?.tableName).toBe("relation_information_targets");
	});

	it("returns nothing for a class without an entity table or a name that matches no entity class", () => {
		expect(GenerateRelationEntityInformation(RelationInformationPlainClass)).toBeUndefined();
		expect(GenerateRelationEntityInformation({ name: "RelationInformationMissing" })).toBeUndefined();
	});

	it("generates information for a duplicated class passed by identity and fails for its name", () => {
		expect(GenerateRelationEntityInformation(RelationInformationDuplicate)).toBeDefined();
		expect(() => GenerateRelationEntityInformation({ name: "RelationInformationDuplicate" })).toThrowError('Metadata target "RelationInformationDuplicate" matches 2 entity classes in TypeORM metadata');
	});
});
