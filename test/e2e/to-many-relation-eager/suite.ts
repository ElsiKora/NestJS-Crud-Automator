import type { INestApplication } from "@nestjs/common";
import type { DataSourceOptions, EntityManager } from "typeorm";

import { HttpStatus } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../../src/index";
import { E2eValidationPipe } from "../app/validation-pipe";

import { E2eEagerAuthGuard } from "./auth-guard";
import { E2E_EAGER_CONTROLLERS, E2E_EAGER_CURSOR_CONTROLLERS, E2E_EAGER_VARIANTS, type TE2eEagerVariant } from "./controller";
import { E2eEagerAuthorEntity, E2eEagerCommentEntity, E2eEagerPostEntity, E2eEagerTagEntity } from "./entity";
import { E2eEagerPostPolicySubscriber } from "./policy";
import { E2eEagerAuthorService, E2eEagerCommentService, E2eEagerPostService, E2eEagerTagService } from "./service";

const AUTHOR_FIRST: string = "aaaaaaaa-0000-4000-8000-000000000001";
const AUTHOR_SECOND: string = "aaaaaaaa-0000-4000-8000-000000000002";
const COMMENT_FIRST: string = "dddddddd-0000-4000-8000-000000000001";
const COMMENT_SECOND: string = "dddddddd-0000-4000-8000-000000000002";
const COMMENT_FOREIGN: string = "dddddddd-0000-4000-8000-000000000003";
const OWNER: string = "owner-a";
const OWNER_FOREIGN: string = "owner-b";
const POST_FULL: string = "cccccccc-0000-4000-8000-000000000001";
const POST_EMPTY: string = "cccccccc-0000-4000-8000-000000000002";
const POST_FOREIGN: string = "cccccccc-0000-4000-8000-000000000003";
const TAG_FIRST: string = "bbbbbbbb-0000-4000-8000-000000000001";
const TAG_SECOND: string = "bbbbbbbb-0000-4000-8000-000000000002";
const TAG_THIRD: string = "bbbbbbbb-0000-4000-8000-000000000003";
const ENTITIES: Array<Function> = [E2eEagerAuthorEntity, E2eEagerCommentEntity, E2eEagerPostEntity, E2eEagerTagEntity];
const HEADERS: Record<string, string> = { "x-owner-id": OWNER };

type TStoredPost = { author: null | string; comments: Array<string>; tags: Array<string>; title: string };

type TWirePost = { author: unknown; comments: Array<unknown>; id: string; ownerId: string; rank: number; tags: Array<unknown>; title: string };

interface IE2eEagerSuiteOptions {
	createDataSourceOptions: () => Promise<DataSourceOptions>;
	isCursorSupported: boolean;
	stop?: () => Promise<void>;
}

/**
 * Sorts to-many references so assertions do not depend on the unordered relation load.
 * @param {TWirePost} post - Post from the wire.
 * @returns {TWirePost} Post with sorted to-many references.
 */
function sortReferences(post: TWirePost): TWirePost {
	const sort = (references: Array<unknown>): Array<unknown> => references.toSorted((left: unknown, right: unknown): number => JSON.stringify(left).localeCompare(JSON.stringify(right)));

	return { ...post, comments: sort(post.comments), tags: sort(post.tags) };
}

/**
 * Registers the eager relation suite for one database.
 * @param {string} name - Database name used in the suite title.
 * @param {IE2eEagerSuiteOptions} options - Database options and capabilities.
 */
