import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";

import { HttpStatus } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../src/index";
import { E2eToManyAuthorEntity, E2eToManyCommentEntity, E2eToManyObjectPostController, E2eToManyPostEntity, E2eToManyPostService, E2eToManyScalarPostController, E2eToManyTagEntity } from "./to-many-relation-response";

const AUTHOR: string = "11111111-1111-4111-8111-111111111111";
const COMMENT_FIRST: string = "22222222-2222-4222-8222-222222222221";
const COMMENT_SECOND: string = "22222222-2222-4222-8222-222222222222";
const POST_EMPTY: string = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const POST_FULL: string = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const TAG_FIRST: string = "33333333-3333-4333-8333-333333333331";
const TAG_SECOND: string = "33333333-3333-4333-8333-333333333332";

interface IPostWire {
	author: unknown;
	comments: unknown;
	id: string;
	tags: unknown;
}

describe("To-many response relations (E2E)", () => {
	let app: INestApplication | undefined;
	let fastify: {
		inject: (options: { method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }>;
	};

	const getPost = async (path: string, id: string): Promise<IPostWire> => {
		const response = await fastify.inject({ method: "GET", url: `/${path}/${id}` });

		expect(response.statusCode).toBe(HttpStatus.OK);

		return response.json() as IPostWire;
	};

	const listPosts = async (path: string): Promise<Array<IPostWire>> => {
		const response = await fastify.inject({ method: "GET", url: `/${path}?limit=10&page=1&orderBy=title&orderDirection=ASC` });

		expect(response.statusCode).toBe(HttpStatus.OK);

		return (response.json() as { items: Array<IPostWire> }).items;
	};

	const expectReferences = (actual: unknown, expected: Array<unknown>): void => {
		expect(actual).toHaveLength(expected.length);
		expect(actual).toEqual(expect.arrayContaining(expected));
	};

	beforeAll(async () => {
		const moduleReference = await Test.createTestingModule({
			controllers: [E2eToManyObjectPostController, E2eToManyScalarPostController],
			imports: [
				TypeOrmModule.forRoot({
					database: ":memory:",
					dropSchema: true,
					entities: [E2eToManyAuthorEntity, E2eToManyCommentEntity, E2eToManyPostEntity, E2eToManyTagEntity],
					logging: false,
					synchronize: true,
					type: "better-sqlite3",
				}),
				TypeOrmModule.forFeature([E2eToManyPostEntity]),
				ApiAuthorizationModule.forRoot(),
				ApiSubscriberModule,
			],
			providers: [E2eToManyPostService],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		fastify = app.getHttpAdapter().getInstance();

		const { manager } = app.get(E2eToManyPostService).repository;
		const author: E2eToManyAuthorEntity = await manager.save(E2eToManyAuthorEntity, { id: AUTHOR });
		const tags: Array<E2eToManyTagEntity> = await manager.save(E2eToManyTagEntity, [{ id: TAG_FIRST }, { id: TAG_SECOND }]);
		const post: E2eToManyPostEntity = await manager.save(E2eToManyPostEntity, { author, id: POST_FULL, tags, title: "a-full" });

		await manager.save(E2eToManyPostEntity, { id: POST_EMPTY, title: "b-empty" });
		await manager.save(E2eToManyCommentEntity, [
			{ id: COMMENT_FIRST, post },
			{ id: COMMENT_SECOND, post },
		]);
	});

	afterAll(async () => {
		await app?.close();
	});

	it("projects OneToMany and ManyToMany into object references on GET", async () => {
		const post = await getPost("to-many-object-posts", POST_FULL);

		expectReferences(post.comments, [{ id: COMMENT_FIRST }, { id: COMMENT_SECOND }]);
		expectReferences(post.tags, [{ id: TAG_FIRST }, { id: TAG_SECOND }]);
	});

	it("projects OneToMany and ManyToMany into object references on GET_LIST", async () => {
		const [post] = await listPosts("to-many-object-posts");

		expect(post?.id).toBe(POST_FULL);
		expectReferences(post?.comments, [{ id: COMMENT_FIRST }, { id: COMMENT_SECOND }]);
		expectReferences(post?.tags, [{ id: TAG_FIRST }, { id: TAG_SECOND }]);
	});

	it("projects OneToMany and ManyToMany into scalar references on GET", async () => {
		const post = await getPost("to-many-scalar-posts", POST_FULL);

		expectReferences(post.comments, [COMMENT_FIRST, COMMENT_SECOND]);
		expectReferences(post.tags, [TAG_FIRST, TAG_SECOND]);
	});

	it("projects OneToMany and ManyToMany into scalar references on GET_LIST", async () => {
		const [post] = await listPosts("to-many-scalar-posts");

		expect(post?.id).toBe(POST_FULL);
		expectReferences(post?.comments, [COMMENT_FIRST, COMMENT_SECOND]);
		expectReferences(post?.tags, [TAG_FIRST, TAG_SECOND]);
	});

	it("keeps loaded empty to-many relations as empty arrays", async () => {
		for (const path of ["to-many-object-posts", "to-many-scalar-posts"]) {
			const post = await getPost(path, POST_EMPTY);
			const listed = (await listPosts(path)).find((item: IPostWire): boolean => item.id === POST_EMPTY);

			expect(post.comments).toEqual([]);
			expect(post.tags).toEqual([]);
			expect(listed?.comments).toEqual([]);
			expect(listed?.tags).toEqual([]);
		}
	});

	it("keeps to-one relation references next to to-many relations", async () => {
		expect((await getPost("to-many-object-posts", POST_FULL)).author).toEqual({ id: AUTHOR });
		expect((await getPost("to-many-scalar-posts", POST_FULL)).author).toBe(AUTHOR);
		expect((await getPost("to-many-object-posts", POST_EMPTY)).author).toBeNull();
		expect((await getPost("to-many-scalar-posts", POST_EMPTY)).author).toBeNull();
	});
});
