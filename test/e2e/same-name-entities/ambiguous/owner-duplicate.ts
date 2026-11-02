import "reflect-metadata";

import { Entity, PrimaryGeneratedColumn } from "typeorm";

// A second entity class with the owner's name, as another module or package might declare it.
@Entity("e2e_same_name_ambiguous_owners_second")
export class SameNameAmbiguousOwnerEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;
}