export function describeEagerRelationSuite(name: string, options: IE2eEagerSuiteOptions): void {
	describe(`Eager relations with generated routes on ${name} (E2E)`, () => {
		let app: INestApplication | undefined;
		let fastify: { inject: (request: { headers?: Record<string, string>; method: string; payload?: object; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };
		let manager: EntityManager;

		const readStoredPost = async (id: string): Promise<TStoredPost> => {
			const post: E2eEagerPostEntity = await manager.findOneOrFail(E2eEagerPostEntity, { where: { id } });

			return {
				author: post.author?.id ?? null,
				comments: (post.comments ?? []).map(({ id: commentId }: E2eEagerCommentEntity): string => commentId).toSorted(),
				tags: (post.tags ?? []).map(({ id: tagId }: E2eEagerTagEntity): string => tagId).toSorted(),
				title: post.title,
			};
		};

		beforeAll(async () => {
			const moduleReference = await Test.createTestingModule({
				controllers: [...E2E_EAGER_CONTROLLERS, ...(options.isCursorSupported ? E2E_EAGER_CURSOR_CONTROLLERS : [])],
				imports: [TypeOrmModule.forRoot({ ...(await options.createDataSourceOptions()), dropSchema: true, entities: ENTITIES, logging: false, synchronize: true } as DataSourceOptions), TypeOrmModule.forFeature(ENTITIES), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
				providers: [{ provide: APP_PIPE, useClass: E2eValidationPipe }, E2eEagerAuthGuard, E2eEagerAuthorService, E2eEagerCommentService, E2eEagerPostPolicySubscriber, E2eEagerPostService, E2eEagerTagService],
			}).compile();

			app = moduleReference.createNestApplication(new FastifyAdapter());
			await app.init();
			fastify = app.getHttpAdapter().getInstance();
			manager = app.get(E2eEagerPostService).repository.manager;
		}, 120_000);

		beforeEach(async () => {
			await manager.query("DELETE FROM e2e_eager_post_tags");
			await manager.query("DELETE FROM e2e_eager_comments");
			await manager.query("DELETE FROM e2e_eager_posts");
			await manager.query("DELETE FROM e2e_eager_tags");
			await manager.query("DELETE FROM e2e_eager_authors");

			const [authorFirst, authorSecond] = await manager.save(E2eEagerAuthorEntity, [
				{ id: AUTHOR_FIRST, name: "First" },
				{ id: AUTHOR_SECOND, name: "Second" },
			]);
			const [tagFirst, tagSecond, tagThird] = await manager.save(E2eEagerTagEntity, [
				{ id: TAG_FIRST, label: "First" },
				{ id: TAG_SECOND, label: "Second" },
				{ id: TAG_THIRD, label: "Third" },
			]);
			const postFull: E2eEagerPostEntity = await manager.save(E2eEagerPostEntity, { author: authorFirst, id: POST_FULL, ownerId: OWNER, rank: 1, tags: [tagFirst as E2eEagerTagEntity, tagSecond as E2eEagerTagEntity], title: "Full" });

			await manager.save(E2eEagerPostEntity, { id: POST_EMPTY, ownerId: OWNER, rank: 2, title: "Empty" });

			const postForeign: E2eEagerPostEntity = await manager.save(E2eEagerPostEntity, { author: authorSecond, id: POST_FOREIGN, ownerId: OWNER_FOREIGN, rank: 3, tags: [tagThird as E2eEagerTagEntity], title: "Foreign" });

			await manager.save(E2eEagerCommentEntity, [
				{ body: "First", id: COMMENT_FIRST, post: postFull },
				{ body: "Second", id: COMMENT_SECOND, post: postFull },
				{ body: "Foreign", id: COMMENT_FOREIGN, post: postForeign },
			]);
		});

		afterAll(async () => {
			await app?.close();
			await options.stop?.();
		});

		describe.each([
			["", false],
			["scoped-", true],
		])("%sroutes", (prefix: string, isScoped: boolean) => {
			describe.each(E2E_EAGER_VARIANTS)("%s relations", (variant: TE2eEagerVariant) => {
				const base: string = `/eager/${prefix}${variant}`;
				const reference = (id: string): unknown => (variant === "scalar" ? id : { id });
				const expectedPost = (id: string, post: { author: null | string; comments: Array<string>; ownerId: string; rank: number; tags: Array<string>; title: string }): TWirePost => sortReferences({ author: post.author === null ? null : reference(post.author), comments: post.comments.map(reference), id, ownerId: post.ownerId, rank: post.rank, tags: post.tags.map(reference), title: post.title });
				const fullPost: TWirePost = expectedPost(POST_FULL, { author: AUTHOR_FIRST, comments: [COMMENT_FIRST, COMMENT_SECOND], ownerId: OWNER, rank: 1, tags: [TAG_FIRST, TAG_SECOND], title: "Full" });
				const listedPosts: Array<TWirePost> = [fullPost, expectedPost(POST_EMPTY, { author: null, comments: [], ownerId: OWNER, rank: 2, tags: [], title: "Empty" }), ...(isScoped ? [] : [expectedPost(POST_FOREIGN, { author: AUTHOR_SECOND, comments: [COMMENT_FOREIGN], ownerId: OWNER_FOREIGN, rank: 3, tags: [TAG_THIRD], title: "Foreign" })])];
				const storedFullPost: TStoredPost = { author: AUTHOR_FIRST, comments: [COMMENT_FIRST, COMMENT_SECOND], tags: [TAG_FIRST, TAG_SECOND], title: "Full" };

				it("GET returns eager relations as references", async () => {
					const response = await fastify.inject({ headers: HEADERS, method: "GET", url: `${base}/${POST_FULL}` });

					expect(response.statusCode).toBe(HttpStatus.OK);
					expect(sortReferences(response.json() as TWirePost)).toEqual(fullPost);
				});

				it("PAGE GET_LIST returns eager relations as references", async () => {
					const response = await fastify.inject({ headers: HEADERS, method: "GET", url: `${base}?limit=10&page=1&orderBy=rank&orderDirection=ASC` });
					const body = response.json() as { items: Array<TWirePost>; totalCount: number };

					expect(response.statusCode).toBe(HttpStatus.OK);
					expect(body.totalCount).toBe(listedPosts.length);
					expect(body.items.map(sortReferences)).toEqual(listedPosts);
				});

				it.runIf(options.isCursorSupported)("CURSOR GET_LIST returns eager relations as references", async () => {
					const response = await fastify.inject({ headers: HEADERS, method: "GET", url: `${base}-cursor?limit=10` });
					const body = response.json() as { items: Array<TWirePost> };

					expect(response.statusCode).toBe(HttpStatus.OK);
					expect(Object.keys(body).toSorted()).toEqual(["items", "nextCursor", "previousCursor"]);
					expect(body.items.map(sortReferences)).toEqual(listedPosts);
				});

				it("CREATE returns eager relations of the created row", async () => {
					const requestRelations: object = variant === "include" ? { author: AUTHOR_SECOND, tags: TAG_THIRD } : {};
					const response = await fastify.inject({ headers: HEADERS, method: "POST", payload: { ownerId: OWNER, rank: 5, title: "Created", ...requestRelations }, url: base });
					const body = response.json() as TWirePost;
					const isBound: boolean = variant === "include";

					expect(response.statusCode).toBe(HttpStatus.CREATED);
					expect(sortReferences(body)).toEqual(expectedPost(body.id, { author: isBound ? AUTHOR_SECOND : null, comments: [], ownerId: OWNER, rank: 5, tags: isBound ? [TAG_THIRD] : [], title: "Created" }));
					expect(await readStoredPost(body.id)).toEqual({ author: isBound ? AUTHOR_SECOND : null, comments: [], tags: isBound ? [TAG_THIRD] : [], title: "Created" });
				});

				it.each([
					["PUT", { ownerId: OWNER, rank: 1, title: "Changed" }],
					["PATCH", { title: "Changed" }],
				])("%s keeps the stored eager to-many rows", async (method: string, payload: object) => {
					const requestRelations: object = variant === "include" ? { author: AUTHOR_SECOND } : {};
					const response = await fastify.inject({ headers: HEADERS, method, payload: { ...payload, ...requestRelations }, url: `${base}/${POST_FULL}` });
					const author: string = variant === "include" ? AUTHOR_SECOND : AUTHOR_FIRST;

					expect(response.statusCode).toBe(HttpStatus.OK);
					expect(sortReferences(response.json() as TWirePost)).toEqual({ ...fullPost, author: reference(author), title: "Changed" });
					expect(await readStoredPost(POST_FULL)).toEqual({ ...storedFullPost, author, title: "Changed" });
				});

				it.runIf(variant === "include")("PATCH rejects an eager to-many reference without writing", async () => {
					const response = await fastify.inject({ headers: HEADERS, method: "PATCH", payload: { tags: TAG_THIRD, title: "Changed" }, url: `${base}/${POST_FULL}` });

					expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
					expect(await readStoredPost(POST_FULL)).toEqual(storedFullPost);
				});

				it.runIf(isScoped)("hides and protects rows outside the owner scope", async () => {
					const read = await fastify.inject({ headers: HEADERS, method: "GET", url: `${base}/${POST_FOREIGN}` });
					const update = await fastify.inject({ headers: HEADERS, method: "PATCH", payload: { title: "Changed" }, url: `${base}/${POST_FOREIGN}` });

					expect(read.statusCode).toBe(HttpStatus.NOT_FOUND);
					expect(update.statusCode).toBe(HttpStatus.NOT_FOUND);
					expect(await readStoredPost(POST_FOREIGN)).toEqual({ author: AUTHOR_SECOND, comments: [COMMENT_FOREIGN], tags: [TAG_THIRD], title: "Foreign" });
				});
			});
		});
	});
}
