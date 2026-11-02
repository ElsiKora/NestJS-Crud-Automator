import "reflect-metadata";

import type { INestApplication, Type } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { Logger, Repository } from "typeorm";

import { HttpStatus, Inject, Injectable, ValidationPipe } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Column, Entity, PrimaryColumn } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiPropertyDescribe, ApiService, ApiServiceBase, ApiSubscriberModule, EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiDtoType, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType, EFilterOperation, EFilterOrderDirection } from "../../src/index";

class CalendarQueryLogger implements Logger {
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

interface ICalendarFixture {
	controllers: Array<Type<unknown>>;
	entity: Type<object>;
	service: Type<ICalendarService>;
}

interface ICalendarService {
	repository: Repository<object>;
}

interface ICursorPayload {
	values: Array<unknown>;
}

interface IInjectResponse {
	json: () => unknown;
	statusCode: number;
}

interface IPipeCase {
	createPipe?: () => ValidationPipe;
	name: string;
}

// Each names a moment the calendar does not hold; V8 rolls the first four over into the next day or month.
const IMPOSSIBLE_DATE_TIMES: Array<string> = ["2026-02-30T00:00:00.000Z", "2026-04-31T12:00:00.000Z", "2025-02-29T00:00:00.000Z", "2026-01-01T24:00:00.000Z", "2026-01-01T23:59:60.000Z", "2026-13-01T00:00:00.000Z"];

// The same moments as a create key may also spell them: with an offset, or with a space before the time.
const IMPOSSIBLE_KEY_TEXTS: Array<string> = [...IMPOSSIBLE_DATE_TIMES, "2026-02-30T00:00:00+03:00", "2026-04-31T23:30:00-05:00", "2025-02-29 08:00:00Z", "2026-01-01T24:00:00+01:00", "2026-06-31T10:00:00.000+0530"];

const IMPOSSIBLE_DATES: Array<string> = ["2026-02-30", "2026-04-31", "2025-02-29", "2026-13-01"];

const SEEDED_AT: string = "2024-01-02T03:04:05.678Z";

const VALID_BODY: Readonly<Record<string, string>> = { happensOn: "2024-02-29", name: "moment", startsAt: "2024-02-29T23:59:59.999Z" };

const decodeCursor = (cursor: string): ICursorPayload => JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as ICursorPayload;
const encodeCursor = (payload: ICursorPayload): string => Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

/**
 * Builds the entity, service and controllers of one database, whose instant column type differs.
 * @param {boolean} isPostgres - Whether the fixture runs on PostgreSQL.
 * @returns {ICalendarFixture} Fixture classes.
 */
function createFixture(isPostgres: boolean): ICalendarFixture {
	const instantType: string = isPostgres ? "timestamptz" : "datetime";

	@Entity(`e2e_date_calendar_moments_${isPostgres ? "pg" : "sqlite"}`)
	class CalendarMomentEntity {
		@PrimaryColumn({ precision: 3, type: instantType as never })
		@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, properties: { [EApiRouteType.CREATE]: { [EApiDtoType.BODY]: { isRequired: false } } }, type: EApiPropertyDescribeType.DATE } as never)
		public at!: Date;

