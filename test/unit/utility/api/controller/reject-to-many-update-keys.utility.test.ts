import "reflect-metadata";

import { ApiControllerRejectToManyUpdateKeys } from "@utility/api/controller/reject-to-many-update-keys.utility";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { ChildEntity, Column, Entity, JoinTable, ManyToMany, ManyToOne, OneToMany, PrimaryGeneratedColumn, type Relation, TableInheritance } from "typeorm";
import { describe, expect, it } from "vitest";

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

describe("ApiControllerRejectToManyUpdateKeys", () => {
	const reject = (body: Record<string, unknown> | undefined): void => ApiControllerRejectToManyUpdateKeys(RejectToManyPost, GenerateEntityInformation<RejectToManyPost>(RejectToManyPost), body as never);

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

	it.each([null, "tag-1"])("rejects a variant's to-many key on a table inheritance root route (%s)", (value: null | string) => {
		const rootMetadata = { ...GenerateEntityInformation<RejectToManyDetail>(RejectToManyDetail), tableInheritance: { variants: [{ discriminatorValue: "CARD", entity: RejectToManyCard, entityMetadata: GenerateEntityInformation(RejectToManyCard) }] } };

		expect(() => ApiControllerRejectToManyUpdateKeys(RejectToManyDetail, rootMetadata as never, { cardTags: value, label: "changed" } as never)).toThrow(expect.objectContaining({ response: expect.objectContaining({ details: { propertyName: "cardTags", reason: "to-many reference is not allowed on update" } }) }));
		expect(() => ApiControllerRejectToManyUpdateKeys(RejectToManyDetail, GenerateEntityInformation<RejectToManyDetail>(RejectToManyDetail), { cardTags: value } as never)).not.toThrow();
	});

	it("accepts columns, to-one references, undefined to-many keys and no body", () => {
		expect(() => reject({ notes: undefined, owner: "tag-1", title: "changed" })).not.toThrow();
		expect(() => reject(undefined)).not.toThrow();
	});
});
