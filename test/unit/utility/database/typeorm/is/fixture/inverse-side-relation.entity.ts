import "reflect-metadata";

import { Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, type Relation } from "typeorm";

@Entity("inverse_side_children")
export class InverseSideChildEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@ManyToOne(() => InverseSideParentEntity, (parent: InverseSideParentEntity): Array<InverseSideChildEntity> => parent.children, { nullable: true })
	public parent?: null | Relation<InverseSideParentEntity>;

	@JoinColumn()
	@OneToOne(() => InverseSideParentEntity, (parent: InverseSideParentEntity): InverseSideChildEntity | undefined => parent.profile, { nullable: true })
	public profileOf?: null | Relation<InverseSideParentEntity>;
}

/** Declares one relation of each kind, so a subclass inherits them all. */
@Entity("inverse_side_parents")
export class InverseSideParentEntity {
	@OneToMany(() => InverseSideChildEntity, (child: InverseSideChildEntity): null | Relation<InverseSideParentEntity> | undefined => child.parent)
	public children!: Array<InverseSideChildEntity>;

	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@JoinColumn()
	@OneToOne(() => InverseSideChildEntity, { nullable: true })
	public owned?: null | Relation<InverseSideChildEntity>;

	@ManyToOne(() => InverseSideChildEntity, { nullable: true })
	public owner?: null | Relation<InverseSideChildEntity>;

	@OneToOne(() => InverseSideChildEntity, (child: InverseSideChildEntity): null | Relation<InverseSideParentEntity> | undefined => child.profileOf)
	public profile?: Relation<InverseSideChildEntity>;

	@JoinTable()
	@ManyToMany(() => InverseSideChildEntity)
	public tags!: Array<InverseSideChildEntity>;
}

export class InverseSideSubclassEntity extends InverseSideParentEntity {}
