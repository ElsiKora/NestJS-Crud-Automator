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

import { E2eRelationWriteDefaultController, E2eRelationWriteIncludeController, E2eRelationWriteNoteController, E2eRelationWriteNotePatchController, E2eRelationWriteStampController, E2eRelationWriteTicketController } from "./controller";
import { E2eRelationWriteAuthorEntity, E2eRelationWriteNoteEntity, E2eRelationWritePostEntity, E2eRelationWriteStampEntity, E2eRelationWriteTagEntity, E2eRelationWriteTicketEntity } from "./entity";
import { E2eRelationWriteNotePatchService, E2eRelationWriteNoteService, E2eRelationWritePostService, E2eRelationWriteStampService, E2eRelationWriteTicketService } from "./service";
import { E2eRelationWriteNoteSubscriber, E2eRelationWriteTicketSubscriber, noteUpdateResult, ticketCreateResult } from "./subscriber";

const AUTHOR_FIRST: string = "11111111-1111-4111-8111-111111111111";
const AUTHOR_SECOND: string = "11111111-1111-4111-8111-111111111112";
const NOTE: string = "cccccccc-cccc-4ccc-8ccc-ccccccccccc1";
const NOTE_OTHER: string = "cccccccc-cccc-4ccc-8ccc-ccccccccccc2";
const NOTE_OTHER_TITLE: string = "OTHER-ROW-SECRET";
const STAMP: string = "2026-11-02T10:00:00.123456Z";
const DEFAULT_PATH: string = "relation-write-default-posts";
const INCLUDE_PATH: string = "relation-write-include-posts";
const POST: string = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const TAG: string = "33333333-3333-4333-8333-333333333331";
const TICKET_OTHER: string = "dddddddd-dddd-4ddd-8ddd-ddddddddddd2";

type TStoredKey = "author" | "editor" | "reviewer";
type TVerb = "PATCH" | "PUT";

