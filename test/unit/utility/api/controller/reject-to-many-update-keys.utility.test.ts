import "reflect-metadata";

import { ApiControllerRejectToManyUpdateKeys } from "@utility/api/controller/reject-to-many-update-keys.utility";
import { ChildEntity, Column, Entity, getMetadataArgsStorage, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn, type Relation, TableInheritance } from "typeorm";
import { afterEach, describe, expect, it, vi } from "vitest";

@Entity("reject_to_many_tags")
class RejectToManyTag {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;
}

@Entity("reject_to_many_notes")
class RejectToManyNote {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@ManyToOne(() => RejectToManyPost, (post: RejectToManyPost): Array<RejectToManyNote> => post.notes)
	public post!: Relation<RejectToManyPost>;
}

class RejectToManyInnerMeta {
	@JoinTable({ name: "reject_to_many_inner_tags" })
	@ManyToMany(() => RejectToManyTag)
	public deepTags?: Array<RejectToManyTag>;
}

class RejectToManyMeta {
	@JoinTable({ name: "reject_to_many_meta_tags" })
	@ManyToMany(() => RejectToManyTag)
	public extras?: Array<RejectToManyTag>;

	@Column(() => RejectToManyInnerMeta)
	public inner?: RejectToManyInnerMeta;

	@Column({ nullable: true, type: "varchar" })
	public label?: string;
}

abstract class RejectToManyTagged {
	@JoinTable({ name: "reject_to_many_post_tags" })
	@ManyToMany(() => RejectToManyTag)
	public tags!: Array<RejectToManyTag>;
}

@Entity("reject_to_many_posts")
class RejectToManyPost extends RejectToManyTagged {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@OneToMany(() => RejectToManyNote, (note: RejectToManyNote): Relation<RejectToManyPost> => note.post)
	public notes!: Array<RejectToManyNote>;

	@ManyToOne(() => RejectToManyTag)
	public owner!: RejectToManyTag;

	@Column(() => RejectToManyMeta)
	public meta?: RejectToManyMeta;

	@Column({ type: "varchar" })
	public title!: string;
}

@Entity("reject_to_many_details")
@TableInheritance({ column: { name: "kind", type: "varchar" } })
class RejectToManyDetail {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ nullable: true, type: "varchar" })
	public label?: string;
}

@ChildEntity("CARD")
class RejectToManyCard extends RejectToManyDetail {
	@JoinTable({ name: "reject_to_many_card_tags" })
	@ManyToMany(() => RejectToManyTag)
	public cardTags?: Array<RejectToManyTag>;
}

@Entity("reject_to_many_cached_posts")
class RejectToManyCachedPost {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@JoinTable({ name: "reject_to_many_cached_post_tags" })
	@ManyToMany(() => RejectToManyTag)
	public tags?: Array<RejectToManyTag>;
}

@Entity("reject_to_many_late_details")
@TableInheritance({ column: { name: "kind", type: "varchar" } })
class RejectToManyLateDetail {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;
}

class RejectToManyLateMeta {
	@JoinTable({ name: "reject_to_many_late_meta_tags" })
	@ManyToMany(() => RejectToManyTag)
	public embTags?: Array<RejectToManyTag>;
}

@Entity("reject_to_many_late_embedded_details")
@TableInheritance({ column: { name: "kind", type: "varchar" } })
class RejectToManyLateEmbeddedDetail {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;
}

@Entity("reject_to_many_late_table_details")
@TableInheritance({ column: { name: "kind", type: "varchar" } })
class RejectToManyLateTableDetail {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;
}

// Holds a relation TypeORM already knows about, so @ChildEntity on it later adds a table and nothing else.
class RejectToManyLateTableCard extends RejectToManyLateTableDetail {
	@JoinTable({ name: "reject_to_many_late_table_card_tags" })
	@ManyToMany(() => RejectToManyTag)
	public lateTags?: Array<RejectToManyTag>;
}

