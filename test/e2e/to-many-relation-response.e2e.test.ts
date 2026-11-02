import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import type { TSwaggerSchemaObject } from "@type/swagger";

import { HttpStatus } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../src/index";
import { expectEveryComponentToBeReachable } from "./expect-every-component-to-be-reachable";
import {
	E2eToManyAuthorEntity,
	E2eToManyCommentEntity,
	E2eToManyEnvelopePostController,
	E2eToManyItemsDescribedEntity,
	E2eToManyItemsInheritedEntity,
	E2eToManyItemsRelationEntity,
	E2eToManyLedgerEntity,
	E2eToManyLedgerService,
	E2eToManyObjectCodePostController,
	E2eToManyObjectLedgerController,
	E2eToManyObjectOrderController,
	E2eToManyObjectPostController,
	E2eToManyOrderEntity,
	E2eToManyOrderItemEntity,
	E2eToManyOrderService,
	E2eToManyPostEntity,
	E2eToManyPostService,
	E2eToManyReviewEntity,
	E2eToManyScalarLedgerController,
	E2eToManyScalarOrderController,
	E2eToManyScalarPostController,
	E2eToManyTagEntity,
} from "./to-many-relation-response";

const AUTHOR: string = "11111111-1111-4111-8111-111111111111";
const AUTHOR_SECRET: string = "AUTHOR-SECRET";
const COMMENT_FIRST: string = "22222222-2222-4222-8222-222222222221";
const COMMENT_SECOND: string = "22222222-2222-4222-8222-222222222222";
const LEDGER: string = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
const ORDER: string = "cccccccc-cccc-4ccc-8ccc-ccccccccccc1";
const ORDER_ITEM_FIRST: string = "55555555-5555-4555-8555-555555555551";
const ORDER_ITEM_SECOND: string = "55555555-5555-4555-8555-555555555552";
const POST_EMPTY: string = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const POST_FULL: string = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const REVIEW: string = "44444444-4444-4444-8444-444444444441";
const TAG_FIRST: string = "33333333-3333-4333-8333-333333333331";
const TAG_SECOND: string = "33333333-3333-4333-8333-333333333332";

interface IPostWire {
	author: unknown;
	comments: unknown;
	id: string;
	reviews: unknown;
	tags: unknown;
}

