import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import type { TSwaggerComponentSchema, TSwaggerSchemaObject } from "@type/swagger";

import { HttpStatus } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../src/index";
import {
	E2eRelationReferenceAuthorEntity,
	E2eRelationReferenceIntegerObjectController,
	E2eRelationReferenceIntegerPostEntity,
	E2eRelationReferenceIntegerPostService,
	E2eRelationReferenceIntegerScalarController,
	E2eRelationReferenceIntegerTargetEntity,
	E2eRelationReferenceObjectCodePostController,
	E2eRelationReferenceObjectCodePostEntity,
	E2eRelationReferenceObjectCodePostService,
	E2eRelationReferenceScalarCodePostController,
	E2eRelationReferenceScalarCodePostEntity,
	E2eRelationReferenceScalarCodePostService,
	E2eRelationReferenceScalarIdPostController,
	E2eRelationReferenceScalarIdPostEntity,
	E2eRelationReferenceScalarIdPostService,
	E2eRelationReferenceTagEntity,
	E2eRelationReferenceTwoObjectController,
	E2eRelationReferenceTwoScalarController,
	createE2eRelationReferenceTwinController,
	createRelationReferenceSchemaChecker,
	type IRelationReferenceSchemaChecker,
} from "./relation-reference-dto";

const AUTHOR_FIRST: string = "11111111-1111-4111-8111-111111111111";
const AUTHOR_SECOND: string = "11111111-1111-4111-8111-111111111112";
const POST_EMPTY: string = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const POST_FULL: string = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const SECRET: string = "AUTHOR-SECRET";
const TAG_FIRST: string = "33333333-3333-4333-8333-333333333331";
const TAG_SECOND: string = "33333333-3333-4333-8333-333333333332";

type TReference = (id: string, code: string) => unknown;

interface IShapeCase {
	/** Expected Swagger schema of one reference and of one to-many item, after $ref and allOf are resolved. */
	referenceSchema: Record<string, unknown>;
	path: string;
	reference: TReference;
	title: string;
}

interface IPostWire {
	author: unknown;
	editor: unknown;
	id: string;
	reviewer: unknown;
	tags: unknown;
	title: string;
}

const SHAPE_CASES: ReadonlyArray<IShapeCase> = [
	{
		path: "relation-reference-scalar-id-posts",
		reference: (id: string): unknown => id,
		referenceSchema: { format: "uuid", type: "string" },
		title: "SCALAR with key id",
	},
	{
		path: "relation-reference-scalar-code-posts",
		reference: (_id: string, code: string): unknown => code,
		referenceSchema: { pattern: "^[a-z-]+$", type: "string" },
		title: "SCALAR with key code",
	},
	{
		path: "relation-reference-object-code-posts",
		reference: (_id: string, code: string): unknown => ({ code }),
		referenceSchema: { properties: { code: { type: "string" } }, required: ["code"] },
		title: "OBJECT with key code",
	},
];

interface ITwoControllerCase {
	/** Relations the route never sends. */
	absent: ReadonlyArray<string>;
	/** Wire values of the post with the rows, by property. */
	full: Record<string, unknown>;
	path: string;
	prefix: string;
	/** Relations the route always sends. */
	required: ReadonlyArray<string>;
}

const TWO_CONTROLLER_CASES: ReadonlyArray<ITwoControllerCase> = [
	{
		absent: ["editor", "reader", "tags"],
		full: { author: { code: "author-first" }, reviewer: null },
		path: "relation-reference-two-object-posts",
		prefix: "E2eRelationReferenceTwoObject",
		required: ["author", "reviewer"],
	},
	{
		absent: ["author", "reader"],
		full: { editor: AUTHOR_SECOND, reviewer: null, tags: expect.arrayContaining([TAG_FIRST, TAG_SECOND]) },
		path: "relation-reference-two-scalar-posts",
		prefix: "E2eRelationReferenceTwoScalar",
		required: ["editor", "reviewer", "tags"],
	},
];

