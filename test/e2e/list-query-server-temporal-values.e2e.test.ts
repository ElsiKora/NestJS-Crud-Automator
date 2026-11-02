import "reflect-metadata";

import type { INestApplication, Type } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";

import type { IServerTemporalEvent, IServerTemporalFixture } from "./list-query-server-temporal";

import { HttpStatus, ValidationPipe } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule, EFilterOperation } from "../../src/index";
import { createServerTemporalFixture, SERVER_TEMPORAL_REWRITES } from "./list-query-server-temporal";

interface IHostPipeCase {
	createPipe?: () => ValidationPipe;
	name: string;
}

type TInject = (options: { method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }>;

const ORIGINAL_TIMEZONE: string | undefined = process.env.TZ;
const TIMEZONES: ReadonlyArray<string> = ["America/New_York", "Asia/Kolkata"];
const FIELDS: ReadonlyArray<"happenedAt" | "stampedAt"> = ["happenedAt", "stampedAt"];
const ROUTES: ReadonlyArray<string> = ["/server-temporal/default-events", "/server-temporal/page-events"];
const PAGE: string = "limit=10&page=1&orderBy=label&orderDirection=asc";
const LOWER_BOUND: string = "2024-03-01T08:30:00.000Z";
const MIDDLE: string = "2024-03-01T09:30:00.000Z";
const UPPER_BOUND: string = "2024-03-01T10:30:00.000Z";
// Same-day instants an hour apart, so a filter compared as text instead of as an instant picks the wrong rows.
const ROWS: ReadonlyArray<IServerTemporalEvent> = [
	["Alpha", "2024-03-01T08:00:00.000Z"],
	["Beta", "2024-03-01T09:00:00.000Z"],
	["Gamma", "2024-03-01T10:00:00.000Z"],
	["Delta", "2024-03-01T11:00:00.000Z"],
].map(([label, instant]: Array<string>, index: number): IServerTemporalEvent => ({ happenedAt: new Date(instant as string), id: `00000000-0000-4000-8000-00000000000${String(index + 1)}`, label: label as string, stampedAt: new Date(instant as string) }));
const AFTER_MIDDLE: ReadonlyArray<string> = ["Delta", "Gamma"];
const WITHIN_BOUNDS: ReadonlyArray<string> = ["Beta", "Gamma"];

for (const field of FIELDS) {
	SERVER_TEMPORAL_REWRITES.set(`date-gte-${field}`, { field, operation: EFilterOperation.GTE, value: new Date(MIDDLE) });
	SERVER_TEMPORAL_REWRITES.set(`date-between-${field}`, { field, operation: EFilterOperation.BETWEEN, value: [new Date(LOWER_BOUND), new Date(UPPER_BOUND)] });
	SERVER_TEMPORAL_REWRITES.set(`instant-gte-${field}`, { field, operation: EFilterOperation.GTE, value: MIDDLE });
	SERVER_TEMPORAL_REWRITES.set(`zoneless-gte-${field}`, { field, operation: EFilterOperation.GTE, value: "2024-03-01T09:30:00" });
	SERVER_TEMPORAL_REWRITES.set(`offset-gte-${field}`, { field, operation: EFilterOperation.GTE, value: "2024-03-01T15:00:00.000+05:30" });
	SERVER_TEMPORAL_REWRITES.set(`zoneless-between-${field}`, { field, operation: EFilterOperation.BETWEEN, value: [new Date(LOWER_BOUND), "2024-03-01T10:30:00"] });
}

const ACCEPTED_CASES: ReadonlyArray<{ labels: ReadonlyArray<string>; name: string; query: (field: string) => string }> = [
	{ labels: AFTER_MIDDLE, name: "a client UTC instant", query: (field: string): string => `${field}[operator]=gte&${field}[value]=${MIDDLE}` },
	{ labels: WITHIN_BOUNDS, name: "a client UTC instant range", query: (field: string): string => `${field}[operator]=between&${field}[values]=${LOWER_BOUND}&${field}[values]=${UPPER_BOUND}` },
	{ labels: AFTER_MIDDLE, name: "a subscriber Date", query: (field: string): string => `rewrite=date-gte-${field}` },
	{ labels: WITHIN_BOUNDS, name: "a subscriber Date range", query: (field: string): string => `rewrite=date-between-${field}` },
	{ labels: AFTER_MIDDLE, name: "a subscriber UTC instant string", query: (field: string): string => `rewrite=instant-gte-${field}` },
];

const REJECTED_CASES: ReadonlyArray<{ name: string; query: (field: string) => string }> = [
	{ name: "a subscriber zone-less string", query: (field: string): string => `rewrite=zoneless-gte-${field}` },
	{ name: "a subscriber offset string", query: (field: string): string => `rewrite=offset-gte-${field}` },
	{ name: "a subscriber range with a zone-less string", query: (field: string): string => `rewrite=zoneless-between-${field}` },
];

const createApp = async (fixture: IServerTemporalFixture, controllers: Array<Type<unknown>>, container: StartedPostgreSqlContainer | undefined, createPipe?: () => ValidationPipe): Promise<INestApplication> => {
	const entities: Array<Type<unknown>> = [fixture.entity];
	const moduleReference = await Test.createTestingModule({
		controllers,
		imports: [TypeOrmModule.forRoot(container ? { dropSchema: true, entities, synchronize: true, type: "postgres", url: container.getConnectionUri() } : { database: ":memory:", dropSchema: true, entities, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
		providers: [fixture.service, fixture.subscriber],
	}).compile();
	const app: INestApplication = moduleReference.createNestApplication(new FastifyAdapter());

	if (createPipe) {
		app.useGlobalPipes(createPipe());
	}

	await app.init();
	await app.get(fixture.service).repository.save(ROWS.map((row: IServerTemporalEvent): IServerTemporalEvent => ({ ...row })));

	return app;
};

const getInject = (app: INestApplication): TInject => {
	const fastify: { inject: TInject } = app.getHttpAdapter().getInstance() as { inject: TInject };

	return fastify.inject.bind(fastify);
};

const inTimezone = async (timezone: string, run: () => Promise<void>): Promise<void> => {
	process.env.TZ = timezone;

	try {
		await run();
	} finally {
		if (ORIGINAL_TIMEZONE === undefined) {
			delete process.env.TZ;
		} else {
			process.env.TZ = ORIGINAL_TIMEZONE;
		}
	}
};

const expectLabels = async (inject: TInject, url: string, labels: ReadonlyArray<string>): Promise<void> => {
	const response = await inject({ method: "GET", url });

	expect(response.statusCode, `${url} ${JSON.stringify(response.json())}`).toBe(HttpStatus.OK);
	expect((response.json() as { items: Array<{ label: string }> }).items.map(({ label }: { label: string }): string => label)).toEqual(labels);
};

describe.each([
	{ databaseName: "SQLite", isPostgres: false },
	{ databaseName: "PostgreSQL", isPostgres: true },
])("GET_LIST server-side temporal filter values on $databaseName (E2E)", ({ isPostgres }: { databaseName: string; isPostgres: boolean }) => {
	const fixture: IServerTemporalFixture = createServerTemporalFixture(isPostgres);
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
		let app: INestApplication | undefined;
		let inject: TInject;

		beforeAll(async () => {
			app = await createApp(fixture, fixture.controllers, container, createPipe);
			inject = getInject(app);
		});

		afterAll(async () => {
			await app?.close();
		});

		describe.each(ROUTES)("on %s", (route: string) => {
			describe.each(TIMEZONES)("in a %s process", (timezone: string) => {
				describe.each(FIELDS)("on %s", (field: string) => {
					it.each(ACCEPTED_CASES)("filters by $name as the instant it names", async ({ labels, query }: { labels: ReadonlyArray<string>; query: (field: string) => string }) => {
						await inTimezone(timezone, async () => {
							await expectLabels(inject, `${route}?${PAGE}&${query(field)}`, labels);
						});
					});

					it.each(REJECTED_CASES)("answers $name with 400", async ({ query }: { query: (field: string) => string }) => {
						await inTimezone(timezone, async () => {
							const response = await inject({ method: "GET", url: `${route}?${PAGE}&${query(field)}` });

							expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.BAD_REQUEST);
							expect(response.json()).toEqual({ error: "Bad Request", message: expect.anything(), statusCode: HttpStatus.BAD_REQUEST });
						});
					});
				});
			});
		});
	});

	describe("a typed defaultCondition", () => {
		it.each(TIMEZONES)("filters by a Date and by a UTC instant string as the same instant in a %s process", async (timezone: string) => {
			// A schema prefix names one controller class per application, so each value gets its own application.
			for (const [value, path] of [
				[new Date(MIDDLE), "date-default"],
				[MIDDLE, "instant-default"],
			] as Array<[Date | string, string]>) {
				const app: INestApplication = await createApp(fixture, [fixture.createDefaultConditionController(value, path)], container);

				try {
					const inject: TInject = getInject(app);

					await inTimezone(timezone, async () => {
						await expectLabels(inject, `/server-temporal/${path}?${PAGE}`, AFTER_MIDDLE);
					});
				} finally {
					await app.close();
				}
			}
		});

		it.each(["2024-03-01T09:30:00", "2024-03-01T09:30:00Z", "2024-03-01T15:00:00.000+05:30", "2024-03-01"])("fails at startup for the string %s, naming the route and the field", (value: string) => {
			expect(() => fixture.createDefaultConditionController(value, "rejected-default")).toThrow(/Controller "E2eServerTemporalDefaultConditionEventController" route "getList": GET_LIST filter defaultCondition for "happenedAt" must be a Date or a UTC instant in YYYY-MM-DDTHH:mm:ss\.sssZ format/u);
		});
	});
});
