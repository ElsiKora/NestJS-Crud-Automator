import type { Relation } from "typeorm";

import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm";

import { GeneratedRelationCacheChildEntity } from "./generated-relation-cache-child.entity";

@Entity({ name: "generated_relation_cache_owner" })
export class GeneratedRelationCacheOwnerEntity {
	@OneToMany(() => GeneratedRelationCacheChildEntity, (child: GeneratedRelationCacheChildEntity): GeneratedRelationCacheOwnerEntity | undefined => child.owner)
	public children?: Relation<Array<GeneratedRelationCacheChildEntity>>;

	@PrimaryColumn({ type: "varchar" })
	public id?: string;

	@Column({ type: "varchar" })
	public name?: string;
}