		@Column({ type: "date" })
		@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE })
		public happensOn!: string;

		@Column({ type: "varchar" })
		@ApiPropertyDescribe({ description: "name", exampleValue: "moment", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
		public name!: string;

		@Column({ precision: 3, type: instantType as never })
		@ApiPropertyDescribe({ format: EApiPropertyDateType.DATE_TIME, identifier: EApiPropertyDateIdentifier.DATE, type: EApiPropertyDescribeType.DATE })
		public startsAt!: Date;
	}

	@Injectable()
	@ApiService({ entity: CalendarMomentEntity })
	class CalendarMomentService extends ApiServiceBase<CalendarMomentEntity> {
		@InjectRepository(CalendarMomentEntity)
		public readonly repository!: Repository<CalendarMomentEntity>;
	}

	const disabled: { generation: { isEnabled: boolean } } = { generation: { isEnabled: false } };

	const createListQuery = (mode: EApiControllerGetListQueryPaginationMode): object => ({
		filter: {
			fields: {
				happensOn: { allowedOperations: [EFilterOperation.EQ, EFilterOperation.GTE], isEnabled: true },
				startsAt: { allowedOperations: [EFilterOperation.EQ, EFilterOperation.GTE], isEnabled: true },
			},
			unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
		},
		order: { defaultOrder: [{ direction: EFilterOrderDirection.ASC, field: "startsAt" }], fields: {}, tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "at" }], unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT },
		pagination: { mode },
	});

	@ApiController<CalendarMomentEntity>({
		entity: CalendarMomentEntity,
		name: "E2eDateCalendarMoments",
		path: "date-calendar/moments",
		routes: { [EApiRouteType.CREATE]: {}, [EApiRouteType.DELETE]: disabled, [EApiRouteType.GET]: {}, [EApiRouteType.GET_LIST]: {}, [EApiRouteType.PARTIAL_UPDATE]: {}, [EApiRouteType.UPDATE]: disabled },
	})
	class CalendarMomentController {
		@Inject(CalendarMomentService)
		public readonly service!: CalendarMomentService;
	}

	@ApiController<CalendarMomentEntity>({
		entity: CalendarMomentEntity,
		name: "E2eDateCalendarMomentPages",
		path: "date-calendar/moment-pages",
		routes: { [EApiRouteType.CREATE]: disabled, [EApiRouteType.DELETE]: disabled, [EApiRouteType.GET]: disabled, [EApiRouteType.GET_LIST]: { request: { [EApiControllerRequestTarget.QUERY]: createListQuery(EApiControllerGetListQueryPaginationMode.PAGE) } }, [EApiRouteType.PARTIAL_UPDATE]: disabled, [EApiRouteType.UPDATE]: disabled } as never,
	})
	class CalendarMomentPageController {
		@Inject(CalendarMomentService)
		public readonly service!: CalendarMomentService;
	}

	@ApiController<CalendarMomentEntity>({
		entity: CalendarMomentEntity,
		name: "E2eDateCalendarMomentCursor",
		path: "date-calendar/moment-cursor",
		routes: { [EApiRouteType.CREATE]: disabled, [EApiRouteType.DELETE]: disabled, [EApiRouteType.GET]: disabled, [EApiRouteType.GET_LIST]: { request: { [EApiControllerRequestTarget.QUERY]: createListQuery(EApiControllerGetListQueryPaginationMode.CURSOR) } }, [EApiRouteType.PARTIAL_UPDATE]: disabled, [EApiRouteType.UPDATE]: disabled } as never,
	})
	class CalendarMomentCursorController {
		@Inject(CalendarMomentService)
		public readonly service!: CalendarMomentService;
	}

	// CURSOR GET_LIST runs on PostgreSQL only.
	return { controllers: isPostgres ? [CalendarMomentController, CalendarMomentPageController, CalendarMomentCursorController] : [CalendarMomentController, CalendarMomentPageController], entity: CalendarMomentEntity, service: CalendarMomentService as unknown as Type<ICalendarService> };
}

