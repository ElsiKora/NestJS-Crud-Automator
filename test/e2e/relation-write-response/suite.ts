import type { INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import type { DataSourceOptions, EntityManager } from "typeorm";

import { HttpStatus } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../../src/index";
import { createRelationReferenceSchemaChecker, type IRelationReferenceSchemaChecker } from "../relation-reference-dto";

import { E2eRelationWriteCompositeController, E2eRelationWriteDefaultController, E2eRelationWriteIncludeController } from "./controller";
import { E2eRelationWriteAuthorEntity, E2eRelationWriteCompositeEntity, E2eRelationWritePostEntity, E2eRelationWriteTagEntity } from "./entity";
import { E2eRelationWriteCompositeService, E2eRelationWritePostService } from "./service";

const AUTHOR_FIRST: string = "11111111-1111-4111-8111-111111111111";
const AUTHOR_SECOND: string = "11111111-1111-4111-8111-111111111112";
const COMPOSITE_ID: string = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";
const DEFAULT_PATH: string = "relation-write-default-posts";
const INCLUDE_PATH: string = "relation-write-include-posts";
const POST: string = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const TAG: string = "33333333-3333-4333-8333-333333333331";

type TStoredKey = "author" | "editor" | "reviewer";
type TVerb = "PATCH" | "PUT";

interface IRelationWriteSuiteOptions {
	createDataSourceOptions: () => Promise<DataSourceOptions>;
	stop?: () => Promise<void>;
}

interface IWriteCase {
	label: string;
	payload: Record<string, unknown>;
	stored: Partial<Record<TStoredKey, null | string>>;
	verb: TVerb;
}

const WRITE_CASES: ReadonlyArray<IWriteCase> = [
	{ label: "a required to-one key", payload: { editor: AUTHOR_SECOND }, stored: { editor: AUTHOR_SECOND }, verb: "PATCH" },
	{ label: "a nullable to-one key", payload: { author: AUTHOR_SECOND }, stored: { author: AUTHOR_SECOND }, verb: "PATCH" },
	{ label: "a nullable to-one null", payload: { author: null }, stored: { author: null }, verb: "PATCH" },
	{ label: "an eager to-one key", payload: { reviewer: AUTHOR_SECOND }, stored: { reviewer: AUTHOR_SECOND }, verb: "PATCH" },
	{ label: "an eager to-one null", payload: { reviewer: null }, stored: { reviewer: null }, verb: "PATCH" },
	{ label: "no relation key", payload: { title: "changed" }, stored: { author: AUTHOR_FIRST, editor: AUTHOR_FIRST, reviewer: AUTHOR_FIRST }, verb: "PATCH" },
	{ label: "the required key", payload: { editor: AUTHOR_FIRST, title: "changed" }, stored: { author: AUTHOR_FIRST, editor: AUTHOR_FIRST, reviewer: AUTHOR_FIRST }, verb: "PUT" },
	{ label: "every to-one key", payload: { author: AUTHOR_SECOND, editor: AUTHOR_SECOND, reviewer: AUTHOR_SECOND, title: "changed" }, stored: { author: AUTHOR_SECOND, editor: AUTHOR_SECOND, reviewer: AUTHOR_SECOND }, verb: "PUT" },
	{ label: "null to-one keys", payload: { author: null, editor: AUTHOR_SECOND, reviewer: null, title: "changed" }, stored: { author: null, editor: AUTHOR_SECOND, reviewer: null }, verb: "PUT" },
];

/**
 * Registers the suite of relations in PUT and PATCH responses for one database.
 * @param {string} name - Database name used in the suite title.
 * @param {IRelationWriteSuiteOptions} options - Database options.
 */
export function describeRelationWriteResponseSuite(name: string, options: IRelationWriteSuiteOptions): void {
	describe(`Relations in PUT and PATCH responses on ${name} (E2E)`, () => {
		let app: INestApplication | undefined;
		let document: OpenAPIObject;
		let schemas: IRelationReferenceSchemaChecker;
		let manager: EntityManager;
		let fastify: {
			inject: (options: { method: string; payload?: object; url: string }) => Promise<{ body: string; json: () => Record<string, unknown>; statusCode: number }>;
		};

		const readStored = async (): Promise<Record<TStoredKey, null | string | undefined>> => {
			const stored: E2eRelationWritePostEntity = await manager.findOneOrFail(E2eRelationWritePostEntity, { relations: { author: true, editor: true, reviewer: true }, where: { id: POST } });

			return { author: stored.author?.id ?? null, editor: stored.editor.id, reviewer: stored.reviewer?.id ?? null };
		};

		beforeAll(async () => {
			const moduleReference = await Test.createTestingModule({
				controllers: [E2eRelationWriteCompositeController, E2eRelationWriteDefaultController, E2eRelationWriteIncludeController],
				imports: [
					TypeOrmModule.forRoot({
						...(await options.createDataSourceOptions()),
						dropSchema: true,
						entities: [E2eRelationWriteAuthorEntity, E2eRelationWriteCompositeEntity, E2eRelationWritePostEntity, E2eRelationWriteTagEntity],
						logging: false,
						synchronize: true,
					} as DataSourceOptions),
					TypeOrmModule.forFeature([E2eRelationWriteCompositeEntity, E2eRelationWritePostEntity]),
					ApiAuthorizationModule.forRoot(),
					ApiSubscriberModule,
				],
				providers: [E2eRelationWriteCompositeService, E2eRelationWritePostService],
			}).compile();

			app = moduleReference.createNestApplication(new FastifyAdapter());
			await app.init();
			document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
			schemas = createRelationReferenceSchemaChecker(document);
			fastify = app.getHttpAdapter().getInstance();
			({ manager } = app.get(E2eRelationWritePostService).repository);
			await manager.save(E2eRelationWriteAuthorEntity, [
				{ code: "first", id: AUTHOR_FIRST, secret: "SECRET" },
				{ code: "second", id: AUTHOR_SECOND, secret: "SECRET" },
			]);
			await manager.save(E2eRelationWriteTagEntity, { code: "tag", id: TAG });
		});

		beforeEach(async () => {
			const author: E2eRelationWriteAuthorEntity = await manager.findOneByOrFail(E2eRelationWriteAuthorEntity, { id: AUTHOR_FIRST });
			const tag: E2eRelationWriteTagEntity = await manager.findOneByOrFail(E2eRelationWriteTagEntity, { id: TAG });

			await manager.save(E2eRelationWritePostEntity, { author, editor: author, id: POST, labels: [tag], reviewer: author, tags: [tag], title: "title" });
		});

		afterAll(async () => {
			await app?.close();
			await options.stop?.();
		});

		describe.each([DEFAULT_PATH, INCLUDE_PATH])("/%s", (path: string) => {
			it.each(WRITE_CASES)("$verb with $label stores it and answers exactly as GET does", async ({ payload, stored, verb }: IWriteCase) => {
				const response = await fastify.inject({ method: verb, payload, url: `/${path}/${POST}` });

				expect(response.statusCode, response.body).toBe(HttpStatus.OK);
				expect(await readStored()).toMatchObject(stored);

				const read = await fastify.inject({ method: "GET", url: `/${path}/${POST}` });

				expect(response.json()).toEqual(read.json());
				schemas.expectWireMatchesSchema(schemas.getResponseSchema(path, false, verb.toLowerCase() as "patch" | "put"), response.json(), `${verb} response`);
				expect(response.body).not.toContain("SECRET");
			});
		});

		describe("a route whose response config loads no relation", () => {
			it.each(WRITE_CASES)("$verb with $label sends no relation the route does not load", async ({ payload, verb }: IWriteCase) => {
				const body: Record<string, unknown> = (await fastify.inject({ method: verb, payload, url: `/${DEFAULT_PATH}/${POST}` })).json();

				for (const relation of ["author", "editor", "tags"]) {
					expect(Object.keys(body)).not.toContain(relation);
				}
			});

			it("sends an eager to-one and to-many as references with their stored values", async () => {
				const body: Record<string, unknown> = (await fastify.inject({ method: "PATCH", payload: { reviewer: AUTHOR_SECOND }, url: `/${DEFAULT_PATH}/${POST}` })).json();

				expect(body.reviewer).toEqual({ id: AUTHOR_SECOND });
				expect(body.labels).toEqual([{ id: TAG }]);
			});

			it.each<[TVerb, Record<string, unknown>]>([
				["PATCH", { tags: [TAG] }],
				["PUT", { editor: AUTHOR_FIRST, tags: [TAG], title: "changed" }],
			])("%s still refuses a to-many key, so it has no echo to drop", async (verb: TVerb, payload: Record<string, unknown>) => {
				const response = await fastify.inject({ method: verb, payload, url: `/${DEFAULT_PATH}/${POST}` });

				expect(response.statusCode, response.body).toBe(HttpStatus.BAD_REQUEST);
			});
		});

		describe("a route that loads some relations", () => {
			it("does not echo a relation outside its include", async () => {
				const body: Record<string, unknown> = (await fastify.inject({ method: "PATCH", payload: { editor: AUTHOR_SECOND }, url: `/${INCLUDE_PATH}/${POST}` })).json();

				expect(Object.keys(body)).not.toContain("editor");
				expect(body.author).toEqual({ id: AUTHOR_FIRST });
			});

			it("sends the included relation the write changed", async () => {
				const body: Record<string, unknown> = (await fastify.inject({ method: "PATCH", payload: { author: AUTHOR_SECOND }, url: `/${INCLUDE_PATH}/${POST}` })).json();

				expect(body.author).toEqual({ id: AUTHOR_SECOND });
			});
		});

		describe("a primary key of several columns on a route that knows one of them", () => {
			it.each<[TVerb, Record<string, unknown>]>([
				["PATCH", { title: "changed" }],
				["PUT", { title: "changed" }],
			])("%s answers with the row it wrote, not another row with the same known column", async (verb: TVerb, payload: Record<string, unknown>) => {
				await manager.save(E2eRelationWriteCompositeEntity, [
					{ id: COMPOSITE_ID, part: "first", title: "title" },
					{ id: COMPOSITE_ID, part: "second", title: "title" },
				]);

				const response = await fastify.inject({ method: verb, payload, url: `/relation-write-composite-rows/${COMPOSITE_ID}` });

				expect(response.statusCode, response.body).toBe(HttpStatus.OK);
				expect(response.json()).toMatchObject({ title: "changed" });
			});
		});
	});
}
