import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import type { TSwaggerSchemaObject } from "@type/swagger";
import type { EntityManager } from "typeorm";

import { HttpStatus } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../src/index";
import { E2eValidationPipe } from "./app/validation-pipe";
import { E2eHydrationNoteEntity, E2eHydrationNoteService, E2eHydrationOwnerEntity, E2eHydrationOwnerService, E2eHydrationPostController, E2eHydrationPostEntity, E2eHydrationPostService, E2eHydrationTagEntity, E2eHydrationTagService } from "./to-many-relation-request";

const NOTE_ATTACHED_FIRST: string = "11111111-1111-4111-8111-111111111111";
const NOTE_ATTACHED_SECOND: string = "11111111-1111-4111-8111-111111111112";
const NOTE_FREE: string = "11111111-1111-4111-8111-111111111113";
const OWNER: string = "22222222-2222-4222-8222-222222222221";
const POST: string = "33333333-3333-4333-8333-333333333331";
const TAG_A: string = "44444444-4444-4444-8444-444444444441";
const TAG_B: string = "44444444-4444-4444-8444-444444444442";
const TAG_C: string = "44444444-4444-4444-8444-444444444443";

describe("To-many request relations (E2E)", () => {
	let app: INestApplication | undefined;
	let document: OpenAPIObject;
	let fastify: { inject: (options: { method: string; payload?: object; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };
	let manager: EntityManager;

	const readStoredPost = async (id: string): Promise<{ notes: Array<string>; owner: null | string; tags: Array<string>; title: string }> => {
		const post: E2eHydrationPostEntity = await manager.findOneOrFail(E2eHydrationPostEntity, { relations: { notes: true, owner: true, tags: true }, where: { id } });

		return {
			notes: (post.notes ?? []).map(({ id: noteId }: E2eHydrationNoteEntity): string => noteId).toSorted(),
			owner: post.owner?.id ?? null,
			tags: (post.tags ?? []).map(({ id: tagId }: E2eHydrationTagEntity): string => tagId).toSorted(),
			title: post.title,
		};
	};

	const STORED_POST = { notes: [NOTE_ATTACHED_FIRST, NOTE_ATTACHED_SECOND], owner: null, tags: [TAG_A, TAG_B], title: "stored" };

	beforeAll(async () => {
		const moduleReference = await Test.createTestingModule({
			controllers: [E2eHydrationPostController],
			imports: [
				TypeOrmModule.forRoot({
					database: ":memory:",
					dropSchema: true,
					entities: [E2eHydrationNoteEntity, E2eHydrationOwnerEntity, E2eHydrationPostEntity, E2eHydrationTagEntity],
					logging: false,
					synchronize: true,
					type: "better-sqlite3",
				}),
				TypeOrmModule.forFeature([E2eHydrationNoteEntity, E2eHydrationOwnerEntity, E2eHydrationPostEntity, E2eHydrationTagEntity]),
				ApiAuthorizationModule.forRoot(),
				ApiSubscriberModule,
			],
			providers: [{ provide: APP_PIPE, useClass: E2eValidationPipe }, E2eHydrationNoteService, E2eHydrationOwnerService, E2eHydrationPostService, E2eHydrationTagService],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
		fastify = app.getHttpAdapter().getInstance();
		manager = app.get(E2eHydrationPostService).repository.manager;
	});

	beforeEach(async () => {
		await manager.query("DELETE FROM e2e_hydration_post_tags");
		await manager.query("DELETE FROM e2e_hydration_notes");
		await manager.query("DELETE FROM e2e_hydration_posts");

		await manager.save(E2eHydrationOwnerEntity, { id: OWNER });

		const tags: Array<E2eHydrationTagEntity> = await manager.save(E2eHydrationTagEntity, [{ id: TAG_A }, { id: TAG_B }, { id: TAG_C }]);
		const post: E2eHydrationPostEntity = await manager.save(E2eHydrationPostEntity, { id: POST, tags: [tags[0] as E2eHydrationTagEntity, tags[1] as E2eHydrationTagEntity], title: "stored" });

		await manager.save(E2eHydrationNoteEntity, [{ id: NOTE_ATTACHED_FIRST, post }, { id: NOTE_ATTACHED_SECOND, post }, { id: NOTE_FREE }]);
	});

	afterAll(async () => {
		await app?.close();
	});

	describe("CREATE", () => {
		it("binds a ManyToMany reference and returns it as an array", async () => {
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

	describe.each([
		["PATCH", { title: "changed" }],
		["PUT", { title: "changed" }],
	])("%s", (method: string, base: { title: string }) => {
		it.each([
			["ManyToMany", { tags: TAG_C }],
			["OneToMany", { notes: NOTE_FREE }],
		])("rejects a %s reference before writing anything", async (_name: string, reference: object) => {
			const response = await fastify.inject({ method, payload: { ...base, ...reference }, url: `/hydration-posts/${POST}` });

			expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
			expect((response.json() as { message: string }).message).toContain("INVALID_REFERENCE");
			expect(await readStoredPost(POST)).toEqual(STORED_POST);
		});

		it("does not touch stored to-many rows when the body has no to-many reference", async () => {
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

		for (const relationName of ["notes", "tags"]) {
			expect(properties[relationName]?.type).toBe("string");
			expect(properties[relationName]?.format).toBe("uuid");
		}
	});
});
