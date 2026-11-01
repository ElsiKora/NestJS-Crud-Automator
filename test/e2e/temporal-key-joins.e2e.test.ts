import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";

import { HttpStatus } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule, EApiControllerGetListQueryPaginationMode } from "../../src/index";
import { createLedgerController, E2eTemporalAccountEntity, E2eTemporalEagerLedgerEntity, E2eTemporalEagerLedgerService, E2eTemporalLedgerEntity, E2eTemporalLedgerService } from "./temporal-key-joins";

type TLedgerItem = { id: string; postedAt: string };
type TCursorPage = { items: Array<TLedgerItem>; nextCursor: null | string; previousCursor: null | string };
type TOffsetPage = { items: Array<TLedgerItem>; totalCount: number; totalPages: number };
type TVariant = { expected: (row: TLedgerRow) => boolean; path: string; query: string };
type TLedgerRow = { accountId: string; id: string; postedAt: string };

const ORIGINAL_TIMEZONE: string | undefined = process.env.TZ;
const PROCESS_TIMEZONE: string = "UTC";
const ACCOUNT_A: string = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ACCOUNT_B: string = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const WATCHERS: ReadonlyArray<string> = ["cccccccc-cccc-4ccc-8ccc-cccccccccccc", "dddddddd-dddd-4ddd-8ddd-dddddddddddd"];
const PAGE_SIZE: number = 2;
const MAXIMUM_WALK_PAGES: number = 50;
// Pre-standard-time offsets carry seconds in each zone: Moscow +02:30:17, New York -04:56:02, Kolkata +05:53:28.
const TIMEZONES: ReadonlyArray<string> = ["Europe/Moscow", "America/New_York", "Asia/Kolkata"];
const POSTED_AT_VALUES: ReadonlyArray<string> = [...Array.from({ length: 6 }, (_value: unknown, index: number): string => new Date(Date.UTC(1800, 5, 1, 12, 0, index)).toISOString()), "2024-03-01T10:00:00.001Z", "2024-03-01T10:00:00.002Z"];
const ROWS: ReadonlyArray<TLedgerRow> = POSTED_AT_VALUES.map((postedAt: string, index: number): TLedgerRow => ({ accountId: index % 2 === 0 ? ACCOUNT_A : ACCOUNT_B, id: `00000000-0000-4000-8000-${index.toString().padStart(12, "0")}`, postedAt }));
const LEDGER_TABLES: ReadonlyArray<[string, string]> = [
	["e2e_temporal_ledgers", "e2e_temporal_ledger_watchers"],
	["e2e_temporal_eager_ledgers", "e2e_temporal_eager_ledger_watchers"],
];

const CONTROLLERS: ReadonlyArray<new () => unknown> = [
	createLedgerController({ isEager: false, mode: EApiControllerGetListQueryPaginationMode.PAGE, path: "temporal-ledgers-page" }),
	createLedgerController({ isEager: false, mode: EApiControllerGetListQueryPaginationMode.CURSOR, path: "temporal-ledgers-cursor" }),
	createLedgerController({ include: { account: true, watchers: true }, isEager: false, mode: EApiControllerGetListQueryPaginationMode.PAGE, path: "temporal-included-ledgers-page" }),
	createLedgerController({ include: { account: true, watchers: true }, isEager: false, mode: EApiControllerGetListQueryPaginationMode.CURSOR, path: "temporal-included-ledgers-cursor" }),
	createLedgerController({ isEager: true, mode: EApiControllerGetListQueryPaginationMode.PAGE, path: "temporal-eager-ledgers-page" }),
	createLedgerController({ isEager: true, mode: EApiControllerGetListQueryPaginationMode.CURSOR, path: "temporal-eager-ledgers-cursor" }),
];

