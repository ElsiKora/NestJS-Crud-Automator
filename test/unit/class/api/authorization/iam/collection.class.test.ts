import type { IApiAuthorizationIamCollection, IApiAuthorizationIamElement, IApiAuthorizationIamQueryField } from "@interface/class/api/authorization";
import type { DataSourceOptions } from "typeorm";

import { ApiAuthorizationIamCollection } from "@class/api/authorization/iam";
import { AuthorizationIamReadQueryField } from "@utility/authorization/iam-query-field.utility";
import { ChildEntity, Column, DataSource, DeleteDateColumn, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryColumn, TableInheritance } from "typeorm";
import { beforeAll, describe, expect, it } from "vitest";

@Entity("collection_notes")
class CollectionNoteEntity {
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@ManyToOne(() => CollectionItemEntity, (item: CollectionItemEntity) => item.notes)
	public item!: unknown;

	@Column({ name: "note_text", nullable: true, type: "varchar" })
	public text!: null | string;
}

@Entity("collection_soft_notes")
class CollectionSoftNoteEntity {
	@DeleteDateColumn({ name: "deleted_at" })
	public deletedAt!: Date | null;

	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@ManyToOne(() => CollectionItemEntity, (item: CollectionItemEntity) => item.softNotes)
	public item!: unknown;

	@Column({ nullable: true, type: "varchar" })
	public text!: null | string;
}

@Entity("collection_tags")
class CollectionTagEntity {
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@Column({ nullable: true, type: "varchar" })
	public name!: null | string;
}

@Entity("collection_groups")
class CollectionGroupEntity {
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@JoinTable({ name: "collection_group_items" })
	@ManyToMany(() => CollectionItemEntity, (item: CollectionItemEntity) => item.groups)
	public items!: Array<unknown>;

	@Column({ nullable: true, type: "varchar" })
	public name!: null | string;
}

@Entity("collection_shapes")
@TableInheritance({ column: { name: "kind", type: "varchar" } })
class CollectionShapeEntity {
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@ManyToOne(() => CollectionItemEntity)
	public item!: unknown;
}

@ChildEntity("circle")
class CollectionCircleEntity extends CollectionShapeEntity {
	@ManyToOne(() => CollectionItemEntity, (item: CollectionItemEntity) => item.circles)
	public override item!: unknown;

	@Column({ nullable: true, type: "varchar" })
	public radius!: null | string;
}

@Entity("collection_composite_children")
class CollectionCompositeChildEntity {
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@ManyToOne(() => CollectionCompositeEntity, (parent: CollectionCompositeEntity) => parent.children)
	public parent!: unknown;

	@Column({ nullable: true, type: "varchar" })
	public text!: null | string;
}

@Entity("collection_composites")
class CollectionCompositeEntity {
	@OneToMany(() => CollectionCompositeChildEntity, (child: CollectionCompositeChildEntity) => child.parent)
	public children!: Array<CollectionCompositeChildEntity>;

	@PrimaryColumn({ type: "varchar" })
	public left!: string;

	@PrimaryColumn({ type: "varchar" })
	public right!: string;
}

@Entity("collection_items")
class CollectionItemEntity {
	@OneToMany(() => CollectionCircleEntity, (circle: CollectionCircleEntity) => circle.item)
	public circles!: Array<CollectionCircleEntity>;

	@ManyToMany(() => CollectionGroupEntity, (group: CollectionGroupEntity) => group.items)
	public groups!: Array<CollectionGroupEntity>;

	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@OneToMany(() => CollectionNoteEntity, (note: CollectionNoteEntity) => note.item)
	public notes!: Array<CollectionNoteEntity>;

	@OneToMany(() => CollectionSoftNoteEntity, (note: CollectionSoftNoteEntity) => note.item)
	public softNotes!: Array<CollectionSoftNoteEntity>;

	@JoinTable({ name: "collection_item_tags" })
	@ManyToMany(() => CollectionTagEntity)
	public tags!: Array<CollectionTagEntity>;
}

const ENTITIES: Array<new () => unknown> = [CollectionCircleEntity, CollectionCompositeChildEntity, CollectionCompositeEntity, CollectionGroupEntity, CollectionItemEntity, CollectionNoteEntity, CollectionShapeEntity, CollectionSoftNoteEntity, CollectionTagEntity];

const createDataSource = async (options: Record<string, unknown>): Promise<DataSource> => {
	const dataSource: DataSource = new DataSource({ ...options, entities: ENTITIES } as unknown as DataSourceOptions);

	await (dataSource as unknown as { buildMetadatas: () => Promise<void> }).buildMetadatas();

	return dataSource;
};

const readElement = (entity: object, queryPath: string): IApiAuthorizationIamElement => {
	const field: IApiAuthorizationIamQueryField = AuthorizationIamReadQueryField(entity, queryPath);

	if (!field.element) {
		throw new Error(`${queryPath} names no column of a related row`);
	}

	return field.element;
};

