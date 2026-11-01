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
import { E2eLegacyQueryItemController, E2eLegacyQueryItemEntity, E2eLegacyQueryItemService, E2eLegacyQueryTypedItemController, EE2eLegacyQueryStatus } from "./legacy-query";

class TemporalFormatQueryLogger implements Logger {
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

const PAGE: string = "limit=10&page=1&orderBy=label&orderDirection=asc";
const LIST_PATHS: Array<string> = ["/legacy-query/items", "/legacy-query/typed-items"];
const TIME_ZONES: Array<string> = ["America/New_York", "Asia/Kolkata"];

const DATE_TIME_ACCEPTED_CASES: Array<{ labels: Array<string>; query: string }> = [
	{ labels: ["Beta", "Gamma"], query: "createdAt[operator]=gt&createdAt[value]=2024-01-15T00:00:00.000Z" },
	{ labels: ["Gamma"], query: "createdAt[operator]=gt&createdAt[value]=2024-02-15T12:30:45.123Z" },
];

const DATE_TIME_REJECTED_VALUES: Array<string> = ["2024-02-02T00:00:00Z", encodeURIComponent("2024-02-02T00:00:00.000+05:30"), "2024-02-02T00:00:00.000", "2024-02-02", "2024-02-02T00:00:00X000Z", "2024-02-30T00:00:00.000Z", "2024-02-02T24:00:00.000Z", "2024-02-02T00:00:60.000Z", "1706832000000", "Feb%202%202024", ""];

describe.each([
	{ databaseName: "SQLite", isPostgres: false },
	{ databaseName: "PostgreSQL", isPostgres: true },
])("GET_LIST date-time and time filters follow the published format on $databaseName (E2E)", ({ isPostgres }: { databaseName: string; isPostgres: boolean }) => {
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
		let app: INestApplication | undefined;
		let fastify: { inject: (options: { method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };
		const queryLogger: TemporalFormatQueryLogger = new TemporalFormatQueryLogger();

		beforeAll(async () => {
			const entities: Array<new () => unknown> = [E2eLegacyQueryItemEntity];
			const moduleReference = await Test.createTestingModule({
				controllers: [E2eLegacyQueryItemController, E2eLegacyQueryTypedItemController],
				imports: [TypeOrmModule.forRoot(container ? { dropSchema: true, entities, logger: queryLogger, logging: ["query", "error"], synchronize: true, type: "postgres", url: container.getConnectionUri() } : { database: ":memory:", dropSchema: true, entities, logger: queryLogger, logging: ["query", "error"], synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
				providers: [E2eLegacyQueryItemService],
			}).compile();

			app = moduleReference.createNestApplication(new FastifyAdapter());

			if (createPipe) {
				app.useGlobalPipes(createPipe());
			}

			await app.init();
			fastify = app.getHttpAdapter().getInstance();

			await app.get(E2eLegacyQueryItemService).repository.save([
				{ createdAt: new Date("2024-01-01T00:00:00.000Z"), isFeatured: true, label: "Alpha", note: "Noted", rank: 1, releasedOn: "2024-01-01", status: EE2eLegacyQueryStatus.ACTIVE, undescribed: "z", unsortable: "z" },
				{ createdAt: new Date("2024-02-02T00:00:00.000Z"), isFeatured: false, label: "Beta", rank: 2, releasedOn: "2024-02-02", status: EE2eLegacyQueryStatus.ARCHIVED, undescribed: "y", unsortable: "y" },
				{ createdAt: new Date("2024-03-03T00:00:00.000Z"), isFeatured: false, label: "Gamma", rank: 3, releasedOn: "2024-03-03", status: EE2eLegacyQueryStatus.ACTIVE, undescribed: "x", unsortable: "x" },
			] as Array<E2eLegacyQueryItemEntity>);
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
			describe.each(LIST_PATHS)("on %s", (path: string) => {
				it.each(DATE_TIME_ACCEPTED_CASES)("accepts the published date-time form in $query", async ({ labels, query }: { labels: Array<string>; query: string }) => {
					process.env.TZ = timeZone;

					const response = await fastify.inject({ method: "GET", url: `${path}?${PAGE}&${query}` });

					expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
					expect((response.json() as { items: Array<{ label: string }> }).items.map((item: { label: string }): string => item.label)).toEqual(labels);
				});

				it.each(DATE_TIME_REJECTED_VALUES)("answers createdAt[value]=%s with 400 before any SQL", async (value: string) => {
					process.env.TZ = timeZone;

					const response = await fastify.inject({ method: "GET", url: `${path}?${PAGE}&createdAt[operator]=gt&createdAt[value]=${value}` });

					expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.BAD_REQUEST);
					expect(response.json()).toEqual({ error: "Bad Request", message: expect.anything(), statusCode: HttpStatus.BAD_REQUEST });
					expect(queryLogger.queries).toEqual([]);
				});
			});
		});
	});
});