describe("Response relation reference DTOs (E2E)", () => {
	let app: INestApplication | undefined;
	let document: OpenAPIObject;
	let schemas: IRelationReferenceSchemaChecker;
	let fastify: {
		inject: (options: { method: string; payload?: object; url: string }) => Promise<{ body: string; json: () => unknown; statusCode: number }>;
	};

	const read = async (path: string, isList: boolean): Promise<{ body: unknown; posts: Array<IPostWire>; raw: string }> => {
		const response = await fastify.inject({ method: "GET", url: isList ? `/${path}?limit=10&page=1&orderBy=title&orderDirection=asc` : `/${path}/${POST_FULL}` });

		expect(response.statusCode).toBe(HttpStatus.OK);

		const body: unknown = response.json();
		const posts: Array<IPostWire> = isList ? (body as { items: Array<IPostWire> }).items : [body as IPostWire];

		if (!isList) {
			const empty = await fastify.inject({ method: "GET", url: `/${path}/${POST_EMPTY}` });

			expect(empty.statusCode).toBe(HttpStatus.OK);
			posts.push(empty.json() as IPostWire);
		}

		return { body, posts, raw: response.body };
	};

	beforeAll(async () => {
		const moduleReference = await Test.createTestingModule({
			controllers: [E2eRelationReferenceIntegerObjectController, E2eRelationReferenceIntegerScalarController, E2eRelationReferenceObjectCodePostController, E2eRelationReferenceScalarCodePostController, E2eRelationReferenceScalarIdPostController, E2eRelationReferenceTwoObjectController, E2eRelationReferenceTwoScalarController],
			imports: [
				TypeOrmModule.forRoot({
					database: ":memory:",
					dropSchema: true,
					entities: [E2eRelationReferenceAuthorEntity, E2eRelationReferenceIntegerPostEntity, E2eRelationReferenceIntegerTargetEntity, E2eRelationReferenceObjectCodePostEntity, E2eRelationReferenceScalarCodePostEntity, E2eRelationReferenceScalarIdPostEntity, E2eRelationReferenceTagEntity],
					logging: false,
					synchronize: true,
					type: "better-sqlite3",
				}),
				TypeOrmModule.forFeature([E2eRelationReferenceIntegerPostEntity, E2eRelationReferenceObjectCodePostEntity, E2eRelationReferenceScalarCodePostEntity, E2eRelationReferenceScalarIdPostEntity]),
				ApiAuthorizationModule.forRoot(),
				ApiSubscriberModule,
			],
			providers: [E2eRelationReferenceIntegerPostService, E2eRelationReferenceObjectCodePostService, E2eRelationReferenceScalarCodePostService, E2eRelationReferenceScalarIdPostService],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
		schemas = createRelationReferenceSchemaChecker(document);
		fastify = app.getHttpAdapter().getInstance();

		const { manager } = app.get(E2eRelationReferenceScalarIdPostService).repository;
		const [authorFirst, authorSecond] = await manager.save(E2eRelationReferenceAuthorEntity, [
			{ code: "author-first", id: AUTHOR_FIRST, secret: SECRET },
			{ code: "author-second", id: AUTHOR_SECOND, secret: SECRET },
		]);
		const tags: Array<E2eRelationReferenceTagEntity> = await manager.save(E2eRelationReferenceTagEntity, [
			{ code: "tag-first", id: TAG_FIRST },
			{ code: "tag-second", id: TAG_SECOND },
		]);

		for (const entity of [E2eRelationReferenceObjectCodePostEntity, E2eRelationReferenceScalarCodePostEntity, E2eRelationReferenceScalarIdPostEntity]) {
			await manager.save(entity, [
				{ author: authorFirst, editor: authorSecond, id: POST_FULL, reviewer: null, tags, title: "a-full" },
				{ author: null, editor: authorFirst, id: POST_EMPTY, reviewer: authorSecond, tags: [], title: "b-empty" },
			]);
		}
	});

	afterAll(async () => {
		await app?.close();
	});

	describe("the id key of a target with an integer id", () => {
		beforeAll(async () => {
			const { manager } = (app as INestApplication).get(E2eRelationReferenceIntegerPostService).repository;
			const target: E2eRelationReferenceIntegerTargetEntity = await manager.save(E2eRelationReferenceIntegerTargetEntity, { id: 7 });

			await manager.save(E2eRelationReferenceIntegerPostEntity, { id: POST_FULL, target, targets: [target], watcher: null });
		});

		it.each([
			["relation-reference-integer-object-posts", { id: 7 }],
			["relation-reference-integer-scalar-posts", 7],
		])("/%s sends the integer and describes it", async (path: string, reference: unknown) => {
			const response = await fastify.inject({ method: "GET", url: `/${path}/${POST_FULL}` });
			const list = await fastify.inject({ method: "GET", url: `/${path}?limit=10&page=1&orderBy=id&orderDirection=asc` });

			expect(response.statusCode, response.body).toBe(HttpStatus.OK);
			expect(response.json()).toMatchObject({ target: reference, targets: [reference] });
			schemas.expectWireMatchesSchema(schemas.getResponseSchema(path, false), response.json(), "GET");
			expect(list.statusCode, list.body).toBe(HttpStatus.OK);
			schemas.expectWireMatchesSchema(schemas.getResponseSchema(path, true), list.json(), "GET_LIST");
		});
	});

	describe.each(SHAPE_CASES)("$title", ({ path, reference, referenceSchema }: IShapeCase) => {
		describe.each([
			["GET", false],
			["GET_LIST", true],
		] as const)("%s", (_route: string, isList: boolean) => {
			it("sends the configured key of to-one and to-many relations on the wire", async () => {
				const { posts, raw } = await read(path, isList);
				const full: IPostWire | undefined = posts.find((post: IPostWire): boolean => post.id === POST_FULL);
				const empty: IPostWire | undefined = posts.find((post: IPostWire): boolean => post.id === POST_EMPTY);

				expect(full?.author).toEqual(reference(AUTHOR_FIRST, "author-first"));
				expect(full?.editor).toEqual(reference(AUTHOR_SECOND, "author-second"));
				expect(full?.tags).toHaveLength(2);
				expect(full?.tags).toEqual(expect.arrayContaining([reference(TAG_FIRST, "tag-first"), reference(TAG_SECOND, "tag-second")]));
				expect(empty?.author).toBeNull();
				expect(empty?.editor).toEqual(reference(AUTHOR_FIRST, "author-first"));
				expect(empty?.tags).toEqual([]);
				expect(raw).not.toContain(SECRET);
			});

			it("describes each reference as the wire sends it", () => {
				const properties: Record<string, TSwaggerComponentSchema> = schemas.getItemProperties(path, isList);
				const author: TSwaggerSchemaObject = schemas.resolveSchema(properties.author as TSwaggerComponentSchema);
				const editor: TSwaggerSchemaObject = schemas.resolveSchema(properties.editor as TSwaggerComponentSchema);
				const tags: TSwaggerSchemaObject = schemas.resolveSchema(properties.tags as TSwaggerComponentSchema);

				expect(author).toMatchObject(referenceSchema);
				expect(author.nullable).toBe(true);
				expect(editor).toMatchObject(referenceSchema);
				expect(editor.nullable).toBe(false);
				expect(tags.type).toBe("array");
				expect(schemas.resolveSchema(tags.items as TSwaggerComponentSchema)).toMatchObject(referenceSchema);
			});

			it("describes the eager reviewer outside the include as a nullable id object", async () => {
				const { posts } = await read(path, isList);
				const reviewer: TSwaggerSchemaObject = schemas.resolveSchema(schemas.getItemProperties(path, isList).reviewer as TSwaggerComponentSchema);

				expect(posts.find((post: IPostWire): boolean => post.id === POST_FULL)?.reviewer).toBeNull();
				expect(posts.find((post: IPostWire): boolean => post.id === POST_EMPTY)?.reviewer).toEqual({ id: AUTHOR_SECOND });
				expect(reviewer).toMatchObject({ properties: { id: { format: "uuid", type: "string" } } });
				expect(reviewer.nullable).toBe(true);
			});

			it("requires exactly the relations the route always sends", async () => {
				const { posts } = await read(path, isList);
				const required: Array<string> = schemas.getItemSchema(path, isList).required ?? [];

				expect(required).toEqual(expect.arrayContaining(["author", "editor", "reviewer", "tags"]));
				expect(required).not.toContain("reader");
				expect(schemas.getItemProperties(path, isList).reader).toBeDefined();

				for (const post of posts) {
					expect(Object.keys(post)).not.toContain("reader");
				}
			});

			it("sends a body that is valid against the OpenAPI response schema", async () => {
				const { body } = await read(path, isList);
				const schema: TSwaggerComponentSchema = schemas.getResponseSchema(path, isList);

				schemas.expectWireMatchesSchema(schema, body, "response");

				if (!isList) {
					const empty = await fastify.inject({ method: "GET", url: `/${path}/${POST_EMPTY}` });

					schemas.expectWireMatchesSchema(schema, empty.json(), "response");
				}
			});
		});

		it.each([
			["post", "POST", HttpStatus.CREATED],
			["patch", "PATCH", HttpStatus.OK],
			["put", "PUT", HttpStatus.OK],
		] as const)("sends a %s response that is valid against the OpenAPI response schema", async (method: "patch" | "post" | "put", verb: string, status: HttpStatus) => {
			const response = await fastify.inject({
				method: verb,
				payload: method === "post" ? { editor: AUTHOR_FIRST, title: `z-created-${path}` } : { title: "a-full" },
				url: method === "post" ? `/${path}` : `/${path}/${POST_FULL}`,
			} as never);
			const body: IPostWire = response.json() as IPostWire;

			expect(response.statusCode, response.body).toBe(status);
			expect(body.editor).toEqual(method === "post" ? reference(AUTHOR_FIRST, "author-first") : reference(AUTHOR_SECOND, "author-second"));
			expect(Object.keys(body)).toContain("reviewer");
			schemas.expectWireMatchesSchema(schemas.getResponseSchema(path, method === "post", method), body, `${verb} response`);
		});
	});

	describe("two controllers with different includes on one entity", () => {
		const getComponent = (name: string): TSwaggerSchemaObject => {
			const component: TSwaggerComponentSchema | undefined = document.components?.schemas?.[name];

			expect(component, `component ${name}`).toBeDefined();

			return component as TSwaggerSchemaObject;
		};

		it("resolves every reference of the document", () => {
			const references: Array<string> = [...JSON.stringify(document).matchAll(/"#\/components\/schemas\/([^"]+)"/g)].map((match: RegExpExecArray): string => match[1] as string);

			expect(references.length).toBeGreaterThan(0);
			expect(references.filter((name: string): boolean => !document.components?.schemas?.[name])).toEqual([]);
		});

		it("describes one relation as each controller sends it, under the name of that controller", () => {
			const objectAuthor: TSwaggerSchemaObject = getComponent("E2eRelationReferenceTwoObjectGetResponseAuthorDTO");
			const scalarAuthor: TSwaggerSchemaObject = getComponent("E2eRelationReferenceTwoScalarGetResponseAuthorDTO");

			expect(Object.keys(objectAuthor.properties ?? {})).toEqual(["code"]);
			expect(Object.keys(scalarAuthor.properties ?? {})).toEqual(["id"]);
			expect(getComponent("E2eRelationReferenceTwoObjectGetResponseEditorDTO").properties).toHaveProperty("id");
			expect(schemas.resolveSchema(getComponent("E2eRelationReferenceTwoScalarGetResponseDTO").properties?.editor as TSwaggerComponentSchema)).toMatchObject({ format: "uuid", type: "string" });
		});

		describe.each(TWO_CONTROLLER_CASES)("$prefix", ({ absent, full, path, prefix, required }: ITwoControllerCase) => {
			it.each([
				["GET", false, "GetResponseDTO"],
				["GET_LIST", true, "GetListPageDTO"],
			] as const)("names the %s response after the controller", (_route: string, isList: boolean, suffix: string) => {
				expect(JSON.stringify(schemas.getResponseSchema(path, isList))).toContain(`#/components/schemas/${prefix}${suffix}`);
			});

			describe.each([
				["GET", false],
				["GET_LIST", true],
			] as const)("%s", (_route: string, isList: boolean) => {
				it("sends only the relations of this controller, and they match its schema", async () => {
					const { body, posts } = await read(path, isList);
					const post: IPostWire | undefined = posts.find((candidate: IPostWire): boolean => candidate.id === POST_FULL);

					expect(post).toMatchObject(full);
					schemas.expectWireMatchesSchema(schemas.getResponseSchema(path, isList), body, "response");

					for (const candidate of posts) {
						for (const property of absent) {
							expect(Object.keys(candidate), `${property} of post ${candidate.id}`).not.toContain(property);
						}
					}
				});

				it("requires a relation only if the route always sends it", () => {
					const schema: TSwaggerSchemaObject = schemas.getItemSchema(path, isList);

					expect(schema.required).toEqual(expect.arrayContaining([...required]));

					for (const property of absent) {
						expect(schema.required, property).not.toContain(property);
						expect(schema.properties, property).toHaveProperty(property);
					}
				});
			});
		});
	});
});

describe("Two applications with one controller name and reference and different includes (E2E)", () => {
	const POST_ID: string = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa9";
	const TWIN_PATH: string = "relation-reference-twin-posts";
	const twins: Array<{ app: INestApplication; document: OpenAPIObject; schemas: IRelationReferenceSchemaChecker }> = [];

	const bootTwin = async (include: object): Promise<void> => {
		const moduleReference = await Test.createTestingModule({
			controllers: [createE2eRelationReferenceTwinController(include)],
			imports: [
				TypeOrmModule.forRoot({
					database: ":memory:",
					dropSchema: true,
					entities: [E2eRelationReferenceAuthorEntity, E2eRelationReferenceObjectCodePostEntity, E2eRelationReferenceTagEntity],
					logging: false,
					synchronize: true,
					type: "better-sqlite3",
				}),
				TypeOrmModule.forFeature([E2eRelationReferenceObjectCodePostEntity]),
				ApiAuthorizationModule.forRoot(),
				ApiSubscriberModule,
			],
			providers: [E2eRelationReferenceObjectCodePostService],
		}).compile();
		const app: INestApplication = moduleReference.createNestApplication(new FastifyAdapter());

		await app.init();

		const { manager } = app.get(E2eRelationReferenceObjectCodePostService).repository;
		const author: E2eRelationReferenceAuthorEntity = await manager.save(E2eRelationReferenceAuthorEntity, { code: "author-twin", id: AUTHOR_FIRST, secret: SECRET });
		const tag: E2eRelationReferenceTagEntity = await manager.save(E2eRelationReferenceTagEntity, { code: "tag-twin", id: TAG_FIRST });

		await manager.save(E2eRelationReferenceObjectCodePostEntity, { author, editor: author, id: POST_ID, reviewer: null, tags: [tag], title: "twin" });

		const document: OpenAPIObject = SwaggerModule.createDocument(app, new DocumentBuilder().build());

		twins.push({ app, document, schemas: createRelationReferenceSchemaChecker(document) });
	};

	const readTwin = async (index: number, isList: boolean): Promise<{ body: unknown; post: Record<string, unknown> }> => {
		const fastify = (twins[index] as { app: INestApplication }).app.getHttpAdapter().getInstance() as { inject: (options: { method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };
		const response = await fastify.inject({ method: "GET", url: isList ? `/${TWIN_PATH}?limit=10&page=1&orderBy=title&orderDirection=asc` : `/${TWIN_PATH}/${POST_ID}` });

		expect(response.statusCode).toBe(HttpStatus.OK);

		const body: unknown = response.json();

		return { body, post: isList ? ((body as { items: Array<Record<string, unknown>> }).items[0] as Record<string, unknown>) : (body as Record<string, unknown>) };
	};

	beforeAll(async () => {
		await bootTwin({ author: true });
		await bootTwin({ editor: true, tags: true });
	});

	afterAll(async () => {
		for (const { app } of twins) {
			await app.close();
		}
	});

	it("gives each application the same component name", () => {
		for (const { document } of twins) {
			expect(document.components?.schemas).toHaveProperty("E2eRelationReferenceTwinGetResponseDTO");
		}
	});

	describe.each([
		["GET", false],
		["GET_LIST", true],
	] as const)("%s", (_route: string, isList: boolean) => {
		it("describes the include of the first application in its own DTO", async () => {
			const { schemas } = twins[0] as { schemas: IRelationReferenceSchemaChecker };
			const { body, post } = await readTwin(0, isList);
			const properties: Record<string, TSwaggerComponentSchema> = schemas.getItemProperties(TWIN_PATH, isList);

			expect(schemas.resolveSchema(properties.author as TSwaggerComponentSchema).type).toBe("string");
			expect(schemas.resolveSchema(properties.editor as TSwaggerComponentSchema).type).toBe("object");
			expect(schemas.getItemSchema(TWIN_PATH, isList).required).toContain("author");
			expect(schemas.getItemSchema(TWIN_PATH, isList).required).not.toContain("editor");
			expect(post.author).toBe("author-twin");
			expect(Object.keys(post)).not.toContain("editor");
			schemas.expectWireMatchesSchema(schemas.getResponseSchema(TWIN_PATH, isList), body, "response");
		});

		it("describes the include of the second application in its own DTO", async () => {
			const { schemas } = twins[1] as { schemas: IRelationReferenceSchemaChecker };
			const { body, post } = await readTwin(1, isList);
			const properties: Record<string, TSwaggerComponentSchema> = schemas.getItemProperties(TWIN_PATH, isList);

			expect(schemas.resolveSchema(properties.author as TSwaggerComponentSchema).type).toBe("object");
			expect(schemas.resolveSchema(properties.editor as TSwaggerComponentSchema).type).toBe("string");
			expect(schemas.getItemSchema(TWIN_PATH, isList).required).toEqual(expect.arrayContaining(["editor", "tags"]));
			expect(schemas.getItemSchema(TWIN_PATH, isList).required).not.toContain("author");
			expect(post.editor).toBe("author-twin");
			expect(post.tags).toEqual(["tag-twin"]);
			expect(Object.keys(post)).not.toContain("author");
			schemas.expectWireMatchesSchema(schemas.getResponseSchema(TWIN_PATH, isList), body, "response");
		});
	});
});
