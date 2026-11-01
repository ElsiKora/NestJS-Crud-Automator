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

import { E2eHydrationPostController } from "./controller";
import { E2eHydrationAttachmentEntity, E2eHydrationNoteEntity, E2eHydrationOwnerEntity, E2eHydrationPostEntity, E2eHydrationTagEntity } from "./entity";
import { E2eHydrationAttachmentService, E2eHydrationNoteService, E2eHydrationOwnerService, E2eHydrationPostService, E2eHydrationTagService } from "./service";

const ATTACHMENT: string = "55555555-5555-4555-8555-555555555551";
const MISSING: string = "66666666-6666-4666-8666-666666666661";
const NOTE_ATTACHED_FIRST: string = "11111111-1111-4111-8111-111111111111";
const NOTE_ATTACHED_SECOND: string = "11111111-1111-4111-8111-111111111112";
const NOTE_FREE: string = "11111111-1111-4111-8111-111111111113";
const OWNER: string = "22222222-2222-4222-8222-222222222221";
const POST: string = "33333333-3333-4333-8333-333333333331";
const TAG_A: string = "44444444-4444-4444-8444-444444444441";
const TAG_B: string = "44444444-4444-4444-8444-444444444442";
const TAG_C: string = "44444444-4444-4444-8444-444444444443";
const ENTITIES: Array<Function> = [E2eHydrationAttachmentEntity, E2eHydrationNoteEntity, E2eHydrationOwnerEntity, E2eHydrationPostEntity, E2eHydrationTagEntity];
const STORED_POST: IStoredPost = { attachments: [ATTACHMENT], notes: [NOTE_ATTACHED_FIRST, NOTE_ATTACHED_SECOND], owner: null, tags: [TAG_A, TAG_B], title: "stored" };

interface IE2eHydrationSuiteOptions {
	createDataSourceOptions: () => Promise<DataSourceOptions>;
	stop?: () => Promise<void>;
}

interface IStoredPost {
	attachments: Array<string>;
	notes: Array<string>;
	owner: null | string;
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
			const post: E2eHydrationPostEntity = await manager.findOneOrFail(E2eHydrationPostEntity, { relations: { attachments: true, notes: true, owner: true, tags: true }, where: { id } });
			const ids = (rows: Array<{ id: string }> | undefined): Array<string> => (rows ?? []).map(({ id: rowId }: { id: string }): string => rowId).toSorted();

			return { attachments: ids(post.attachments), notes: ids(post.notes), owner: post.owner?.id ?? null, tags: ids(post.tags), title: post.title };
		};

		beforeAll(async () => {
			const moduleReference = await Test.createTestingModule({
				controllers: [E2eHydrationPostController],
				imports: [TypeOrmModule.forRoot({ ...(await options.createDataSourceOptions()), dropSchema: true, entities: ENTITIES, logging: false, synchronize: true } as DataSourceOptions), TypeOrmModule.forFeature(ENTITIES), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
				providers: [{ provide: APP_PIPE, useClass: E2eValidationPipe }, E2eHydrationAttachmentService, E2eHydrationNoteService, E2eHydrationOwnerService, E2eHydrationPostService, E2eHydrationTagService],
			}).compile();

			app = moduleReference.createNestApplication(new FastifyAdapter());
			await app.init();
			document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
			fastify = app.getHttpAdapter().getInstance();
			manager = app.get(E2eHydrationPostService).repository.manager;
		}, 120_000);

		beforeEach(async () => {
			await manager.query("DELETE FROM e2e_hydration_post_tags");
			await manager.query("DELETE FROM e2e_hydration_attachments");
			await manager.query("DELETE FROM e2e_hydration_notes");
			await manager.query("DELETE FROM e2e_hydration_posts");
			await manager.query("DELETE FROM e2e_hydration_tags");
			await manager.query("DELETE FROM e2e_hydration_owners");

			await manager.save(E2eHydrationOwnerEntity, { id: OWNER });

			const tags: Array<E2eHydrationTagEntity> = await manager.save(E2eHydrationTagEntity, [{ id: TAG_A }, { id: TAG_B }, { id: TAG_C }]);
			const post: E2eHydrationPostEntity = await manager.save(E2eHydrationPostEntity, { id: POST, tags: [tags[0] as E2eHydrationTagEntity, tags[1] as E2eHydrationTagEntity], title: "stored" });

			await manager.save(E2eHydrationAttachmentEntity, { id: ATTACHMENT, post });
			await manager.save(E2eHydrationNoteEntity, [{ id: NOTE_ATTACHED_FIRST, post }, { id: NOTE_ATTACHED_SECOND, post }, { id: NOTE_FREE }]);
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

			it("keeps hydrating a to-one reference", async () => {
				const response = await fastify.inject({ method, payload: { ...base, owner: OWNER }, url: `/hydration-posts/${POST}` });

				expect(response.statusCode).toBe(HttpStatus.OK);
				expect((response.json() as { owner: unknown }).owner).toEqual({ id: OWNER });
				expect(await readStoredPost(POST)).toEqual({ ...STORED_POST, owner: OWNER, title: "changed" });
			});
		});

		it("hands a custom route handler a to-many reference as an array", async () => {
			const response = await fastify.inject({ method: "POST", payload: { owner: OWNER, tags: TAG_C }, url: "/hydration-posts/custom" });
			const body = response.json() as { owner: { id: string }; tags: Array<{ id: string }> };

			expect(response.statusCode).toBe(HttpStatus.OK);
			expect(body.tags).toEqual([expect.objectContaining({ id: TAG_C })]);
			expect(body.owner).toEqual(expect.objectContaining({ id: OWNER }));
		});

		it.each(["E2eHydrationPostEntityCreateBodyDTO", "E2eHydrationPostEntityUpdateBodyDTO", "E2eHydrationPostEntityPartialUpdateBodyDTO"])("keeps to-many references single UUID properties in %s", (schemaName: string) => {
			const properties = (document.components?.schemas?.[schemaName] as TSwaggerSchemaObject).properties as Record<string, TSwaggerSchemaObject>;

			for (const relationName of ["attachments", "notes", "tags"]) {
				expect(properties[relationName]?.type).toBe("string");
				expect(properties[relationName]?.format).toBe("uuid");
			}
		});
	});
}