@Entity("reject_to_many_late_relation_posts")
class RejectToManyLateRelationPost {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;
}

@Entity("reject_to_many_late_embedded_posts")
class RejectToManyLateEmbeddedPost {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;
}

describe("ApiControllerRejectToManyUpdateKeys", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	const reject = (body: Record<string, unknown> | undefined): void => ApiControllerRejectToManyUpdateKeys(RejectToManyPost, body);

	it.each([
		["an inherited ManyToMany reference", "tags", "tag-1"],
		["an own OneToMany reference", "notes", "note-1"],
		["null for an inherited ManyToMany relation", "tags", null],
		["null for an own OneToMany relation", "notes", null],
		["an empty array", "tags", []],
	])("rejects %s", (_name: string, propertyName: string, value: unknown) => {
		expect(() => reject({ [propertyName]: value, title: "changed" })).toThrow(
			expect.objectContaining({
				response: {
					details: { propertyName, reason: "to-many reference is not allowed on update" },
					error: "Bad Request",
					message: "REJECTTOMANYPOST_INVALID_REFERENCE",
					statusCode: 400,
				},
			}),
		);
	});

	it.each([
		["an embedded ManyToMany array", { meta: { extras: [{ id: "tag-1" }] } }, "meta.extras"],
		["null for an embedded ManyToMany", { meta: { extras: null } }, "meta.extras"],
		["a ManyToMany in a nested embedded", { meta: { inner: { deepTags: [] } } }, "meta.inner.deepTags"],
	])("rejects %s by its dotted path", (_name: string, body: Record<string, unknown>, propertyName: string) => {
		expect(() => reject(body)).toThrow(expect.objectContaining({ response: expect.objectContaining({ details: { propertyName, reason: "to-many reference is not allowed on update" } }) }));
	});

	it("accepts embedded columns and embedded objects without a to-many key", () => {
		expect(() => reject({ meta: { inner: {}, label: "label" } })).not.toThrow();
		expect(() => reject({ meta: null })).not.toThrow();
	});

	it.each([null, "tag-1"])("rejects a child entity's to-many key on a table inheritance root route from TypeORM metadata alone (%s)", (value: null | string) => {
		expect(() => ApiControllerRejectToManyUpdateKeys(RejectToManyDetail, { cardTags: value, label: "changed" })).toThrow(expect.objectContaining({ response: expect.objectContaining({ details: { propertyName: "cardTags", reason: "to-many reference is not allowed on update" } }) }));
	});

	it("rejects its own to-many key on a child entity route and accepts its columns", () => {
		expect(() => ApiControllerRejectToManyUpdateKeys(RejectToManyCard, { label: "changed" })).not.toThrow();
		expect(() => ApiControllerRejectToManyUpdateKeys(RejectToManyCard, { cardTags: null })).toThrow(expect.objectContaining({ response: expect.objectContaining({ details: { propertyName: "cardTags", reason: "to-many reference is not allowed on update" } }) }));
	});

	it("accepts columns, to-one references, undefined to-many keys and no body", () => {
		expect(() => reject({ notes: undefined, owner: "tag-1", title: "changed" })).not.toThrow();
		expect(() => reject(undefined)).not.toThrow();
	});

	it("reads TypeORM metadata for an entity class once and reuses the paths on later calls", () => {
		const storage = getMetadataArgsStorage();
		const filterRelations = vi.spyOn(storage, "filterRelations");
		const filterEmbeddeds = vi.spyOn(storage, "filterEmbeddeds");

		expect(() => ApiControllerRejectToManyUpdateKeys(RejectToManyCachedPost, { tags: null })).toThrow(expect.objectContaining({ response: expect.objectContaining({ details: { propertyName: "tags", reason: "to-many reference is not allowed on update" } }) }));
		expect(filterRelations).toHaveBeenCalled();

		filterRelations.mockClear();
		filterEmbeddeds.mockClear();

		expect(() => ApiControllerRejectToManyUpdateKeys(RejectToManyCachedPost, { tags: null })).toThrow(expect.objectContaining({ response: expect.objectContaining({ details: { propertyName: "tags", reason: "to-many reference is not allowed on update" } }) }));
		expect(() => ApiControllerRejectToManyUpdateKeys(RejectToManyCachedPost, { id: "post-1" })).not.toThrow();
		expect(filterRelations).not.toHaveBeenCalled();
		expect(filterEmbeddeds).not.toHaveBeenCalled();
	});

	it("reads TypeORM metadata again when a child entity registers after the paths were cached", () => {
		expect(() => ApiControllerRejectToManyUpdateKeys(RejectToManyLateDetail, { lateTags: null })).not.toThrow();

		@ChildEntity("LATE")
		class RejectToManyLateCard extends RejectToManyLateDetail {
			@JoinTable({ name: "reject_to_many_late_card_tags" })
			@ManyToMany(() => RejectToManyTag)
			public lateTags?: Array<RejectToManyTag>;
		}

		expect(RejectToManyLateCard.name).toBe("RejectToManyLateCard");
		expect(() => ApiControllerRejectToManyUpdateKeys(RejectToManyLateDetail, { lateTags: null })).toThrow(expect.objectContaining({ response: expect.objectContaining({ details: { propertyName: "lateTags", reason: "to-many reference is not allowed on update" } }) }));
	});

	const expectRejected = (entity: Parameters<typeof ApiControllerRejectToManyUpdateKeys>[0], body: Record<string, unknown>, propertyName: string): void => {
		expect(() => ApiControllerRejectToManyUpdateKeys(entity, body)).toThrow(expect.objectContaining({ response: expect.objectContaining({ details: { propertyName, reason: "to-many reference is not allowed on update" } }) }));
	};

	it("reads TypeORM metadata again when a late child entity reaches a to-many only through an embedded column", () => {
		const body: Record<string, unknown> = { meta: { embTags: null } };

		expect(() => ApiControllerRejectToManyUpdateKeys(RejectToManyLateEmbeddedDetail, body)).not.toThrow();

		@ChildEntity("LATE_EMBEDDED")
		class RejectToManyLateEmbeddedCard extends RejectToManyLateEmbeddedDetail {
			@Column(() => RejectToManyLateMeta)
			public meta?: RejectToManyLateMeta;
		}

		expect(RejectToManyLateEmbeddedCard.name).toBe("RejectToManyLateEmbeddedCard");
		expectRejected(RejectToManyLateEmbeddedDetail, body, "meta.embTags");
	});

	it("reads TypeORM metadata again when only a table registers", () => {
		const body: Record<string, unknown> = { lateTags: null };

		expect(() => ApiControllerRejectToManyUpdateKeys(RejectToManyLateTableDetail, body)).not.toThrow();

		ChildEntity("LATE_TABLE")(RejectToManyLateTableCard);

		expectRejected(RejectToManyLateTableDetail, body, "lateTags");
	});

	it("reads TypeORM metadata again when only a relation registers", () => {
		const body: Record<string, unknown> = { lateTags: null };

		expect(() => ApiControllerRejectToManyUpdateKeys(RejectToManyLateRelationPost, body)).not.toThrow();

		ManyToMany(() => RejectToManyTag)(RejectToManyLateRelationPost.prototype, "lateTags");

		expectRejected(RejectToManyLateRelationPost, body, "lateTags");
	});

	it("reads TypeORM metadata again when only an embedded column registers", () => {
		const body: Record<string, unknown> = { meta: { embTags: null } };

		expect(() => ApiControllerRejectToManyUpdateKeys(RejectToManyLateEmbeddedPost, body)).not.toThrow();

		Column(() => RejectToManyLateMeta)(RejectToManyLateEmbeddedPost.prototype, "meta");

		expectRejected(RejectToManyLateEmbeddedPost, body, "meta.embTags");
	});
});
