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

export enum ECreateGuardKind {
	ACCOUNT = "account",
	DEVICE = "device",
}

@Entity({ name: "create_guard_identities" })
export class CreateGuardIdentityEntity {
	@PrimaryColumn({ enum: ECreateGuardKind, type: "simple-enum" })
	public kind!: ECreateGuardKind;

	@Column({ type: "varchar" })
	public name!: string;

	@PrimaryColumn({ name: "source_id", type: "varchar" })
	public sourceId!: string;
}

// Both key columns are also the join columns of a relation over two columns.
@Entity({ name: "create_guard_bindings" })
export class CreateGuardBindingEntity {
	@DeleteDateColumn({ nullable: true, type: "datetime" })
	public deletedAt?: Date | null;

	@JoinColumn([
		{ name: "kind", referencedColumnName: "kind" },
		{ name: "source_id", referencedColumnName: "sourceId" },
	])
	@ManyToOne(() => CreateGuardIdentityEntity)
	public identity?: CreateGuardIdentityEntity;

	@PrimaryColumn({ enum: ECreateGuardKind, type: "simple-enum" })
	public kind!: ECreateGuardKind;

	@Column({ type: "varchar" })
	public label!: string;

	@PrimaryColumn({ name: "source_id", type: "varchar" })
	public sourceId!: string;
}

export class CreateGuardSlotKey {
	// The column stores its code in lower case, whatever the row holds.
	@PrimaryColumn({ transformer: { from: (value: string): string => value, to: (value: unknown): unknown => (typeof value === "string" ? value.toLowerCase() : value) }, type: "varchar" })
	public code!: string;

	@PrimaryColumn({ type: "varchar" })
	public region!: string;
}

// A key of two columns inside an embedded property, beside a key column of the entity.
@Entity({ name: "create_guard_slots" })
export class CreateGuardSlotEntity {
	@Column(() => CreateGuardSlotKey)
	public key!: CreateGuardSlotKey;

	@Column({ type: "varchar" })
	public name!: string;

	@PrimaryColumn({ type: "varchar" })
	public tenantId!: string;
}