const VARIANTS: ReadonlyArray<[string, TVariant]> = [
	["a relation filter", { expected: (row: TLedgerRow): boolean => row.accountId === ACCOUNT_A, path: "temporal-ledgers", query: `account.id[operator]=eq&account.id[value]=${ACCOUNT_A}` }],
	["a temporal filter", { expected: (row: TLedgerRow): boolean => row.postedAt >= (POSTED_AT_VALUES[2] as string), path: "temporal-ledgers", query: `bookedAt[operator]=gte&bookedAt[value]=${POSTED_AT_VALUES[2] as string}` }],
	["an upper temporal filter", { expected: (row: TLedgerRow): boolean => row.postedAt < (POSTED_AT_VALUES[5] as string), path: "temporal-ledgers", query: `bookedAt[operator]=lt&bookedAt[value]=${POSTED_AT_VALUES[5] as string}` }],
	["a temporal filter under a relation filter", { expected: (row: TLedgerRow): boolean => row.accountId === ACCOUNT_B && row.postedAt >= (POSTED_AT_VALUES[1] as string), path: "temporal-ledgers", query: `account.id[operator]=eq&account.id[value]=${ACCOUNT_B}&bookedAt[operator]=gte&bookedAt[value]=${POSTED_AT_VALUES[1] as string}` }],
	["included to-one and to-many relations", { expected: (): boolean => true, path: "temporal-included-ledgers", query: "" }],
	["eager to-one and to-many relations", { expected: (): boolean => true, path: "temporal-eager-ledgers", query: "" }],
	["eager relations under a temporal filter", { expected: (row: TLedgerRow): boolean => row.postedAt >= (POSTED_AT_VALUES[3] as string), path: "temporal-eager-ledgers", query: `bookedAt[operator]=gte&bookedAt[value]=${POSTED_AT_VALUES[3] as string}` }],
];

const MATRIX: Array<[string, string, string, TVariant]> = TIMEZONES.flatMap((timezone: string): Array<[string, string, string, TVariant]> => VARIANTS.flatMap(([label, variant]: [string, TVariant]): Array<[string, string, string, TVariant]> => ["forward", "backward"].map((direction: string): [string, string, string, TVariant] => [timezone, label, direction, variant])));