describe("ApiAuthorizationIamCollection", () => {
	let sqlite: DataSource;
	let postgres: DataSource;
	let mysql: DataSource;

	beforeAll(async () => {
		[sqlite, postgres, mysql] = await Promise.all([createDataSource({ database: ":memory:", type: "better-sqlite3" }), createDataSource({ database: "iam", type: "postgres" }), createDataSource({ connectorPackage: "mysql2", database: "iam", driver: { isStub: true }, type: "mysql" })]);
	});

	it("reads a OneToMany from the related table, by its join column", () => {
		expect(ApiAuthorizationIamCollection.read(postgres, CollectionItemEntity, readElement(CollectionItemEntity, "notes.text"))).toEqual({
			correlationPath: "id",
			element: `"iam_collection_row"."note_text"`,
			elementPath: "text",
			from: `"collection_notes" "iam_collection_row"`,
			link: `"iam_collection_row"."itemId"`,
		});
	});

	it("reads the owner side of a ManyToMany through its junction table", () => {
		expect(ApiAuthorizationIamCollection.read(postgres, CollectionItemEntity, readElement(CollectionItemEntity, "tags.name"))).toEqual({
			correlationPath: "id",
			element: `"iam_collection_row"."name"`,
			elementPath: "name",
			from: `"collection_item_tags" "iam_collection_link" INNER JOIN "collection_tags" "iam_collection_row" ON "iam_collection_row"."id" = "iam_collection_link"."collection_tags_id"`,
			link: `"iam_collection_link"."collection_items_id"`,
		});
	});

	it("reads the inverse side of a ManyToMany with the junction columns swapped", () => {
		expect(ApiAuthorizationIamCollection.read(postgres, CollectionItemEntity, readElement(CollectionItemEntity, "groups.name"))).toEqual({
			correlationPath: "id",
			element: `"iam_collection_row"."name"`,
			elementPath: "name",
			from: `"collection_group_items" "iam_collection_link" INNER JOIN "collection_groups" "iam_collection_row" ON "iam_collection_row"."id" = "iam_collection_link"."collection_groups_id"`,
			link: `"iam_collection_link"."collection_items_id"`,
		});
	});

	it("counts only the rows that are not deleted of a soft-deletable entity", () => {
		const collection: IApiAuthorizationIamCollection | undefined = ApiAuthorizationIamCollection.read(postgres, CollectionItemEntity, readElement(CollectionItemEntity, "softNotes.text"));

		expect(collection?.rowCondition).toBe(`"iam_collection_row"."deleted_at" IS NULL`);
		expect(collection?.softDeletePath).toBe("deletedAt");
	});

	it("escapes names as the driver does", () => {
		expect(ApiAuthorizationIamCollection.read(mysql, CollectionItemEntity, readElement(CollectionItemEntity, "notes.text"))?.element).toBe("`iam_collection_row`.`note_text`");
		expect(ApiAuthorizationIamCollection.read(sqlite, CollectionItemEntity, readElement(CollectionItemEntity, "notes.text"))?.element).toBe(`"iam_collection_row"."note_text"`);
	});

	it("reads nothing without the one DataSource of the entity", () => {
		expect(ApiAuthorizationIamCollection.read(undefined, CollectionItemEntity, readElement(CollectionItemEntity, "notes.text"))).toBeUndefined();
	});

	it("reads nothing for an entity the DataSource does not map", () => {
		class CollectionUnmappedEntity {}

		expect(ApiAuthorizationIamCollection.read(sqlite, CollectionUnmappedEntity, readElement(CollectionItemEntity, "notes.text"))).toBeUndefined();
	});

	it("reads nothing for a composite key, which one correlation column cannot join", () => {
		expect(ApiAuthorizationIamCollection.read(sqlite, CollectionCompositeEntity, readElement(CollectionCompositeEntity, "children.text"))).toBeUndefined();
	});

	it("reads nothing for a related entity that shares its table with other entity types", () => {
		expect(ApiAuthorizationIamCollection.read(sqlite, CollectionItemEntity, readElement(CollectionItemEntity, "circles.radius"))).toBeUndefined();
	});

	it("names a column of a related row of the resource itself, and nothing further", () => {
		expect(AuthorizationIamReadQueryField(CollectionItemEntity, "notes.text").element?.queryPath).toBe("text");
		expect(AuthorizationIamReadQueryField(CollectionItemEntity, "notes.text").collectionPath).toBe("notes");
		expect(AuthorizationIamReadQueryField(CollectionItemEntity, "notes.item.id").element).toBeUndefined();
		expect(AuthorizationIamReadQueryField(CollectionItemEntity, "notes").element).toBeUndefined();
		expect(AuthorizationIamReadQueryField(CollectionItemEntity, "notes.missing").element).toBeUndefined();
	});
});
