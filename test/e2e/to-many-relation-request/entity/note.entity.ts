import "reflect-metadata";

import { ApiPropertyDescribe, EApiPropertyDescribeType } from "../../../../src/index";
import { Entity, ManyToOne, PrimaryColumn, type Relation } from "typeorm";

import { E2eHydrationPostEntity } from "./post.entity";

@Entity("e2e_hydration_notes")
export class E2eHydrationNoteEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@ManyToOne(() => E2eHydrationPostEntity, (post: E2eHydrationPostEntity): Array<E2eHydrationNoteEntity> | undefined => post.notes, { nullable: true })
	public post?: null | Relation<E2eHydrationPostEntity>;
}
