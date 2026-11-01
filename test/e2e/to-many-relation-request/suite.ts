import type { INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import type { TSwaggerSchemaObject } from "@type/swagger";
import type { DataSourceOptions, EntityManager } from "typeorm";

import { HttpStatus } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../../src/index";
import { E2eValidationPipe } from "../app/validation-pipe";

import { E2eHydrationDetailController, E2eHydrationObservedPostController, E2eHydrationOrderedPostController, E2eHydrationPostController, E2eHydrationUnhydratedPostController, HYDRATION_CUSTOM_REFUSED_TITLE, HYDRATION_CUSTOM_VALIDATOR_CALLS, HYDRATION_ORDERED_VALIDATOR_CALLS } from "./controller";
import { E2eHydrationAttachmentEntity, E2eHydrationBankDetailEntity, E2eHydrationCardDetailEntity, E2eHydrationDetailEntity, E2eHydrationNoteEntity, E2eHydrationOwnerEntity, E2eHydrationPostEntity, E2eHydrationTagEntity } from "./entity";
import { E2eHydrationAttachmentService, E2eHydrationDetailService, E2eHydrationNoteService, E2eHydrationOwnerService, E2eHydrationPostService, E2eHydrationTagService } from "./service";
import { E2eHydrationPostRouteSubscriber, HYDRATION_REPLACED_BODY_TITLE } from "./subscriber";

const ATTACHMENT: string = "55555555-5555-4555-8555-555555555551";
const BANK_DETAIL: string = "77777777-7777-4777-8777-777777777772";
const CARD_DETAIL: string = "77777777-7777-4777-8777-777777777771";
const MISSING: string = "66666666-6666-4666-8666-666666666661";
const NOTE_ATTACHED_FIRST: string = "11111111-1111-4111-8111-111111111111";
const NOTE_ATTACHED_SECOND: string = "11111111-1111-4111-8111-111111111112";
const NOTE_FREE: string = "11111111-1111-4111-8111-111111111113";
const OWNER: string = "22222222-2222-4222-8222-222222222221";
const POST: string = "33333333-3333-4333-8333-333333333331";
const TAG_A: string = "44444444-4444-4444-8444-444444444441";
const TAG_B: string = "44444444-4444-4444-8444-444444444442";
const TAG_C: string = "44444444-4444-4444-8444-444444444443";
const ENTITIES: Array<Function> = [E2eHydrationAttachmentEntity, E2eHydrationBankDetailEntity, E2eHydrationCardDetailEntity, E2eHydrationDetailEntity, E2eHydrationNoteEntity, E2eHydrationOwnerEntity, E2eHydrationPostEntity, E2eHydrationTagEntity];
const STORED_DETAILS: IStoredDetails = { bank: { bankTags: [TAG_A], label: "bank", note: "stored" }, card: { cardTags: [TAG_A, TAG_B], label: "card" } };
const STORED_POST: IStoredPost = { attachments: [ATTACHMENT], extras: [TAG_A], metaLabel: "stored", notes: [NOTE_ATTACHED_FIRST, NOTE_ATTACHED_SECOND], owner: null, profile: null, tags: [TAG_A, TAG_B], title: "stored" };

interface IE2eHydrationSuiteOptions {
	createDataSourceOptions: () => Promise<DataSourceOptions>;
	stop?: () => Promise<void>;
}

interface IStoredDetails {
	bank: { bankTags: Array<string>; label: string; note: null | string };
	card: { cardTags: Array<string>; label: string };
}

interface IStoredPost {
	attachments: Array<string>;
	extras: Array<string>;
	metaLabel: null | string;
	notes: Array<string>;
	owner: null | string;
	profile: null | string;
	tags: Array<string>;
	title: string;
}

/**
 * Registers the to-many request relation suite for one database.
 * @param {string} name - Database name used in the suite title.
 * @param {IE2eHydrationSuiteOptions} options - Database options.
 */
export function describeHydrationSuite(name: string, options: IE2eHydrationSuiteOptions): void {
	describe(`To-many request relations on ${name} (E2E)`, () => {
		let app: INestApplication | undefined;
		let document: OpenAPIObject;
		let fastify: { inject: (request: { method: string; payload?: object; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };
		let manager: EntityManager;

		const readStoredPost = async (id: string): Promise<IStoredPost> => {
			const post: E2eHydrationPostEntity = await manager.findOneOrFail(E2eHydrationPostEntity, { relations: { attachments: true, meta: { extras: true }, notes: true, owner: true, profile: true, tags: true }, where: { id } });
			const ids = (rows: Array<{ id: string }> | undefined): Array<string> => (rows ?? []).map(({ id: rowId }: { id: string }): string => rowId).toSorted();

			return { attachments: ids(post.attachments), extras: ids(post.meta?.extras), metaLabel: post.meta?.label ?? null, notes: ids(post.notes), owner: post.owner?.id ?? null, profile: post.profile?.id ?? null, tags: ids(post.tags), title: post.title };
		};

		// TypeORM can neither save nor load a ManyToMany inside an embedded column of a child entity, so bankMeta.bankExtras is not read back.
		const readStoredDetails = async (): Promise<IStoredDetails> => {
			const card: E2eHydrationCardDetailEntity = await manager.findOneOrFail(E2eHydrationCardDetailEntity, { relations: { cardTags: true }, where: { id: CARD_DETAIL } });
			const bank: E2eHydrationBankDetailEntity = await manager.findOneOrFail(E2eHydrationBankDetailEntity, { relations: { bankTags: true }, where: { id: BANK_DETAIL } });
			const ids = (rows: Array<{ id: string }> | undefined): Array<string> => (rows ?? []).map(({ id: rowId }: { id: string }): string => rowId).toSorted();

			return { bank: { bankTags: ids(bank.bankTags), label: bank.label, note: bank.bankMeta?.note ?? null }, card: { cardTags: ids(card.cardTags), label: card.label } };
		};

		beforeAll(async () => {
			const moduleReference = await Test.createTestingModule({
				controllers: [E2eHydrationDetailController, E2eHydrationObservedPostController, E2eHydrationOrderedPostController, E2eHydrationPostController, E2eHydrationUnhydratedPostController],
				imports: [TypeOrmModule.forRoot({ ...(await options.createDataSourceOptions()), dropSchema: true, entities: ENTITIES, logging: false, synchronize: true } as DataSourceOptions), TypeOrmModule.forFeature(ENTITIES), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
				providers: [{ provide: APP_PIPE, useClass: E2eValidationPipe }, E2eHydrationAttachmentService, E2eHydrationDetailService, E2eHydrationNoteService, E2eHydrationOwnerService, E2eHydrationPostRouteSubscriber, E2eHydrationPostService, E2eHydrationTagService],
			}).compile();

			app = moduleReference.createNestApplication(new FastifyAdapter());
			await app.init();
			document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
			fastify = app.getHttpAdapter().getInstance();
			manager = app.get(E2eHydrationPostService).repository.manager;
		}, 120_000);

		beforeEach(async () => {
			HYDRATION_CUSTOM_VALIDATOR_CALLS.length = 0;
			HYDRATION_ORDERED_VALIDATOR_CALLS.length = 0;
			await manager.query("DELETE FROM e2e_hydration_bank_extras");
			await manager.query("DELETE FROM e2e_hydration_bank_tags");
			await manager.query("DELETE FROM e2e_hydration_card_tags");
			await manager.query("DELETE FROM e2e_hydration_details");
			await manager.query("DELETE FROM e2e_hydration_post_extras");
			await manager.query("DELETE FROM e2e_hydration_post_tags");
			await manager.query("DELETE FROM e2e_hydration_attachments");
			await manager.query("DELETE FROM e2e_hydration_notes");
			await manager.query("DELETE FROM e2e_hydration_posts");
			await manager.query("DELETE FROM e2e_hydration_tags");
			await manager.query("DELETE FROM e2e_hydration_owners");

			await manager.save(E2eHydrationOwnerEntity, { id: OWNER });

			const tags: Array<E2eHydrationTagEntity> = await manager.save(E2eHydrationTagEntity, [{ id: TAG_A }, { id: TAG_B }, { id: TAG_C }]);
			const post: E2eHydrationPostEntity = await manager.save(E2eHydrationPostEntity, { id: POST, meta: { extras: [tags[0] as E2eHydrationTagEntity], label: "stored" }, tags: [tags[0] as E2eHydrationTagEntity, tags[1] as E2eHydrationTagEntity], title: "stored" });

			await manager.save(E2eHydrationAttachmentEntity, { id: ATTACHMENT, post });
			await manager.save(E2eHydrationNoteEntity, [{ id: NOTE_ATTACHED_FIRST, post }, { id: NOTE_ATTACHED_SECOND, post }, { id: NOTE_FREE }]);
			await manager.save(E2eHydrationCardDetailEntity, { cardTags: [tags[0] as E2eHydrationTagEntity, tags[1] as E2eHydrationTagEntity], id: CARD_DETAIL, label: "card" });
			await manager.save(E2eHydrationBankDetailEntity, { bankMeta: { note: "stored" }, bankTags: [tags[0] as E2eHydrationTagEntity], id: BANK_DETAIL, label: "bank" });
		});

		afterAll(async () => {
			await app?.close();
			await options.stop?.();
		});

		describe("CREATE", () => {
			it("binds a ManyToMany reference declared on a parent class and returns it as an array", async () => {
				const response = await fastify.inject({ method: "POST", payload: { tags: TAG_C, title: "created" }, url: "/hydration-posts" });
				const body = response.json() as { id: string; tags: unknown };

				expect(response.statusCode).toBe(HttpStatus.CREATED);
				expect(body.tags).toEqual([{ id: TAG_C }]);
				expect((await readStoredPost(body.id)).tags).toEqual([TAG_C]);
			});

			it("binds a OneToMany reference and returns it as an array", async () => {
				const response = await fastify.inject({ method: "POST", payload: { notes: NOTE_FREE, title: "created" }, url: "/hydration-posts" });
				const body = response.json() as { id: string; notes: unknown };

				expect(response.statusCode).toBe(HttpStatus.CREATED);
				expect(body.notes).toEqual([{ id: NOTE_FREE }]);
				expect((await readStoredPost(body.id)).notes).toEqual([NOTE_FREE]);
			});

			it("keeps hydrating a to-one reference into a single entity", async () => {
				const response = await fastify.inject({ method: "POST", payload: { owner: OWNER, title: "created" }, url: "/hydration-posts" });
				const body = response.json() as { id: string; owner: unknown };

				expect(response.statusCode).toBe(HttpStatus.CREATED);
				expect(body.owner).toEqual({ id: OWNER });
				expect((await readStoredPost(body.id)).owner).toBe(OWNER);
			});
		});

		describe.each(["PATCH", "PUT"])("%s", (method: string) => {
			const base: { title: string } = { title: "changed" };

			it.each([
				["a ManyToMany reference", { tags: TAG_C }, "tags"],
				["a OneToMany reference", { notes: NOTE_FREE }, "notes"],
				["a missing ManyToMany reference", { tags: MISSING }, "tags"],
				["null for a ManyToMany relation", { tags: null }, "tags"],
				["null for a OneToMany relation with a nullable key", { notes: null }, "notes"],
				["null for a OneToMany relation with a required key", { attachments: null }, "attachments"],
				["a to-many reference after a missing to-one reference", { owner: MISSING, tags: TAG_C }, "tags"],
			])("rejects %s before loading or writing anything", async (_name: string, reference: object, propertyName: string) => {
				const response = await fastify.inject({ method, payload: { ...base, ...reference }, url: `/hydration-posts/${POST}` });
				const body = response.json() as { details?: unknown; message: string };

				expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
				expect(body.message).toContain("INVALID_REFERENCE");
				expect(body.details).toEqual({ propertyName, reason: "to-many reference is not allowed on update" });
				expect(await readStoredPost(POST)).toEqual(STORED_POST);
			});

			it("does not touch stored to-many rows when the body has no to-many key", async () => {
				const response = await fastify.inject({ method, payload: base, url: `/hydration-posts/${POST}` });

				expect(response.statusCode).toBe(HttpStatus.OK);
				expect(await readStoredPost(POST)).toEqual({ ...STORED_POST, title: "changed" });
			});

			it("accepts and writes an owning OneToOne reference", async () => {
				const response = await fastify.inject({ method, payload: { ...base, profile: OWNER }, url: `/hydration-posts/${POST}` });

				expect(response.statusCode).toBe(HttpStatus.OK);
				expect(await readStoredPost(POST)).toEqual({ ...STORED_POST, profile: OWNER, title: "changed" });
			});

			it.each([
				["a ManyToMany array inside an embedded", { extras: [{ id: TAG_C }] }],
				["null for a ManyToMany inside an embedded", { extras: null }],
			])("rejects %s by its dotted path", async (_name: string, meta: object) => {
				const response = await fastify.inject({ method, payload: { ...base, meta }, url: `/hydration-unhydrated-posts/${POST}` });
				const body = response.json() as { details?: unknown };

				expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
				expect(body.details).toEqual({ propertyName: "meta.extras", reason: "to-many reference is not allowed on update" });
				expect(await readStoredPost(POST)).toEqual(STORED_POST);
			});

			it("writes an embedded column next to the embedded to-many", async () => {
				const response = await fastify.inject({ method, payload: { ...base, meta: { label: "changed" } }, url: `/hydration-unhydrated-posts/${POST}` });

				expect(response.statusCode).toBe(HttpStatus.OK);
				expect(await readStoredPost(POST)).toEqual({ ...STORED_POST, metaLabel: "changed", title: "changed" });
			});

			it("rejects a to-many key before body transformers and validators run", async () => {
				const response = await fastify.inject({ method, payload: { ...base, tags: TAG_C }, url: `/hydration-ordered-posts/${POST}` });

				expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
				expect((response.json() as { details?: unknown }).details).toEqual({ propertyName: "tags", reason: "to-many reference is not allowed on update" });
				expect(HYDRATION_ORDERED_VALIDATOR_CALLS).toEqual([]);
				expect(await readStoredPost(POST)).toEqual(STORED_POST);
			});

			it("runs body transformers and validators when no to-many key is present", async () => {
				const response = await fastify.inject({ method, payload: base, url: `/hydration-ordered-posts/${POST}` });

				expect(response.statusCode).toBe(HttpStatus.OK);
				expect(HYDRATION_ORDERED_VALIDATOR_CALLS).toHaveLength(1);
				expect(await readStoredPost(POST)).toEqual({ ...STORED_POST, title: "changed" });
			});

			it("keeps hydrating a to-one reference", async () => {
				const response = await fastify.inject({ method, payload: { ...base, owner: OWNER }, url: `/hydration-posts/${POST}` });

				expect(response.statusCode).toBe(HttpStatus.OK);
				expect((response.json() as { owner: unknown }).owner).toEqual({ id: OWNER });
				expect(await readStoredPost(POST)).toEqual({ ...STORED_POST, owner: OWNER, title: "changed" });
			});
		});

		it.each([
			["PATCH", "a reference excluded by include: false", { tags: TAG_C }, "tags"],
			["PATCH", "null excluded by include: false", { tags: null }, "tags"],
			["PATCH", "a reference absent from include", { notes: NOTE_FREE }, "notes"],
			["PATCH", "null absent from include", { notes: null }, "notes"],
			["PUT", "a reference on a route without relations.request", { tags: TAG_C }, "tags"],
			["PUT", "null on a route without relations.request", { tags: null }, "tags"],
			["PUT", "null for a required key on a route without relations.request", { attachments: null }, "attachments"],
		])("%s rejects %s before writing anything", async (method: string, _name: string, reference: object, propertyName: string) => {
			const response = await fastify.inject({ method, payload: { title: "changed", ...reference }, url: `/hydration-unhydrated-posts/${POST}` });
			const body = response.json() as { details?: unknown; message: string };

			expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
			expect(body.message).toContain("INVALID_REFERENCE");
			expect(body.details).toEqual({ propertyName, reason: "to-many reference is not allowed on update" });
			expect(await readStoredPost(POST)).toEqual(STORED_POST);
		});

		it.each(["PATCH", "PUT"])("%s without relations.request hydration still writes columns", async (method: string) => {
			const response = await fastify.inject({ method, payload: { title: "changed" }, url: `/hydration-unhydrated-posts/${POST}` });

			expect(response.statusCode).toBe(HttpStatus.OK);
			expect(await readStoredPost(POST)).toEqual({ ...STORED_POST, title: "changed" });
		});

		it("rejects a to-many key that a BEFORE subscriber adds to the body", async () => {
			const response = await fastify.inject({ method: "PATCH", payload: { title: `subscriber adds tags ${TAG_C}` }, url: `/hydration-unhydrated-posts/${POST}` });

			expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
			expect((response.json() as { details?: unknown }).details).toEqual({ propertyName: "tags", reason: "to-many reference is not allowed on update" });
			expect(await readStoredPost(POST)).toEqual(STORED_POST);
		});

		it("accepts a body whose to-many key a BEFORE subscriber removes", async () => {
			const response = await fastify.inject({ method: "PATCH", payload: { tags: TAG_C, title: "subscriber drops tags" }, url: `/hydration-unhydrated-posts/${POST}` });

			expect(response.statusCode).toBe(HttpStatus.OK);
			expect(await readStoredPost(POST)).toEqual({ ...STORED_POST, title: "subscriber drops tags" });
		});

		describe.each(["PATCH", "PUT"])("%s on a table inheritance root without a generated read response", (method: string) => {
			it.each([
				["a CARD ManyToMany array", CARD_DETAIL, { cardTags: [{ id: TAG_C }] }, "cardTags"],
				["a CARD ManyToMany reference", CARD_DETAIL, { cardTags: TAG_C }, "cardTags"],
				["null for a CARD ManyToMany", CARD_DETAIL, { cardTags: null }, "cardTags"],
				["a BANK ManyToMany array", BANK_DETAIL, { bankTags: [{ id: TAG_C }] }, "bankTags"],
				["null for a BANK ManyToMany", BANK_DETAIL, { bankTags: null }, "bankTags"],
				["a BANK ManyToMany array inside an embedded", BANK_DETAIL, { bankMeta: { bankExtras: [{ id: TAG_C }] } }, "bankMeta.bankExtras"],
				["null for a BANK ManyToMany inside an embedded", BANK_DETAIL, { bankMeta: { bankExtras: null } }, "bankMeta.bankExtras"],
			])("rejects %s declared only on a child", async (_name: string, id: string, reference: object, propertyName: string) => {
				const response = await fastify.inject({ method, payload: { label: "changed", ...reference }, url: `/hydration-details/${id}` });
				const body = response.json() as { details?: unknown; message: string };

				expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
				expect(body.message).toContain("INVALID_REFERENCE");
				expect(body.details).toEqual({ propertyName, reason: "to-many reference is not allowed on update" });
				expect(await readStoredDetails()).toEqual(STORED_DETAILS);
			});

			it("writes a root column", async () => {
				const response = await fastify.inject({ method, payload: { label: "changed" }, url: `/hydration-details/${CARD_DETAIL}` });

				expect(response.statusCode).toBe(HttpStatus.OK);
				expect(await readStoredDetails()).toEqual({ ...STORED_DETAILS, card: { ...STORED_DETAILS.card, label: "changed" } });
			});
		});

		describe.each(["PATCH", "PUT"])("%s on a custom update route that forwards the body", (method: string) => {
			it.each([
				["a ManyToMany reference in the request include", { tags: TAG_C }, "tags"],
				["null for a ManyToMany relation", { tags: null }, "tags"],
				["a OneToMany reference in the request include", { notes: NOTE_FREE }, "notes"],
				["a ManyToMany array inside an embedded", { meta: { extras: [{ id: TAG_C }] } }, "meta.extras"],
			])("rejects %s before the handler runs", async (_name: string, reference: object, propertyName: string) => {
				const response = await fastify.inject({ method, payload: { title: "changed", ...reference }, url: `/hydration-posts/custom/${POST}` });
				const body = response.json() as { details?: unknown; message: string };

				expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
				expect(body.message).toContain("INVALID_REFERENCE");
				expect(body.details).toEqual({ propertyName, reason: "to-many reference is not allowed on update" });
				expect(await readStoredPost(POST)).toEqual(STORED_POST);
			});

			it("runs the handler when no to-many key is present", async () => {
				const response = await fastify.inject({ method, payload: { owner: OWNER, title: "changed" }, url: `/hydration-posts/custom/${POST}` });

				expect(response.statusCode).toBe(HttpStatus.OK);
				expect(await readStoredPost(POST)).toEqual({ ...STORED_POST, owner: OWNER, title: "changed" });
			});
		});

		describe.each(["PATCH", "PUT"])("%s on a custom update route with route subscribers, transformers and validators", (method: string) => {
			it("rejects a to-many key that a BEFORE subscriber adds to the body", async () => {
				const response = await fastify.inject({ method, payload: { title: `subscriber adds tags ${TAG_C}` }, url: `/hydration-observed-posts/${POST}` });

				expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
				expect((response.json() as { details?: unknown }).details).toEqual({ propertyName: "tags", reason: "to-many reference is not allowed on update" });
				expect(HYDRATION_CUSTOM_VALIDATOR_CALLS).toEqual([]);
				expect(await readStoredPost(POST)).toEqual(STORED_POST);
			});

			it("accepts a body whose to-many key a BEFORE subscriber drops", async () => {
				const response = await fastify.inject({ method, payload: { tags: TAG_C, title: "subscriber drops tags" }, url: `/hydration-observed-posts/${POST}` });

				expect(response.statusCode).toBe(HttpStatus.OK);
				expect(await readStoredPost(POST)).toEqual({ ...STORED_POST, title: "subscriber drops tags" });
			});

			it("accepts a body that a BEFORE subscriber replaces with one without the to-many key", async () => {
				const response = await fastify.inject({ method, payload: { tags: TAG_C, title: "subscriber replaces body" }, url: `/hydration-observed-posts/${POST}` });

				expect(response.statusCode).toBe(HttpStatus.OK);
				expect(await readStoredPost(POST)).toEqual({ ...STORED_POST, title: HYDRATION_REPLACED_BODY_TITLE });
			});

			it("rejects a to-many key before body transformers and validators run", async () => {
				const response = await fastify.inject({ method, payload: { tags: TAG_C, title: HYDRATION_CUSTOM_REFUSED_TITLE }, url: `/hydration-observed-posts/${POST}` });
				const body = response.json() as { details?: unknown; message: string };

				expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
				expect(body.message).toContain("INVALID_REFERENCE");
				expect(body.details).toEqual({ propertyName: "tags", reason: "to-many reference is not allowed on update" });
				expect(HYDRATION_CUSTOM_VALIDATOR_CALLS).toEqual([]);
				expect(await readStoredPost(POST)).toEqual(STORED_POST);
			});

			it("runs body validators when no to-many key is present", async () => {
				const refused = await fastify.inject({ method, payload: { title: HYDRATION_CUSTOM_REFUSED_TITLE }, url: `/hydration-observed-posts/${POST}` });

				expect(refused.statusCode).toBe(HttpStatus.BAD_REQUEST);
				expect((refused.json() as { message: string }).message).not.toContain("INVALID_REFERENCE");
				expect(HYDRATION_CUSTOM_VALIDATOR_CALLS).toHaveLength(1);
				expect(await readStoredPost(POST)).toEqual(STORED_POST);

				const accepted = await fastify.inject({ method, payload: { title: "changed" }, url: `/hydration-observed-posts/${POST}` });

				expect(accepted.statusCode).toBe(HttpStatus.OK);
				expect(HYDRATION_CUSTOM_VALIDATOR_CALLS).toHaveLength(2);
				expect(await readStoredPost(POST)).toEqual({ ...STORED_POST, title: "changed" });
			});
		});

		it("hands a custom route handler a to-many reference as an array", async () => {
			const response = await fastify.inject({ method: "POST", payload: { owner: OWNER, tags: TAG_C }, url: "/hydration-posts/custom" });
			const body = response.json() as { owner: { id: string }; tags: Array<{ id: string }> };

			expect(response.statusCode).toBe(HttpStatus.OK);
			expect(body.tags).toEqual([expect.objectContaining({ id: TAG_C })]);
			expect(body.owner).toEqual(expect.objectContaining({ id: OWNER }));
		});

		it("keeps to-many references single UUID properties in the CREATE body", () => {
			const properties = (document.components?.schemas?.E2eHydrationPostCreateBodyDTO as TSwaggerSchemaObject).properties as Record<string, TSwaggerSchemaObject>;

			for (const relationName of ["attachments", "notes", "tags"]) {
				expect(properties[relationName]?.type).toBe("string");
				expect(properties[relationName]?.format).toBe("uuid");
			}
		});

		it("leaves no empty schema that nothing references in the components", () => {
			const schemas = (document.components?.schemas ?? {}) as Record<string, TSwaggerSchemaObject>;
			const serialized: string = JSON.stringify({ components: document.components, paths: document.paths });
			const emptyOrphans: Array<string> = Object.keys(schemas).filter((name: string): boolean => Object.keys(schemas[name]?.properties ?? {}).length === 0 && !serialized.includes(`"#/components/schemas/${name}"`));

			expect(emptyOrphans).toEqual([]);
		});

		it.each(["E2eHydrationPostUpdateBodyDTO", "E2eHydrationPostPartialUpdateBodyDTO"])("leaves to-many relations out of %s", (schemaName: string) => {
			const properties = (document.components?.schemas?.[schemaName] as TSwaggerSchemaObject).properties as Record<string, TSwaggerSchemaObject>;

			expect(Object.keys(properties)).toEqual(expect.arrayContaining(["owner", "title"]));
			expect(Object.keys(properties)).not.toEqual(expect.arrayContaining(["attachments"]));
			expect(Object.keys(properties)).not.toEqual(expect.arrayContaining(["notes"]));
			expect(Object.keys(properties)).not.toEqual(expect.arrayContaining(["tags"]));
		});
	});
}