interface IRelationWriteSuiteOptions {
	createDataSourceOptions: () => Promise<DataSourceOptions>;
	hasMicrosecondTimestamps?: boolean;
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
			const stampControllers: Array<new (...arguments_: Array<never>) => object> = options.hasMicrosecondTimestamps ? [E2eRelationWriteStampController] : [];
			const moduleReference = await Test.createTestingModule({
				controllers: [E2eRelationWriteDefaultController, E2eRelationWriteIncludeController, E2eRelationWriteNoteController, E2eRelationWriteNotePatchController, E2eRelationWriteTicketController, ...stampControllers],
				imports: [
					TypeOrmModule.forRoot({
						...(await options.createDataSourceOptions()),
						dropSchema: true,
						entities: [E2eRelationWriteAuthorEntity, E2eRelationWriteNoteEntity, E2eRelationWritePostEntity, E2eRelationWriteTagEntity, E2eRelationWriteTicketEntity, ...(options.hasMicrosecondTimestamps ? [E2eRelationWriteStampEntity] : [])],
						logging: false,
						synchronize: true,
					} as DataSourceOptions),
					TypeOrmModule.forFeature([E2eRelationWriteNoteEntity, E2eRelationWritePostEntity, E2eRelationWriteTicketEntity, ...(options.hasMicrosecondTimestamps ? [E2eRelationWriteStampEntity] : [])]),
					ApiAuthorizationModule.forRoot(),
					ApiSubscriberModule,
				],
				providers: [E2eRelationWriteNotePatchService, E2eRelationWriteNoteService, E2eRelationWriteNoteSubscriber, E2eRelationWritePostService, E2eRelationWriteTicketService, E2eRelationWriteTicketSubscriber, ...(options.hasMicrosecondTimestamps ? [E2eRelationWriteStampService] : [])],
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
			// A plain DELETE and INSERT, so the @AfterLoad of a note cannot redirect the setup to another row.
			await manager.query(`DELETE FROM e2e_relation_write_notes`);
			await manager.insert(E2eRelationWriteNoteEntity, [
				{ id: NOTE, presentedId: null, title: "Note" },
				{ id: NOTE_OTHER, presentedId: null, title: NOTE_OTHER_TITLE },
			]);
			await manager.query(`DELETE FROM e2e_relation_write_tickets`);
			await manager.insert(E2eRelationWriteTicketEntity, { id: TICKET_OTHER, presentedId: null, title: NOTE_OTHER_TITLE });
			delete noteUpdateResult.replace;
			delete ticketCreateResult.replace;
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

		describe("a function onAfterUpdate or a loaded entity that presents another key", () => {
			const readNoteTitles = async (): Promise<Record<string, string>> => Object.fromEntries(((await manager.query(`SELECT id, title FROM e2e_relation_write_notes`)) as Array<{ id: string; title: string }>).map(({ id, title }: { id: string; title: string }): [string, string] => [id, title]));

			it.each<TVerb>(["PATCH", "PUT"])("%s answers with the written row when onAfterUpdate returns a partial result", async (verb: TVerb) => {
				noteUpdateResult.replace = (): E2eRelationWriteNoteEntity => ({ title: "Partial" }) as E2eRelationWriteNoteEntity;

				const response = await fastify.inject({ method: verb, payload: { title: "Changed" }, url: `/relation-write-notes/${NOTE}` });

				expect(response.statusCode, response.body).toBe(HttpStatus.OK);
				expect(response.json()).toEqual({ id: NOTE, title: "Changed" });
			});

			it.each<TVerb>(["PATCH", "PUT"])("%s answers with the written row, not the row whose key onAfterUpdate returns", async (verb: TVerb) => {
				noteUpdateResult.replace = (): E2eRelationWriteNoteEntity => ({ id: NOTE_OTHER, title: NOTE_OTHER_TITLE }) as E2eRelationWriteNoteEntity;

				const response = await fastify.inject({ method: verb, payload: { title: "Changed" }, url: `/relation-write-notes/${NOTE}` });

				expect(response.statusCode, response.body).toBe(HttpStatus.OK);
				expect(response.json()).toEqual({ id: NOTE, title: "Changed" });
				expect(response.body).not.toContain(NOTE_OTHER_TITLE);
			});

			it.each<TVerb>(["PATCH", "PUT"])("%s drops a change that onAfterUpdate makes to the result in place", async (verb: TVerb) => {
				noteUpdateResult.replace = (context): E2eRelationWriteNoteEntity => {
					context.result.title = "Masked";

					return context.result;
				};

				const response = await fastify.inject({ method: verb, payload: { title: "Changed" }, url: `/relation-write-notes/${NOTE}` });

				expect(response.statusCode, response.body).toBe(HttpStatus.OK);
				expect(response.json()).toEqual({ id: NOTE, title: "Changed" });
			});

			it.each<TVerb>(["PATCH", "PUT"])("%s reads the written row by the key of the request when an @AfterLoad presents another key", async (verb: TVerb) => {
				await manager.update(E2eRelationWriteNoteEntity, { id: NOTE }, { presentedId: NOTE_OTHER });

				const response = await fastify.inject({ method: verb, payload: { title: "Changed" }, url: `/relation-write-patch-notes/${NOTE}` });

				expect(response.statusCode, response.body).toBe(HttpStatus.OK);
				expect(await readNoteTitles()).toEqual({ [NOTE]: "Changed", [NOTE_OTHER]: NOTE_OTHER_TITLE });
				expect(response.json()).toMatchObject({ title: "Changed" });
				expect(response.body).not.toContain(NOTE_OTHER_TITLE);
			});
		});

		describe("a function onAfterCreate or a loaded entity that presents another key", () => {
			const createTicket = async (): Promise<{ body: string; json: () => Record<string, unknown>; statusCode: number }> => await fastify.inject({ method: "POST", payload: { title: "Created" }, url: "/relation-write-tickets" });

			const readCreatedTicket = async (): Promise<{ id: string; title: string }> => {
				const rows: Array<{ id: string; title: string }> = (await manager.query(`SELECT id, title FROM e2e_relation_write_tickets WHERE id <> '${TICKET_OTHER}'`)) as Array<{ id: string; title: string }>;

				const [row] = rows;

				expect(rows).toHaveLength(1);

				return row as { id: string; title: string };
			};

			it("answers with the inserted row, read by its generated key", async () => {
				const response = await createTicket();

				expect(response.statusCode, response.body).toBe(HttpStatus.CREATED);
				expect(response.json()).toEqual(await readCreatedTicket());
			});

			it("answers with the inserted row when onAfterCreate returns a partial result", async () => {
				ticketCreateResult.replace = (): Promise<E2eRelationWriteTicketEntity> => Promise.resolve({ title: "Partial" } as E2eRelationWriteTicketEntity);

				const response = await createTicket();

				expect(response.statusCode, response.body).toBe(HttpStatus.CREATED);
				expect(response.json()).toEqual({ ...(await readCreatedTicket()), title: "Created" });
				expect(response.body).not.toContain(NOTE_OTHER_TITLE);
			});

			it("answers with the inserted row, not the row whose key onAfterCreate returns", async () => {
				ticketCreateResult.replace = (): Promise<E2eRelationWriteTicketEntity> => Promise.resolve({ id: TICKET_OTHER, title: NOTE_OTHER_TITLE } as E2eRelationWriteTicketEntity);

				const response = await createTicket();

				expect(response.statusCode, response.body).toBe(HttpStatus.CREATED);
				expect(response.json()).toEqual({ ...(await readCreatedTicket()), title: "Created" });
				expect(response.body).not.toContain(NOTE_OTHER_TITLE);
			});

			it("drops a change that onAfterCreate makes to the result in place", async () => {
				ticketCreateResult.replace = (context): Promise<E2eRelationWriteTicketEntity> => {
					context.result.title = "Masked";

					return Promise.resolve(context.result);
				};

				const response = await createTicket();

				expect(response.statusCode, response.body).toBe(HttpStatus.CREATED);
				expect(response.json()).toEqual({ ...(await readCreatedTicket()), title: "Created" });
			});

			it("reads the inserted row by its own key when onAfterCreate reloads it and an @AfterLoad presents another key", async () => {
				ticketCreateResult.replace = async (context): Promise<E2eRelationWriteTicketEntity> => {
					await context.DATA.repository.update({ id: context.result.id }, { presentedId: TICKET_OTHER });

					return await context.DATA.repository.findOneByOrFail({ id: context.result.id });
				};

				const response = await createTicket();

				expect(response.statusCode, response.body).toBe(HttpStatus.CREATED);
				expect(await readCreatedTicket()).toMatchObject({ title: "Created" });
				expect(response.json()).toMatchObject({ title: "Created" });
				expect(response.body).not.toContain(NOTE_OTHER_TITLE);
			});
		});

		describe.runIf(options.hasMicrosecondTimestamps)("a key the entity holds with less precision than the database", () => {
			it.each<TVerb>(["PATCH", "PUT"])("%s answers with the written row of a microsecond timestamptz key", async (verb: TVerb) => {
				await manager.query(`DELETE FROM e2e_relation_write_stamps`);
				await manager.query(`INSERT INTO e2e_relation_write_stamps (stamp, title) VALUES ($1, 'Stamp')`, [STAMP]);

				const response = await fastify.inject({ method: verb, payload: { title: "Changed" }, url: `/relation-write-stamps/${STAMP}` });

				expect(response.statusCode, response.body).toBe(HttpStatus.OK);
				expect(response.json()).toMatchObject({ title: "Changed" });
				expect(await manager.query(`SELECT stamp::text AS stamp, title FROM e2e_relation_write_stamps`)).toEqual([{ stamp: "2026-11-02 10:00:00.123456+00", title: "Changed" }]);
			});
		});
	});
}
