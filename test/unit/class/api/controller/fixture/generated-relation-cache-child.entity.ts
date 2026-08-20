import type { Relation } from "typeorm";

import { Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";

import { GeneratedRelationCacheOwnerEntity } from "./generated-relation-cache-owner.entity";

@Entity({ name: "generated_relation_cache_child" })
export class GeneratedRelationCacheChildEntity {
	@PrimaryColumn({ type: "varchar" })
	public id?: string;

	@ManyToOne(() => GeneratedRelationCacheOwnerEntity, (owner: GeneratedRelationCacheOwnerEntity): Array<GeneratedRelationCacheChildEntity> | undefined => owner.children, { nullable: false })
	public owner?: Relation<GeneratedRelationCacheOwnerEntity>;

	@Column({ type: "varchar" })
	public ownerId?: string;

	@Column({ type: "varchar" })
	public value?: string;
}
