import "reflect-metadata";

import type { ArgumentsHost, INestApplication } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { ValidationError } from "class-validator";
import type { Logger } from "typeorm";

import { BadRequestException, Catch, HttpStatus, ValidationPipe } from "@nestjs/common";
import { BaseExceptionFilter, HttpAdapterHost } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiRequestValidationGetErrors, ApiSubscriberModule } from "../../src/index";
import { E2eUuidCanonicalItemController, E2eUuidCanonicalItemEntity, E2eUuidCanonicalItemService, E2eUuidCanonicalParentEntity, E2eUuidCanonicalParentService } from "./uuid-canonical";

type TUuidCanonicalFastify = { inject: (options: { method: string; payload?: Record<string, unknown>; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };

interface IUuidCanonicalAnswer {
	body: unknown;
	queries: Array<string>;
	status: number;
}

const ENTITIES: Array<new () => unknown> = [E2eUuidCanonicalParentEntity, E2eUuidCanonicalItemEntity];
const OWNER_ID: string = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER_OWNER_ID: string = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PARENT_ID: string = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const MIXED_OWNER_ID: string = "Aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const CORE_RULES: Record<string, string> = { uuidNotCanonical: "UUID_NOT_CANONICAL" };

/**
 * The exception factory of a host with its own error contract, as Core has it on its ValidationPipe.
 * @param {Array<ValidationError>} errors - Validation failures.
 * @returns {BadRequestException} The host's answer.
 */
function coreExceptionFactory(errors: Array<ValidationError>): BadRequestException {
	return new BadRequestException({ code: "VALIDATION_FAILED", errors: errors.flatMap((error: ValidationError): Array<{ path: string; rule: string }> => Object.keys(error.constraints ?? {}).map((constraint: string): { path: string; rule: string } => ({ path: error.property, rule: CORE_RULES[constraint] ?? constraint }))) });
}

// Translates a refusal raised ahead of the pipe with the same factory the pipe uses.
@Catch()
class E2eUuidCanonicalCoreFilter extends BaseExceptionFilter {
	public override catch(exception: unknown, host: ArgumentsHost): void {
		const errors: Array<ValidationError> | undefined = ApiRequestValidationGetErrors(exception);

		super.catch(errors ? coreExceptionFactory(errors) : exception, host);
	}
}

class E2eUuidCanonicalQueryLogger implements Logger {
	public readonly queries: Array<string> = [];

	public log(): void {}

	public logMigration(): void {}

	public logQuery(query: string): void {
		this.queries.push(query);
	}

	public logQueryError(_error: Error | string, query: string): void {
		this.queries.push(query);
	}

	public logQuerySlow(): void {}

	public logSchemaBuild(): void {}
}

describe.each([
	{ databaseName: "SQLite", isPostgres: false },
	{ databaseName: "PostgreSQL", isPostgres: true },
])("canonical request UUIDs on $databaseName (E2E)", ({ isPostgres }: { databaseName: string; isPostgres: boolean }) => {
	let container: StartedPostgreSqlContainer | undefined;

	beforeAll(async () => {
		if (isPostgres) {
			container = await new PostgreSqlContainer("postgres:17-alpine").start();
		}
	}, 240_000);

	afterAll(async () => {
		await container?.stop();
	});

	describe.each([
		{ hasFilter: false, pipe: "none" },
		{ hasFilter: false, pipe: "core" },
		{ hasFilter: true, pipe: "none" },
		{ hasFilter: true, pipe: "core" },
	])("host pipe: $pipe, host filter: $hasFilter", ({ hasFilter, pipe }: { hasFilter: boolean; pipe: string }) => {
		let app: INestApplication | undefined;
		let fastify: TUuidCanonicalFastify;
		let logger: E2eUuidCanonicalQueryLogger;
		let itemId: string;

		/**
		 * Sends one request and returns its answer with the SQL it ran.
		 * @param {string} method - HTTP method.
		 * @param {string} url - Request URL.
		 * @param {Record<string, unknown>} [payload] - Request body.
		 * @returns {Promise<IUuidCanonicalAnswer>} Status, body and SQL of the request.
		 */
		const send = async (method: string, url: string, payload?: Record<string, unknown>): Promise<IUuidCanonicalAnswer> => {
			const queryCount: number = logger.queries.length;
			const response = await fastify.inject({ method, payload, url });

			return { body: response.json(), queries: logger.queries.slice(queryCount), status: response.statusCode };
		};

		/**
		 * The 400 body of a refused UUID, as the host answers it.
		 * @param {Array<string>} paths - Paths of the refused values.
		 * @returns {unknown} The expected body.
		 */
		const refusal = (paths: Array<string>): unknown => (hasFilter ? { code: "VALIDATION_FAILED", errors: paths.map((path: string) => ({ path, rule: "UUID_NOT_CANONICAL" })) } : { error: "Bad Request", message: paths.map((path: string) => `${path} must be a lower-case UUID`), statusCode: HttpStatus.BAD_REQUEST });

		const readRows = async (): Promise<Array<E2eUuidCanonicalItemEntity>> => await app!.get(E2eUuidCanonicalItemService).repository.find({ order: { label: "ASC" }, relations: { parent: true } });

		beforeAll(async () => {
			logger = new E2eUuidCanonicalQueryLogger();
			const moduleReference = await Test.createTestingModule({
				controllers: [E2eUuidCanonicalItemController],
				imports: [TypeOrmModule.forRoot({ ...(container ? { type: "postgres", url: container.getConnectionUri() } : { database: ":memory:", type: "better-sqlite3" }), dropSchema: true, entities: ENTITIES, logger, logging: ["query", "error"], synchronize: true } as never), TypeOrmModule.forFeature(ENTITIES), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
				providers: [E2eUuidCanonicalItemService, E2eUuidCanonicalParentService],
			}).compile();

			app = moduleReference.createNestApplication(new FastifyAdapter(), { logger: false });

			if (pipe === "core") {
				app.useGlobalPipes(new ValidationPipe({ exceptionFactory: coreExceptionFactory, transform: true }));
			}

			if (hasFilter) {
				app.useGlobalFilters(new E2eUuidCanonicalCoreFilter(app.get(HttpAdapterHost).httpAdapter));
			}

			await app.init();
			fastify = app.getHttpAdapter().getInstance() as unknown as TUuidCanonicalFastify;
			await app.get(E2eUuidCanonicalParentService).repository.save({ id: PARENT_ID, label: "parent" });
		}, 240_000);

		beforeEach(async () => {
			await app!.get(E2eUuidCanonicalItemService).repository.clear();
			itemId = (await app!.get(E2eUuidCanonicalItemService).repository.save({ label: "a-seeded", ownerId: OWNER_ID })).id;
			E2eUuidCanonicalItemController.HANDLED.length = 0;
		});

		afterAll(async () => {
			await app?.close();
		});

		it.each([OWNER_ID.toUpperCase(), MIXED_OWNER_ID])("refuses POST with the body UUID %s before any SQL, and creates no row", async (ownerId: string) => {
			const answer: IUuidCanonicalAnswer = await send("POST", "/uuid-canonical/items", { label: "b-created", ownerId });

			expect(answer).toEqual({ body: refusal(["ownerId"]), queries: [], status: HttpStatus.BAD_REQUEST });
			expect((await readRows()).map((row: E2eUuidCanonicalItemEntity) => row.label)).toEqual(["a-seeded"]);
		});

		it("refuses POST with an upper-case relation key, under the relation name", async () => {
			const answer: IUuidCanonicalAnswer = await send("POST", "/uuid-canonical/items", { label: "b-created", ownerId: OWNER_ID, parent: PARENT_ID.toUpperCase() });

			expect(answer).toEqual({ body: refusal(["parent"]), queries: [], status: HttpStatus.BAD_REQUEST });
			expect(await readRows()).toHaveLength(1);
		});

		it("creates a row with lower-case UUIDs, stored as sent", async () => {
			const answer: IUuidCanonicalAnswer = await send("POST", "/uuid-canonical/items", { label: "b-created", ownerId: OTHER_OWNER_ID, parent: PARENT_ID });

			expect(answer.status).toBe(HttpStatus.CREATED);
			expect(answer.body).toMatchObject({ label: "b-created", ownerId: OTHER_OWNER_ID });
			expect((await readRows())[1]).toMatchObject({ label: "b-created", ownerId: OTHER_OWNER_ID, parent: { id: PARENT_ID } });
		});

		it("refuses PATCH with an upper-case body UUID before any SQL, and leaves the row unchanged", async () => {
			const answer: IUuidCanonicalAnswer = await send("PATCH", `/uuid-canonical/items/${itemId}`, { ownerId: OTHER_OWNER_ID.toUpperCase() });

			expect(answer).toEqual({ body: refusal(["ownerId"]), queries: [], status: HttpStatus.BAD_REQUEST });
			expect(await readRows()).toEqual([expect.objectContaining({ id: itemId, ownerId: OWNER_ID })]);
		});

		it("updates a row with a lower-case body UUID", async () => {
			const answer: IUuidCanonicalAnswer = await send("PATCH", `/uuid-canonical/items/${itemId}`, { ownerId: OTHER_OWNER_ID });

			expect(answer.status).toBe(HttpStatus.OK);
			expect(await readRows()).toEqual([expect.objectContaining({ id: itemId, ownerId: OTHER_OWNER_ID })]);
		});

		it.each([`ownerId[operator]=eq&ownerId[value]=${OWNER_ID.toUpperCase()}`, `ownerId[operator]=in&ownerId[values]=${OWNER_ID}&ownerId[values]=${MIXED_OWNER_ID}`])("refuses the GET_LIST filter %s with FILTER_NOT_VALID before any SQL", async (filter: string) => {
			const answer: IUuidCanonicalAnswer = await send("GET", `/uuid-canonical/items?${filter}&limit=10&page=1`);

			expect({ queries: answer.queries, status: answer.status }).toEqual({ queries: [], status: HttpStatus.BAD_REQUEST });
			expect(JSON.stringify(answer.body)).toContain("FILTER_NOT_VALID");
		});

		it("filters GET_LIST by a lower-case UUID", async () => {
			const answer: IUuidCanonicalAnswer = await send("GET", `/uuid-canonical/items?ownerId[operator]=eq&ownerId[value]=${OWNER_ID}&limit=10&page=1`);

			expect(answer.status).toBe(HttpStatus.OK);
			expect(answer.body).toMatchObject({ items: [{ id: itemId, ownerId: OWNER_ID }] });
		});

		it("refuses an upper-case UUID in the query of a custom route before its handler", async () => {
			const answer: IUuidCanonicalAnswer = await send("GET", `/uuid-canonical/items/custom/echo?ownerId=${OWNER_ID.toUpperCase()}`);

			expect(answer).toEqual({ body: refusal(["ownerId"]), queries: [], status: HttpStatus.BAD_REQUEST });
			expect(E2eUuidCanonicalItemController.HANDLED).toEqual([]);
		});

		it("refuses upper-case UUIDs in the body of a custom route, nested ones under their path", async () => {
			const answer: IUuidCanonicalAnswer = await send("POST", "/uuid-canonical/items/custom/echo", { items: [{ id: OWNER_ID }, { id: OTHER_OWNER_ID.toUpperCase() }], parentId: PARENT_ID.toUpperCase() });

			expect(answer).toEqual({ body: refusal(["items.1.id", "parentId"]), queries: [], status: HttpStatus.BAD_REQUEST });
			expect(E2eUuidCanonicalItemController.HANDLED).toEqual([]);
		});

		it("hands lower-case UUIDs of a custom route to its handler as sent", async () => {
			expect(await send("GET", `/uuid-canonical/items/custom/echo?ownerId=${OWNER_ID}`)).toMatchObject({ body: { value: JSON.stringify({ ownerId: OWNER_ID }) }, status: HttpStatus.OK });
			expect(await send("POST", "/uuid-canonical/items/custom/echo", { items: [{ id: OWNER_ID }], parentId: PARENT_ID })).toMatchObject({ body: { value: JSON.stringify({ items: [{ id: OWNER_ID }], parentId: PARENT_ID }) }, status: HttpStatus.OK });
		});
	});
});