describe("To-many response relations (E2E)", () => {
	let app: INestApplication | undefined;
	let document: OpenAPIObject;
	let fastify: {
		inject: (options: { method: string; payload?: object; url: string }) => Promise<{ body: string; json: () => unknown; statusCode: number }>;
	};

	const getPost = async (path: string, id: string): Promise<IPostWire> => {
		const response = await fastify.inject({ method: "GET", url: `/${path}/${id}` });

		expect(response.statusCode).toBe(HttpStatus.OK);

		return response.json() as IPostWire;
	};

	const listPosts = async (path: string): Promise<Array<IPostWire>> => {
		const response = await fastify.inject({ method: "GET", url: `/${path}?limit=10&page=1&orderBy=title&orderDirection=asc` });

		expect(response.statusCode).toBe(HttpStatus.OK);

		return (response.json() as { items: Array<IPostWire> }).items;
	};

	const send = async (method: string, url: string, expectedStatus: HttpStatus, payload?: object): Promise<IPostWire> => {
		const response = await fastify.inject({ method, payload, url });

		expect(response.statusCode).toBe(expectedStatus);

		return response.json() as IPostWire;
	};

	const getSchemaProperties = (schemaName: string): Record<string, TSwaggerSchemaObject> => (document.components?.schemas?.[schemaName] as TSwaggerSchemaObject).properties as Record<string, TSwaggerSchemaObject>;

	const expectReferences = (actual: unknown, expected: Array<unknown>): void => {
		expect(actual).toHaveLength(expected.length);
		expect(actual).toEqual(expect.arrayContaining(expected));
	};

	beforeAll(async () => {
		const moduleReference = await Test.createTestingModule({
			controllers: [E2eToManyEnvelopePostController, E2eToManyObjectCodePostController, E2eToManyObjectLedgerController, E2eToManyObjectOrderController, E2eToManyObjectPostController, E2eToManyScalarLedgerController, E2eToManyScalarOrderController, E2eToManyScalarPostController],
			imports: [
				TypeOrmModule.forRoot({
					database: ":memory:",
					dropSchema: true,
					entities: [E2eToManyAuthorEntity, E2eToManyCommentEntity, E2eToManyItemsDescribedEntity, E2eToManyItemsInheritedEntity, E2eToManyItemsRelationEntity, E2eToManyLedgerEntity, E2eToManyOrderEntity, E2eToManyOrderItemEntity, E2eToManyPostEntity, E2eToManyReviewEntity, E2eToManyTagEntity],
					logging: false,
					synchronize: true,
					type: "better-sqlite3",
				}),
				TypeOrmModule.forFeature([E2eToManyLedgerEntity, E2eToManyOrderEntity, E2eToManyPostEntity]),
				ApiAuthorizationModule.forRoot(),
				ApiSubscriberModule,
			],
			providers: [E2eToManyLedgerService, E2eToManyOrderService, E2eToManyPostService],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
		fastify = app.getHttpAdapter().getInstance();

		const { manager } = app.get(E2eToManyPostService).repository;
		const author: E2eToManyAuthorEntity = await manager.save(E2eToManyAuthorEntity, { code: AUTHOR_SECRET, id: AUTHOR });
		const tags: Array<E2eToManyTagEntity> = await manager.save(E2eToManyTagEntity, [
			{ code: "tag-first", id: TAG_FIRST },
			{ code: "tag-second", id: TAG_SECOND },
		]);
		const post: E2eToManyPostEntity = await manager.save(E2eToManyPostEntity, { author, id: POST_FULL, tags, title: "a-full" });

		await manager.save(E2eToManyPostEntity, { id: POST_EMPTY, title: "b-empty" });
		await manager.save(E2eToManyCommentEntity, [
			{ id: COMMENT_FIRST, post },
			{ id: COMMENT_SECOND, post },
		]);
		await manager.save(E2eToManyReviewEntity, { id: REVIEW, post });

		const order: E2eToManyOrderEntity = await manager.save(E2eToManyOrderEntity, { id: ORDER, owner: author, title: "a-order" });

		await manager.save(E2eToManyOrderItemEntity, [
			{ code: "item-secret", id: ORDER_ITEM_FIRST, order },
			{ code: "item-secret", id: ORDER_ITEM_SECOND, order },
		]);
		await manager.save(E2eToManyLedgerEntity, { id: LEDGER, items: ["x", "y"], owner: author, title: "a-ledger" });
	});

	afterAll(async () => {
		await app?.close();
	});

	it("reaches every component from a route", () => {
		expectEveryComponentToBeReachable(document);
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

	it("projects array-described OBJECT relations element by element", async () => {
		expect((await getPost("to-many-object-posts", POST_FULL)).reviews).toEqual([{ id: REVIEW }]);
		expect((await getPost("to-many-scalar-posts", POST_FULL)).reviews).toEqual([REVIEW]);
		expect((await listPosts("to-many-object-posts"))[0]?.reviews).toEqual([{ id: REVIEW }]);
		expect((await listPosts("to-many-scalar-posts"))[0]?.reviews).toEqual([REVIEW]);
	});

	it("keeps loaded empty to-many relations as empty arrays", async () => {
		for (const path of ["to-many-object-posts", "to-many-scalar-posts"]) {
			const post = await getPost(path, POST_EMPTY);
			const listed = (await listPosts(path)).find((item: IPostWire): boolean => item.id === POST_EMPTY);

			expect(post.comments).toEqual([]);
			expect(post.reviews).toEqual([]);
			expect(post.tags).toEqual([]);
			expect(listed?.comments).toEqual([]);
			expect(listed?.reviews).toEqual([]);
			expect(listed?.tags).toEqual([]);
		}
	});

	it("keeps to-one relation references next to to-many relations", async () => {
		expect((await getPost("to-many-object-posts", POST_FULL)).author).toEqual({ id: AUTHOR });
		expect((await getPost("to-many-scalar-posts", POST_FULL)).author).toBe(AUTHOR);
		expect((await getPost("to-many-object-posts", POST_EMPTY)).author).toBeNull();
		expect((await getPost("to-many-scalar-posts", POST_EMPTY)).author).toBeNull();
	});

	it("describes to-many response relations as arrays in Swagger", () => {
		for (const [schemaName, itemSchemaPrefix] of [
			["E2eToManyObjectPostGetResponseDTO", "E2eToManyObjectPostGetResponse"],
			["E2eToManyObjectPostGetListResponseDTO", "E2eToManyObjectPostGetListResponse"],
		] as const) {
			const properties: Record<string, TSwaggerSchemaObject> = getSchemaProperties(schemaName);

			expect(properties.comments).toMatchObject({ items: { $ref: `#/components/schemas/${itemSchemaPrefix}CommentsDTO` }, minItems: 0, type: "array" });
			expect(properties.tags).toMatchObject({ items: { $ref: `#/components/schemas/${itemSchemaPrefix}TagsDTO` }, minItems: 0, type: "array" });
			expect(properties.comments).not.toHaveProperty("maxItems");
			expect(properties.author?.type).not.toBe("array");
			expect(properties.author).toMatchObject({ allOf: [{ $ref: `#/components/schemas/${itemSchemaPrefix}AuthorDTO` }] });
		}
	});

	it("keeps to-many relations in the request schema unchanged", () => {
		const properties: Record<string, TSwaggerSchemaObject> = getSchemaProperties("E2eToManyObjectPostCreateBodyDTO");

		expect(properties.comments?.type).toBe("string");
		expect(properties.comments?.format).toBe("uuid");
		expect(properties.tags?.type).toBe("string");
		expect(properties.tags?.format).toBe("uuid");
	});

	describe("write routes", () => {
		it.each([
			["PATCH", "to-many-object-posts", [{ id: COMMENT_FIRST }, { id: COMMENT_SECOND }], [{ id: TAG_FIRST }, { id: TAG_SECOND }], { id: AUTHOR }],
			["PUT", "to-many-object-posts", [{ id: COMMENT_FIRST }, { id: COMMENT_SECOND }], [{ id: TAG_FIRST }, { id: TAG_SECOND }], { id: AUTHOR }],
			["PATCH", "to-many-scalar-posts", [COMMENT_FIRST, COMMENT_SECOND], [TAG_FIRST, TAG_SECOND], AUTHOR],
			["PUT", "to-many-scalar-posts", [COMMENT_FIRST, COMMENT_SECOND], [TAG_FIRST, TAG_SECOND], AUTHOR],
		])("projects relations on %s /%s", async (method: string, path: string, comments: Array<unknown>, tags: Array<unknown>, author: unknown) => {
			const post = await send(method, `/${path}/${POST_FULL}`, HttpStatus.OK, { title: "a-full" });

			expectReferences(post.comments, comments);
			expectReferences(post.tags, tags);
			expect(post.author).toEqual(author);
		});

		it.each(["to-many-object-posts", "to-many-scalar-posts"])("returns empty to-many relations on POST /%s", async (path: string) => {
			const post = await send("POST", `/${path}`, HttpStatus.CREATED, { title: `z-created-${path}` });

			expect(post.comments).toEqual([]);
			expect(post.reviews).toEqual([]);
			expect(post.tags).toEqual([]);
			expect(post.author).toBeNull();
		});
	});

	describe("custom routes", () => {
		it("projects to-many relations into object references", async () => {
			const post = await send("GET", `/to-many-object-posts/custom/${POST_FULL}`, HttpStatus.OK);

			expectReferences(post.comments, [{ id: COMMENT_FIRST }, { id: COMMENT_SECOND }]);
			expectReferences(post.tags, [{ id: TAG_FIRST }, { id: TAG_SECOND }]);
		});

		it("projects to-many relations into scalar references", async () => {
			const post = await send("GET", `/to-many-scalar-posts/custom/${POST_FULL}`, HttpStatus.OK);

			expectReferences(post.comments, [COMMENT_FIRST, COMMENT_SECOND]);
			expectReferences(post.tags, [TAG_FIRST, TAG_SECOND]);
		});
	});

	it("gives empty objects for an OBJECT reference on a key the relation DTO does not expose", async () => {
		const post = await send("GET", `/to-many-object-code-posts/${POST_FULL}`, HttpStatus.OK);

		expect(post.tags).toEqual([{}, {}]);
		expect(post.author).toEqual({});
	});

	describe("custom route list envelopes", () => {
		interface IEnvelopeWire {
			items: Array<{ author: unknown; id: string }>;
			totalCount: number;
		}

		it.each(["undeclared", "declared-list"])("projects relations of envelope items through a DTO exposing a secret on /%s", async (path: string) => {
			const response = await fastify.inject({ method: "GET", url: `/to-many-envelope-posts/${path}` });
			const { items, totalCount } = response.json() as IEnvelopeWire;

			expect(response.statusCode).toBe(HttpStatus.OK);
			expect(totalCount).toBe(items.length);
			expect(items.find((item: { id: string }): boolean => item.id === POST_FULL)?.author).toEqual({ id: AUTHOR });
			expect(response.body).not.toContain(AUTHOR_SECRET);
		});

		it.each(["items-relation", "items-described", "items-inherited"])("treats the response as the entity on an undeclared route whose entity owns items through /%s", async (path: string) => {
			const body = (await send("GET", `/to-many-envelope-posts/undeclared-${path}`, HttpStatus.OK)) as unknown as { items: Array<unknown>; owner: unknown };

			expect(body.items).toEqual([{ owner: { code: "nested-kept", id: "nested" } }]);
			expect(body.owner).toEqual({ id: "top-level" });
		});

		it("treats the response as the entity on a declared non-list route type", async () => {
			const body = (await send("GET", "/to-many-envelope-posts/declared-entity", HttpStatus.OK)) as unknown as { author: unknown; items: Array<unknown> };

			expect(body.items).toEqual([{ author: { code: "nested-kept", id: "nested" } }]);
			expect(body.author).toEqual({ id: "top-level" });
		});
	});

	describe("entity property named items", () => {
		interface IOrderWire {
			id: string;
			items: unknown;
			owner: unknown;
		}

		const expectOrder = (order: IOrderWire, shape: "object" | "scalar"): void => {
			expectReferences(order.items, shape === "object" ? [{ id: ORDER_ITEM_FIRST }, { id: ORDER_ITEM_SECOND }] : [ORDER_ITEM_FIRST, ORDER_ITEM_SECOND]);
			expect(order.owner).toEqual(shape === "object" ? { id: AUTHOR } : AUTHOR);
		};

		it.each([
			["to-many-object-orders", "object"],
			["to-many-scalar-orders", "scalar"],
		] as const)("projects an items relation on /%s", async (path: string, shape: "object" | "scalar") => {
			const url = `/${path}/${ORDER}`;

			expectOrder((await send("GET", url, HttpStatus.OK)) as unknown as IOrderWire, shape);
			expectOrder((await send("PATCH", url, HttpStatus.OK, { title: "a-order" })) as unknown as IOrderWire, shape);
			expectOrder((await send("PUT", url, HttpStatus.OK, { title: "a-order" })) as unknown as IOrderWire, shape);

			const list = (await send("GET", `/${path}?limit=10&page=1&orderBy=title&orderDirection=asc`, HttpStatus.OK)) as unknown as { items: Array<IOrderWire> };

			expectOrder(list.items[0] as IOrderWire, shape);
		});

		it.each(["to-many-object-orders", "to-many-scalar-orders"])("returns an empty items relation on POST /%s", async (path: string) => {
			const order = (await send("POST", `/${path}`, HttpStatus.CREATED, { owner: AUTHOR, title: `z-created-${path}` })) as unknown as IOrderWire;

			expect(order.items).toEqual([]);
			expect(order.owner).toEqual(path === "to-many-object-orders" ? { id: AUTHOR } : AUTHOR);
		});

		it("projects an items relation on a custom route without leaking related fields", async () => {
			const response = await fastify.inject({ method: "GET", url: `/to-many-object-orders/custom/${ORDER}` });

			expect(response.statusCode).toBe(HttpStatus.OK);
			expectOrder(response.json() as IOrderWire, "object");
			expect(response.body).not.toContain(AUTHOR_SECRET);
			expect(response.body).not.toContain("item-secret");
		});

		it("reads a custom route response as a list envelope only when it declares GET_LIST", async () => {
			const response = await fastify.inject({ method: "GET", url: "/to-many-object-orders/custom-list" });
			const { items, totalCount } = response.json() as { items: Array<IOrderWire>; totalCount: number };

			expect(response.statusCode).toBe(HttpStatus.OK);
			expect(totalCount).toBe(items.length);
			expectOrder(items.find((item: IOrderWire): boolean => item.id === ORDER) as IOrderWire, "object");
			expect(response.body).not.toContain(AUTHOR_SECRET);
		});

		it("collapses listed rows into references when an undeclared route includes the entity's own items relation", async () => {
			const response = await fastify.inject({ method: "GET", url: "/to-many-object-orders/custom-list-undeclared" });
			const { items, totalCount } = response.json() as { items: Array<unknown>; totalCount: number };

			expect(response.statusCode).toBe(HttpStatus.OK);
			expect(totalCount).toBe(items.length);
			expect(items).toContainEqual({ id: ORDER });

			for (const item of items) {
				expect(Object.keys(item as object)).toEqual(["id"]);
			}
		});

		it.each([
			["to-many-object-ledgers", { id: AUTHOR }],
			["to-many-scalar-ledgers", AUTHOR],
		])("projects the owner next to a JSON items column on /%s", async (path: string, owner: unknown) => {
			const url = `/${path}/${LEDGER}`;
			const responses = [await send("GET", url, HttpStatus.OK), await send("PATCH", url, HttpStatus.OK, { title: "a-ledger" }), await send("PUT", url, HttpStatus.OK, { title: "a-ledger" }), await send("POST", `/${path}`, HttpStatus.CREATED, { items: ["z"], owner: AUTHOR, title: `z-created-${path}` })];
			const list = (await send("GET", `/${path}?limit=10&page=1&orderBy=title&orderDirection=asc`, HttpStatus.OK)) as unknown as { items: Array<IOrderWire> };

			for (const ledger of [...(responses as unknown as Array<IOrderWire>), list.items[0] as IOrderWire]) {
				expect(ledger.owner).toEqual(owner);
			}
		});

		it("projects the owner next to a JSON items column on a custom route", async () => {
			const response = await fastify.inject({ method: "GET", url: `/to-many-object-ledgers/custom/${LEDGER}` });
			const ledger = response.json() as IOrderWire;

			expect(response.statusCode).toBe(HttpStatus.OK);
			expect(ledger.items).toEqual(["x", "y"]);
			expect(ledger.owner).toEqual({ id: AUTHOR });
			expect(response.body).not.toContain(AUTHOR_SECRET);
		});
	});
});
