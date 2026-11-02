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
} from "./relation-reference-dto";

const AUTHOR_FIRST: string = "11111111-1111-4111-8111-111111111111";
const AUTHOR_SECOND: string = "11111111-1111-4111-8111-111111111112";
const POST_EMPTY: string = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const POST_FULL: string = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const SECRET: string = "AUTHOR-SECRET";
const TAG_FIRST: string = "33333333-3333-4333-8333-333333333331";
const TAG_SECOND: string = "33333333-3333-4333-8333-333333333332";
const UUID_PATTERN: RegExp = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;

type TReference = (id: string, code: string) => unknown;

interface IShapeCase {
	/** Expected Swagger schema of one reference, after $ref and allOf are resolved. */
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
		referenceSchema: { type: "string" },
		title: "SCALAR with key code",
	},
	{
		path: "relation-reference-object-code-posts",
		reference: (_id: string, code: string): unknown => ({ code }),
		referenceSchema: { properties: { code: { type: "string" } }, required: ["code"] },
		title: "OBJECT with key code",
	},
];

describe("Response relation reference DTOs (E2E)", () => {
	let app: INestApplication | undefined;
	let document: OpenAPIObject;
	let fastify: {
		inject: (options: { method: string; url: string }) => Promise<{ body: string; json: () => unknown; statusCode: number }>;
	};

	/**
	 * Resolves a schema through $ref and single-member allOf, keeping property-level nullable and description.
	 * @param {TSwaggerComponentSchema} schema - Schema to resolve.
	 * @returns {TSwaggerSchemaObject} Resolved schema.
	 */
	const resolveSchema = (schema: TSwaggerComponentSchema): TSwaggerSchemaObject => {
		if ("$ref" in schema) {
			const name: string = schema.$ref.replace("#/components/schemas/", "");
			const target: TSwaggerComponentSchema | undefined = document.components?.schemas?.[name];

			expect(target, `component ${name}`).toBeDefined();

			return resolveSchema(target as TSwaggerComponentSchema);
		}

		if (schema.allOf?.length === 1) {
			const { allOf, ...rest } = schema;

			return { ...resolveSchema(allOf[0] as TSwaggerComponentSchema), ...rest };
		}

		return schema;
	};

	/**
	 * Asserts that a wire value is valid against its OpenAPI schema.
	 * Objects are closed: the serializer drops undeclared keys, so a key on the wire must be declared.
	 * @param {TSwaggerComponentSchema} rawSchema - Declared schema.
	 * @param {unknown} value - Wire value.
	 * @param {string} location - JSON path used in failure messages.
	 */
	const expectWireMatchesSchema = (rawSchema: TSwaggerComponentSchema, value: unknown, location: string): void => {
		const schema: TSwaggerSchemaObject = resolveSchema(rawSchema);

		if (value === null) {
			expect(schema.nullable, `${location} is null on the wire, so the schema must be nullable`).toBe(true);

			return;
		}

		if (schema.type === "array") {
			expect(Array.isArray(value), `${location} must be an array`).toBe(true);

			for (const [index, item] of (value as Array<unknown>).entries()) {
				expectWireMatchesSchema(schema.items as TSwaggerComponentSchema, item, `${location}[${index}]`);
			}

			return;
		}

		if (schema.type === "object" || schema.properties) {
			expect(value !== null && typeof value === "object" && !Array.isArray(value), `${location} must be an object, got ${JSON.stringify(value)}`).toBe(true);

			const properties: Record<string, TSwaggerComponentSchema> = (schema.properties ?? {}) as Record<string, TSwaggerComponentSchema>;

			for (const requiredKey of schema.required ?? []) {
				expect(Object.keys(value as object), `${location}.${requiredKey} is required by the schema`).toContain(requiredKey);
			}

			for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
				expect(Object.keys(properties), `${location}.${key} is on the wire but not in the schema`).toContain(key);
				expectWireMatchesSchema(properties[key] as TSwaggerComponentSchema, item, `${location}.${key}`);
			}

			return;
		}

		if (schema.type === "string") {
			expect(typeof value, `${location} must be a string`).toBe("string");

			if (schema.format === "uuid") {
				expect(value, `${location} must be a uuid`).toMatch(UUID_PATTERN);
			}

			return;
		}

		if (schema.type === "number" || schema.type === "integer") {
			expect(typeof value, `${location} must be a number`).toBe("number");

			return;
		}

		if (schema.type === "boolean") {
			expect(typeof value, `${location} must be a boolean`).toBe("boolean");

			return;
		}

		throw new Error(`${location}: unsupported schema ${JSON.stringify(schema)}`);
	};

	const getResponseSchema = (path: string, isList: boolean): TSwaggerComponentSchema => {
		const pathKey: string | undefined = Object.keys(document.paths).find((candidate: string): boolean => (isList ? candidate === `/${path}` : candidate.startsWith(`/${path}/{`)));

		expect(pathKey, `OpenAPI path for /${path}`).toBeDefined();

		const content: Record<string, { schema: TSwaggerComponentSchema }> | undefined = (document.paths[pathKey as string]?.get?.responses?.[String(HttpStatus.OK)] as { content?: Record<string, { schema: TSwaggerComponentSchema }> } | undefined)?.content;

		return content?.["application/json"]?.schema as TSwaggerComponentSchema;
	};

	const getItemProperties = (path: string, isList: boolean): Record<string, TSwaggerComponentSchema> => {
		const response: TSwaggerSchemaObject = resolveSchema(getResponseSchema(path, isList));
		const item: TSwaggerSchemaObject = isList ? resolveSchema((resolveSchema(response.properties?.items as TSwaggerComponentSchema).items ?? {}) as TSwaggerComponentSchema) : response;

		return item.properties as Record<string, TSwaggerComponentSchema>;
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
			controllers: [E2eRelationReferenceObjectCodePostController, E2eRelationReferenceScalarCodePostController, E2eRelationReferenceScalarIdPostController],
			imports: [
				TypeOrmModule.forRoot({
					database: ":memory:",
					dropSchema: true,
					entities: [E2eRelationReferenceAuthorEntity, E2eRelationReferenceObjectCodePostEntity, E2eRelationReferenceScalarCodePostEntity, E2eRelationReferenceScalarIdPostEntity, E2eRelationReferenceTagEntity],
					logging: false,
					synchronize: true,
					type: "better-sqlite3",
				}),
				TypeOrmModule.forFeature([E2eRelationReferenceObjectCodePostEntity, E2eRelationReferenceScalarCodePostEntity, E2eRelationReferenceScalarIdPostEntity]),
				ApiAuthorizationModule.forRoot(),
				ApiSubscriberModule,
			],
			providers: [E2eRelationReferenceObjectCodePostService, E2eRelationReferenceScalarCodePostService, E2eRelationReferenceScalarIdPostService],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
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
				const properties: Record<string, TSwaggerComponentSchema> = getItemProperties(path, isList);
				const author: TSwaggerSchemaObject = resolveSchema(properties.author as TSwaggerComponentSchema);
				const editor: TSwaggerSchemaObject = resolveSchema(properties.editor as TSwaggerComponentSchema);
				const tags: TSwaggerSchemaObject = resolveSchema(properties.tags as TSwaggerComponentSchema);

				expect(author).toMatchObject(referenceSchema);
				expect(author.nullable).toBe(true);
				expect(editor).toMatchObject(referenceSchema);
				expect(editor.nullable).toBe(false);
				expect(tags.type).toBe("array");
				expect(resolveSchema(tags.items as TSwaggerComponentSchema)).toMatchObject(referenceSchema);
			});

			it("describes the eager reviewer outside the include as a nullable id object", async () => {
				const { posts } = await read(path, isList);
				const reviewer: TSwaggerSchemaObject = resolveSchema(getItemProperties(path, isList).reviewer as TSwaggerComponentSchema);

				expect(posts.find((post: IPostWire): boolean => post.id === POST_FULL)?.reviewer).toBeNull();
				expect(posts.find((post: IPostWire): boolean => post.id === POST_EMPTY)?.reviewer).toEqual({ id: AUTHOR_SECOND });
				expect(reviewer).toMatchObject({ properties: { id: { format: "uuid", type: "string" } } });
				expect(reviewer.nullable).toBe(true);
			});

			it("sends a body that is valid against the OpenAPI response schema", async () => {
				const { body } = await read(path, isList);
				const schema: TSwaggerComponentSchema = getResponseSchema(path, isList);

				expectWireMatchesSchema(schema, body, "response");

				if (!isList) {
					const empty = await fastify.inject({ method: "GET", url: `/${path}/${POST_EMPTY}` });

					expectWireMatchesSchema(schema, empty.json(), "response");
				}
			});
		});
	});
});
