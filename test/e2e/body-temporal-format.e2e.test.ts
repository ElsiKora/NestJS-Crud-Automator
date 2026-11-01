import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { Logger } from "typeorm";

import { HttpStatus, ValidationPipe } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../src/index";
import { E2eBodyTemporalEventController, E2eBodyTemporalEventEntity, E2eBodyTemporalEventService } from "./body-temporal";

class BodyTemporalQueryLogger implements Logger {
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

interface IHostPipeCase {
	createPipe?: () => ValidationPipe;
	name: string;
}

interface IInjectResponse {
	json: () => unknown;
	statusCode: number;
}

interface IRejectedCase {
	message: string;
	property: TTemporalProperty;
	value: unknown;
}

interface IWriteCase {
	method: "PATCH" | "POST" | "PUT";
	status: HttpStatus;
}

type TTemporalBody = Record<TTemporalProperty, string>;

type TTemporalProperty = "happensOn" | "opensAt" | "startsAt";

const TIME_ZONES: Array<string> = ["America/New_York", "Asia/Kolkata"];

const WRITTEN: TTemporalBody = { happensOn: "2026-03-01", opensAt: "09:30:00", startsAt: "2026-03-01T12:34:56.789Z" };

const SEEDED: TTemporalBody = { happensOn: "2025-07-15", opensAt: "18:00:00", startsAt: "2025-07-15T08:00:00.000Z" };

const WRITE_CASES: Array<IWriteCase> = [
	{ method: "POST", status: HttpStatus.CREATED },
	{ method: "PUT", status: HttpStatus.OK },
	{ method: "PATCH", status: HttpStatus.OK },
];

const DATE_MESSAGE: string = "happensOn must be in YYYY-MM-DD format";
const DATE_TIME_MESSAGE: string = "startsAt must be in YYYY-MM-DDTHH:mm:ss.sssZ format";
const TIME_MESSAGE: string = "opensAt must be in HH:mm:ss format";

const REJECTED_CASES: Array<IRejectedCase> = [
	...["2026-02-30", "2026-13-01", "2026-03-01T00:00:00.000Z", "2026-03-01T00:00:00", "20260301", "2026-3-1", "Mar 1 2026", "", 20_260_301, ["2026-03-01"]].map((value: unknown): IRejectedCase => ({ message: DATE_MESSAGE, property: "happensOn", value })),
	...["2026-03-01T12:34:56Z", "2026-03-01T12:34:56.789+01:00", "2026-03-01T12:34:56.789", "2026-03-01", "2026-02-30T12:00:00.000Z", "2026-03-01T24:00:00.000Z", "2026-03-01T12:34:56X789Z", "Mar 1 2026", "March 1 2026", "1", "", 0, 1_772_368_496_789, ["2026-03-01T12:34:56.789Z"]].map((value: unknown): IRejectedCase => ({ message: DATE_TIME_MESSAGE, property: "startsAt", value })),
	...["24:00:00", "12:60:00", "12:30:60", "9:30:00", "09:30", "09:30:00.000", "09:30:00Z", "2026-03-01T09:30:00.000Z", "", 930, ["09:30:00"]].map((value: unknown): IRejectedCase => ({ message: TIME_MESSAGE, property: "opensAt", value })),
];

describe.each([
	{ databaseName: "SQLite", isPostgres: false },
	{ databaseName: "PostgreSQL", isPostgres: true },
])("CREATE, UPDATE and PARTIAL_UPDATE temporal body fields on $databaseName (E2E)", ({ isPostgres }: { databaseName: string; isPostgres: boolean }) => {
	let container: StartedPostgreSqlContainer | undefined;

	beforeAll(async () => {
		if (isPostgres) {
			container = await new PostgreSqlContainer("postgres:17-alpine").start();
		}
	}, 120_000);

	afterAll(async () => {
		await container?.stop();
	});

	describe.each<IHostPipeCase>([{ name: "no host pipe" }, { createPipe: () => new ValidationPipe(), name: "a default host ValidationPipe" }, { createPipe: () => new ValidationPipe({ transform: true, whitelist: true }), name: "a transforming, whitelisting host ValidationPipe" }])("with $name", ({ createPipe }: IHostPipeCase) => {
		const originalTimeZone: string | undefined = process.env.TZ;
		const queryLogger: BodyTemporalQueryLogger = new BodyTemporalQueryLogger();
		let app: INestApplication | undefined;
		let fastify: { inject: (options: { method: string; payload?: unknown; url: string }) => Promise<IInjectResponse> };
		let service: E2eBodyTemporalEventService;

		const seed = async (): Promise<string> => {
			const saved: E2eBodyTemporalEventEntity = await service.repository.save({ ...SEEDED, label: "Seeded", startsAt: new Date(SEEDED.startsAt) } as E2eBodyTemporalEventEntity);

			return saved.id;
		};

		const write = async (method: IWriteCase["method"], body: Record<string, unknown>): Promise<IInjectResponse> => {
			if (method === "POST") {
				return await fastify.inject({ method, payload: { label: "Written", ...WRITTEN, ...body }, url: "/body-temporal/events" });
			}

			const id: string = await seed();

			return await fastify.inject({ method, payload: method === "PUT" ? { label: "Written", ...WRITTEN, ...body } : body, url: `/body-temporal/events/${id}` });
		};

		const readTemporal = (source: unknown): TTemporalBody => {
			const record: Record<string, unknown> = source as Record<string, unknown>;

			return { happensOn: record.happensOn as string, opensAt: record.opensAt as string, startsAt: record.startsAt instanceof Date ? record.startsAt.toISOString() : (record.startsAt as string) };
		};

		beforeAll(async () => {
			const entities: Array<new () => unknown> = [E2eBodyTemporalEventEntity];
			const moduleReference = await Test.createTestingModule({
				controllers: [E2eBodyTemporalEventController],
				imports: [TypeOrmModule.forRoot(container ? { dropSchema: true, entities, logger: queryLogger, logging: ["query", "error"], synchronize: true, type: "postgres", url: container.getConnectionUri() } : { database: ":memory:", dropSchema: true, entities, logger: queryLogger, logging: ["query", "error"], synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
				providers: [E2eBodyTemporalEventService],
			}).compile();

			app = moduleReference.createNestApplication(new FastifyAdapter());

			if (createPipe) {
				app.useGlobalPipes(createPipe());
			}

			await app.init();
			fastify = app.getHttpAdapter().getInstance();
			service = app.get(E2eBodyTemporalEventService);
		});

		beforeEach(() => {
			queryLogger.queries.length = 0;
		});

		afterEach(() => {
			process.env.TZ = originalTimeZone;
		});

		afterAll(async () => {
			await app?.close();
		});

		describe.each(TIME_ZONES)("in %s", (timeZone: string) => {
			it.each(WRITE_CASES)("$method stores and returns every temporal field as written", async ({ method, status }: IWriteCase) => {
				process.env.TZ = timeZone;

				const response: IInjectResponse = await write(method, { ...WRITTEN });
				const body: Record<string, unknown> = response.json() as Record<string, unknown>;

				expect(response.statusCode, JSON.stringify(body)).toBe(status);
				expect(readTemporal(body)).toEqual(WRITTEN);

				const stored: E2eBodyTemporalEventEntity | null = await service.repository.findOneBy({ id: body.id as string });

				expect(readTemporal(stored)).toEqual(WRITTEN);

				const read: IInjectResponse = await fastify.inject({ method: "GET", url: `/body-temporal/events/${body.id as string}` });

				expect(read.statusCode, JSON.stringify(read.json())).toBe(HttpStatus.OK);
				expect(readTemporal(read.json())).toEqual(WRITTEN);
			});

			it("PATCH changes one temporal field and keeps the others as stored", async () => {
				process.env.TZ = timeZone;

				const response: IInjectResponse = await write("PATCH", { happensOn: WRITTEN.happensOn });

				expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
				expect(readTemporal(response.json())).toEqual({ ...SEEDED, happensOn: WRITTEN.happensOn });
			});

			describe.each(WRITE_CASES)("$method", ({ method }: IWriteCase) => {
				it.runIf(createPipe !== undefined).each(REJECTED_CASES)("answers $property = $value with 400 before any write", async ({ message, property, value }: IRejectedCase) => {
					process.env.TZ = timeZone;

					const id: string | undefined = method === "POST" ? undefined : await seed();

					queryLogger.queries.length = 0;

					const response: IInjectResponse = await fastify.inject({ method, payload: method === "PATCH" ? { [property]: value } : { label: "Written", ...WRITTEN, [property]: value }, url: id ? `/body-temporal/events/${id}` : "/body-temporal/events" });

					expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.BAD_REQUEST);
					expect(response.json()).toEqual({ error: "Bad Request", message: [message], statusCode: HttpStatus.BAD_REQUEST });
					expect(queryLogger.queries).toEqual([]);
				});
			});
		});
	});
});
