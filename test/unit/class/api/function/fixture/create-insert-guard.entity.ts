import { Column, DeleteDateColumn, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";

@Entity({ name: "create_guard_owners" })
export class CreateGuardOwnerEntity {
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@Column({ type: "varchar" })
	public name!: string;
}

@Entity({ name: "create_guard_tags" })
export class CreateGuardTagEntity {
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@Column({ type: "varchar" })
	public name!: string;
}

@Entity({ name: "create_guard_items" })
export class CreateGuardItemEntity {
	@OneToMany(() => CreateGuardChildEntity, (child: CreateGuardChildEntity) => child.parent, { cascade: true })
	public children?: Array<CreateGuardChildEntity>;

	@DeleteDateColumn({ nullable: true, type: "datetime" })
	public deletedAt?: Date | null;

	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@Column({ type: "varchar" })
	public name!: string;

	@JoinColumn({ name: "ownerId" })
	@ManyToOne(() => CreateGuardOwnerEntity, { cascade: true, nullable: true })
	public owner?: CreateGuardOwnerEntity | null;

	@JoinTable({ name: "create_guard_item_tags" })
	@ManyToMany(() => CreateGuardTagEntity, { cascade: true })
	public tags?: Array<CreateGuardTagEntity>;
}

@Entity({ name: "create_guard_children" })
export class CreateGuardChildEntity {
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@Column({ type: "varchar" })
	public name!: string;

	@JoinColumn({ name: "parentId" })
	@ManyToOne(() => CreateGuardItemEntity, (item: CreateGuardItemEntity) => item.children, { nullable: true })
	public parent?: CreateGuardItemEntity | null;
}

@Entity({ name: "create_guard_counters" })
export class CreateGuardCounterEntity {
	@Column({ type: "integer" })
	public count!: number;

	@PrimaryColumn({ type: "varchar" })
	public id!: string;
}