describe.each([
	{ databaseName: "SQLite", isPostgres: false },
	{ databaseName: "PostgreSQL", isPostgres: true },
])("impossible calendar dates on $databaseName (E2E)", ({ isPostgres }: { databaseName: string; isPostgres: boolean }) => {
	const fixture: ICalendarFixture = createFixture(isPostgres);
	let container: StartedPostgreSqlContainer | undefined;

	beforeAll(async () => {
		if (isPostgres) {
			container = await new PostgreSqlContainer("postgres:17-alpine").start();
		}
	}, 180_000);

	afterAll(async () => {
		await container?.stop();
	}, 60_000);

	describe.each<IPipeCase>([{ name: "no host pipe" }, { createPipe: () => new ValidationPipe({ transform: true }), name: "a transforming host ValidationPipe" }])("with $name", ({ createPipe }: IPipeCase) => {
		const queryLogger: CalendarQueryLogger = new CalendarQueryLogger();
		let app: INestApplication | undefined;
		let fastify: { inject: (options: { method: string; payload?: unknown; url: string }) => Promise<IInjectResponse> };
		let repository: Repository<object>;

		const readKeys = async (): Promise<Array<string>> => {
			const rows: Array<{ at: Date }> = (await repository.find({ order: { at: "ASC" } as never })) as Array<{ at: Date }>;

			return rows.map((row: { at: Date }): string => new Date(row.at).toISOString());
		};

		const expectRefusedBeforeSql = async (response: IInjectResponse, body: unknown): Promise<void> => {
			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.BAD_REQUEST);
			expect(response.json()).toEqual(body);
			expect(queryLogger.queries).toEqual([]);
			expect(await readKeys()).toEqual([SEEDED_AT]);
			queryLogger.queries.length = 0;
		};

		beforeAll(async () => {
			const entities: Array<Type<object>> = [fixture.entity];
			const moduleReference = await Test.createTestingModule({
				controllers: fixture.controllers,
				imports: [TypeOrmModule.forRoot(container ? { dropSchema: true, entities, logger: queryLogger, logging: ["query", "error"], synchronize: true, type: "postgres", url: container.getConnectionUri() } : { database: ":memory:", dropSchema: true, entities, logger: queryLogger, logging: ["query", "error"], synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
				providers: [fixture.service],
			}).compile();

			app = moduleReference.createNestApplication(new FastifyAdapter());

			if (createPipe) {
				app.useGlobalPipes(createPipe());
			}

			await app.init();
			fastify = app.getHttpAdapter().getInstance() as typeof fastify;
			repository = app.get<ICalendarService>(fixture.service).repository;
		}, 120_000);

		afterAll(async () => {
			await app?.close();
		}, 60_000);

		beforeEach(async () => {
			await repository.clear();
			await repository.save(repository.create({ ...VALID_BODY, at: new Date(SEEDED_AT), startsAt: new Date(VALID_BODY.startsAt as string) }));
			queryLogger.queries.length = 0;
		});

		it("accepts a leap day and a zoned create key whose instant falls in the next month", async () => {
			const leap: IInjectResponse = await fastify.inject({ method: "POST", payload: { ...VALID_BODY, at: "2024-02-29T12:00:00.000Z" }, url: "/date-calendar/moments" });
			const zoned: IInjectResponse = await fastify.inject({ method: "POST", payload: { ...VALID_BODY, at: "2026-02-28T23:00:00-05:00" }, url: "/date-calendar/moments" });

			expect([leap.statusCode, zoned.statusCode], JSON.stringify([leap.json(), zoned.json()])).toEqual([HttpStatus.CREATED, HttpStatus.CREATED]);
			expect(await readKeys()).toEqual([SEEDED_AT, "2024-02-29T12:00:00.000Z", "2026-03-01T04:00:00.000Z"]);
		});

		it.each(IMPOSSIBLE_KEY_TEXTS)("answers a create key of %s with 400 before any SQL", async (at: string) => {
			const response: IInjectResponse = await fastify.inject({ method: "POST", payload: { ...VALID_BODY, at }, url: "/date-calendar/moments" });

			await expectRefusedBeforeSql(response, { error: "Bad Request", message: ["at must be a valid ISO 8601 date-time"], statusCode: HttpStatus.BAD_REQUEST });
		});

		it.runIf(createPipe !== undefined).each(IMPOSSIBLE_DATE_TIMES)("answers a body date-time of %s with 400 before any SQL", async (startsAt: string) => {
			for (const [method, url] of [
				["POST", "/date-calendar/moments"],
				["PATCH", `/date-calendar/moments/${SEEDED_AT}`],
			] as const) {
				const response: IInjectResponse = await fastify.inject({ method, payload: method === "POST" ? { ...VALID_BODY, at: "2024-03-01T00:00:00.000Z", startsAt } : { startsAt }, url });

				await expectRefusedBeforeSql(response, { error: "Bad Request", message: ["startsAt must be in YYYY-MM-DDTHH:mm:ss.sssZ format"], statusCode: HttpStatus.BAD_REQUEST });
			}
		});

		it.runIf(createPipe !== undefined).each(IMPOSSIBLE_DATES)("answers a body date of %s with 400 before any SQL", async (happensOn: string) => {
			const response: IInjectResponse = await fastify.inject({ method: "POST", payload: { ...VALID_BODY, at: "2024-03-01T00:00:00.000Z", happensOn }, url: "/date-calendar/moments" });

			await expectRefusedBeforeSql(response, { error: "Bad Request", message: ["happensOn must be in YYYY-MM-DD format"], statusCode: HttpStatus.BAD_REQUEST });
		});

		it.each(IMPOSSIBLE_DATE_TIMES)("answers a path date-time of %s with 400 before any SQL", async (at: string) => {
			for (const method of ["GET", "PATCH"] as const) {
				const response: IInjectResponse = await fastify.inject({ method, payload: method === "PATCH" ? { name: "renamed" } : undefined, url: `/date-calendar/moments/${at}` });

				expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.BAD_REQUEST);
				expect(response.json()).toEqual({ error: "Bad Request", message: ["at must be in YYYY-MM-DDTHH:mm:ss.sssZ format"], statusCode: HttpStatus.BAD_REQUEST });
				expect(queryLogger.queries).toEqual([]);
			}
		});

		it.each([...IMPOSSIBLE_DATE_TIMES.map((value: string): [string, string] => ["startsAt", value]), ...IMPOSSIBLE_DATES.map((value: string): [string, string] => ["happensOn", value])])("answers a %s list filter of %s with 400 before any SQL", async (field: string, value: string) => {
			for (const path of ["date-calendar/moment-pages?limit=2&page=1", "date-calendar/moments?limit=2&page=1", ...(isPostgres ? ["date-calendar/moment-cursor?limit=2"] : [])]) {
				const response: IInjectResponse = await fastify.inject({ method: "GET", url: `/${path}&${field}[operator]=gte&${field}[value]=${encodeURIComponent(value)}` });

				expect(response.statusCode, `${path} ${JSON.stringify(response.json())}`).toBe(HttpStatus.BAD_REQUEST);
				expect(JSON.stringify(response.json()), path).toMatch(/FILTER_NOT_VALID|must be in YYYY-MM-DD(?:THH:mm:ss\.sssZ)? format/u);
				expect(queryLogger.queries, path).toEqual([]);
			}
		});

		it.runIf(isPostgres).each(IMPOSSIBLE_DATE_TIMES)("answers a cursor that carries %s with 400 before the page query", async (value: string) => {
			await repository.save(repository.create({ ...VALID_BODY, at: new Date("2024-06-01T00:00:00.000Z"), startsAt: new Date(VALID_BODY.startsAt as string) }));

			const page: IInjectResponse = await fastify.inject({ method: "GET", url: "/date-calendar/moment-cursor?limit=1" });

			expect(page.statusCode, JSON.stringify(page.json())).toBe(HttpStatus.OK);

			const payload: ICursorPayload = decodeCursor(String((page.json() as { nextCursor: string }).nextCursor));

			payload.values[0] = value;
			queryLogger.queries.length = 0;

			const response: IInjectResponse = await fastify.inject({ method: "GET", url: `/date-calendar/moment-cursor?limit=1&after=${encodeCursor(payload)}` });

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.BAD_REQUEST);
			expect(response.json()).toMatchObject({ message: "CURSOR_NOT_VALID" });
			expect(queryLogger.queries).toEqual([]);
		});
	});
});