describe("PAGE and CURSOR reads of a temporal primary key with joins and filters (E2E)", () => {
	let app: INestApplication | undefined;
	let container: StartedPostgreSqlContainer;
	let eagerLedgerService: E2eTemporalEagerLedgerService;
	let ledgerService: E2eTemporalLedgerService;
	let fastify: { inject: (options: { method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };

	const get = async <T>(url: string): Promise<T> => {
		const response = await fastify.inject({ method: "GET", url });

		expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);

		return response.json() as T;
	};

	const withQuery = (path: string, query: string, parameters: string): string => `/${path}?${[parameters, query].filter(Boolean).join("&")}`;

	const walkOffsetPages = async (path: string, query: string, direction: "ASC" | "DESC"): Promise<{ ids: Array<string>; totalCount: number }> => {
		const firstPage: TOffsetPage = await get<TOffsetPage>(withQuery(path, query, `limit=${PAGE_SIZE}&page=1&orderBy=sequence&orderDirection=${direction}`));
		const pages: Array<TOffsetPage> = [firstPage];

		for (let page: number = 2; page <= firstPage.totalPages && page <= MAXIMUM_WALK_PAGES; page++) {
			pages.push(await get<TOffsetPage>(withQuery(path, query, `limit=${PAGE_SIZE}&page=${page}&orderBy=sequence&orderDirection=${direction}`)));
		}

		return { ids: pages.flatMap(({ items }: TOffsetPage): Array<string> => items.map(({ id }: TLedgerItem): string => id)), totalCount: firstPage.totalCount };
	};

	const walkCursorPages = async (path: string, query: string): Promise<{ backward: Array<string>; forward: Array<string> }> => {
		const forwardPages: Array<TCursorPage> = [await get<TCursorPage>(withQuery(path, query, `limit=${PAGE_SIZE}`))];
		let cursor: null | string | undefined = forwardPages[0]?.nextCursor;

		while (cursor && forwardPages.length < MAXIMUM_WALK_PAGES) {
			const page: TCursorPage = await get<TCursorPage>(withQuery(path, query, `limit=${PAGE_SIZE}&after=${cursor}`));

			forwardPages.push(page);
			cursor = page.nextCursor;
		}

		const lastPage: TCursorPage | undefined = forwardPages.at(-1);
		const backwardPages: Array<TCursorPage> = lastPage ? [lastPage] : [];
		cursor = lastPage?.previousCursor;

		while (cursor && backwardPages.length < MAXIMUM_WALK_PAGES) {
			const page: TCursorPage = await get<TCursorPage>(withQuery(path, query, `limit=${PAGE_SIZE}&before=${cursor}`));

			backwardPages.unshift(page);
			cursor = page.previousCursor;
		}

		const toIds = (pages: Array<TCursorPage>): Array<string> => pages.flatMap(({ items }: TCursorPage): Array<string> => items.map(({ id }: TLedgerItem): string => id));

		return { backward: toIds(backwardPages), forward: toIds(forwardPages) };
	};

	beforeAll(async () => {
		process.env.TZ = PROCESS_TIMEZONE;
		container = await new PostgreSqlContainer("postgres:17-alpine").start();
		const moduleReference = await Test.createTestingModule({
			controllers: [...CONTROLLERS],
			imports: [
				TypeOrmModule.forRoot({
					dropSchema: true,
					entities: [E2eTemporalAccountEntity, E2eTemporalLedgerEntity, E2eTemporalEagerLedgerEntity],
					synchronize: true,
					type: "postgres",
					url: container.getConnectionUri(),
				}),
				TypeOrmModule.forFeature([E2eTemporalLedgerEntity, E2eTemporalEagerLedgerEntity]),
				ApiAuthorizationModule.forRoot(),
				ApiSubscriberModule,
			],
			providers: [E2eTemporalLedgerService, E2eTemporalEagerLedgerService],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		eagerLedgerService = app.get(E2eTemporalEagerLedgerService);
		ledgerService = app.get(E2eTemporalLedgerService);
		fastify = app.getHttpAdapter().getInstance();

		// Raw SQL keeps the fixture exact: the rows are inserted as UTC text, not through a Date.
		for (const accountId of [ACCOUNT_A, ACCOUNT_B, ...WATCHERS]) {
			await ledgerService.repository.query(`INSERT INTO e2e_temporal_accounts (id) VALUES ($1)`, [accountId]);
		}

		for (const [ledgerTable, watcherTable] of LEDGER_TABLES) {
			for (const { accountId, id, postedAt } of ROWS) {
				await ledgerService.repository.query(`INSERT INTO ${ledgerTable} (id, "postedAt", "bookedAt", "accountId", sequence) VALUES ($1, $2, $2, $3, $4)`, [id, postedAt, accountId, ROWS.findIndex((row: TLedgerRow): boolean => row.id === id)]);

				for (const watcherId of WATCHERS) {
					await ledgerService.repository.query(`INSERT INTO ${watcherTable} ("ledgerId", "ledgerPostedAt", "accountId") VALUES ($1, $2, $3)`, [id, postedAt, watcherId]);
				}
			}
		}
	}, 120_000);

	afterAll(async () => {
		await app?.close();
		await container?.stop();

		if (ORIGINAL_TIMEZONE === undefined) {
			delete process.env.TZ;
		} else {
			process.env.TZ = ORIGINAL_TIMEZONE;
		}
	});

	it.each(MATRIX)("pages exactly in an %s process with %s, %s", async (timezone, _label, direction, variant) => {
		const expected: Array<string> = ROWS.filter((row: TLedgerRow): boolean => variant.expected(row)).map(({ id }: TLedgerRow): string => id);

		process.env.TZ = timezone;

		try {
			const offsetWalk: { ids: Array<string>; totalCount: number } = await walkOffsetPages(`${variant.path}-page`, variant.query, direction === "forward" ? "ASC" : "DESC");
			const cursorWalk: { backward: Array<string>; forward: Array<string> } = await walkCursorPages(`${variant.path}-cursor`, variant.query);

			expect(offsetWalk.ids).toEqual(direction === "forward" ? expected : expected.toReversed());
			expect(offsetWalk.totalCount).toBe(expected.length);
			expect(direction === "forward" ? cursorWalk.forward : cursorWalk.backward).toEqual(expected);
		} finally {
			process.env.TZ = PROCESS_TIMEZONE;
		}
	});

	it("loads every included and eager relation of a page in a historic process zone", async () => {
		process.env.TZ = "Europe/Moscow";

		try {
			const { items: included, totalCount: includedCount }: { items: Array<E2eTemporalLedgerEntity>; totalCount: number } = await ledgerService.getList({ order: { postedAt: "ASC" }, relations: { account: true, watchers: true }, skip: 1, take: 3 });
			const eager: Array<E2eTemporalEagerLedgerEntity> = await eagerLedgerService.getMany({ order: { postedAt: "DESC" }, skip: 2, take: 3 });

			expect(included.map(({ id }: E2eTemporalLedgerEntity): string => id)).toEqual(ROWS.slice(1, 4).map(({ id }: TLedgerRow): string => id));
			expect(includedCount).toBe(ROWS.length);
			expect(eager.map(({ id }: E2eTemporalEagerLedgerEntity): string => id)).toEqual(
				ROWS.toReversed()
					.slice(2, 5)
					.map(({ id }: TLedgerRow): string => id),
			);

			for (const ledger of [...included, ...eager]) {
				expect(ledger.account.id).toBe(ROWS.find(({ id }: TLedgerRow): boolean => id === ledger.id)?.accountId);
				expect(ledger.watchers.map(({ id }: E2eTemporalAccountEntity): string => id).toSorted()).toEqual([...WATCHERS]);
			}
		} finally {
			process.env.TZ = PROCESS_TIMEZONE;
		}
	});

	it("finds one entity with eager relations by its exact temporal key in a historic process zone", async () => {
		process.env.TZ = "Asia/Kolkata";

		try {
			const row: TLedgerRow = ROWS[3] as TLedgerRow;
			const ledger: E2eTemporalEagerLedgerEntity = await eagerLedgerService.get({ where: { id: row.id } });

			expect(ledger.postedAt.toISOString()).toBe(row.postedAt);
			expect(ledger.watchers).toHaveLength(WATCHERS.length);
		} finally {
			process.env.TZ = PROCESS_TIMEZONE;
		}
	});

	it("fails at startup when a route loads any relation of a temporal-key entity by query", async () => {
		const moduleReference = await Test.createTestingModule({
			controllers: [createLedgerController({ include: { account: true }, isEager: false, mode: EApiControllerGetListQueryPaginationMode.PAGE, path: "temporal-query-ledgers", relationLoadStrategy: "query" })],
			imports: [
				TypeOrmModule.forRoot({
					entities: [E2eTemporalAccountEntity, E2eTemporalLedgerEntity, E2eTemporalEagerLedgerEntity],
					type: "postgres",
					url: container.getConnectionUri(),
				}),
				TypeOrmModule.forFeature([E2eTemporalLedgerEntity, E2eTemporalEagerLedgerEntity]),
				ApiAuthorizationModule.forRoot(),
				ApiSubscriberModule,
			],
			providers: [E2eTemporalLedgerService, E2eTemporalEagerLedgerService],
		}).compile();
		const queryApp: INestApplication = moduleReference.createNestApplication(new FastifyAdapter());

		try {
			await expect(queryApp.init()).rejects.toThrow('route "getList": relation "account" of entity "E2eTemporalLedgerEntity" with relationLoadStrategy "query" cannot load because its query filters by the PostgreSQL date or timestamp column "postedAt" of entity "E2eTemporalLedgerEntity", which pg binds through a local offset truncated to whole minutes; use relationLoadStrategy: "join"');
		} finally {
			await queryApp.close().catch((): undefined => undefined);
		}
	});

	it("fails every service read that would load relations or relation ids over temporal keys by query", async () => {
		const row: TLedgerRow = ROWS[0] as TLedgerRow;

		// Readers answer with a generic error and keep the exact relation load error as its cause.
		const causeOf = async (read: Promise<unknown>): Promise<string> => {
			const error: unknown = await read.then((): undefined => undefined).catch((caught: unknown): unknown => caught);

			return ((error as { cause?: Error } | undefined)?.cause as Error | undefined)?.message ?? "";
		};

		expect(await causeOf(ledgerService.get({ relationLoadStrategy: "query", relations: { account: true }, where: { id: row.id } }))).toContain('relation "account" of entity "E2eTemporalLedgerEntity" with relationLoadStrategy "query" cannot load');
		expect(await causeOf(ledgerService.getMany({ relationLoadStrategy: "query", relations: { watchers: true }, take: 2 }))).toContain('relation "watchers" of entity "E2eTemporalLedgerEntity" with relationLoadStrategy "query" cannot load');
		expect(await causeOf(ledgerService.getList({ loadRelationIds: { relations: ["watchers"] }, take: 2 } as never))).toContain('loadRelationIds relation "watchers" of entity "E2eTemporalLedgerEntity" cannot load');
	});
});
