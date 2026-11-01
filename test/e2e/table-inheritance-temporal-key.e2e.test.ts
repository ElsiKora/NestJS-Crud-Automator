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
import { createEntryController, ETemporalEntryKind, StiTemporalAccountEntity, StiTemporalCreditEntryEntity, StiTemporalDebitEntryEntity, StiTemporalEntryEntity, StiTemporalEntryService } from "./table-inheritance-temporal-key";

type TEntryItem = Record<string, unknown> & { id: string };
type TCursorPage = { items: Array<TEntryItem>; nextCursor: null | string; previousCursor: null | string };
type TOffsetPage = { items: Array<TEntryItem>; totalCount: number; totalPages: number };
type TVariant = { expected: (row: TEntryRow) => boolean; path: string; query: string };
type TEntryRow = { accountId: string; id: string; kind: ETemporalEntryKind; postedAt: string; sequence: number };

const ORIGINAL_TIMEZONE: string | undefined = process.env.TZ;
const PROCESS_TIMEZONE: string = "UTC";
const ACCOUNT_A: string = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ACCOUNT_B: string = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const COUNTERPARTY: string = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const WATCHERS: ReadonlyArray<string> = ["cccccccc-cccc-4ccc-8ccc-cccccccccccc", "dddddddd-dddd-4ddd-8ddd-dddddddddddd"];
const PAGE_SIZE: number = 2;
const MAXIMUM_WALK_PAGES: number = 50;
// Pre-standard-time offsets carry seconds in each zone: Moscow +02:30:17, New York -04:56:02, Kolkata +05:53:28.
const TIMEZONES: ReadonlyArray<string> = ["Europe/Moscow", "America/New_York", "Asia/Kolkata"];
const POSTED_AT_VALUES: ReadonlyArray<string> = [...Array.from({ length: 6 }, (_value: unknown, index: number): string => new Date(Date.UTC(1800, 5, 1, 12, 0, index)).toISOString()), "2024-03-01T10:00:00.001Z", "2024-03-01T10:00:00.002Z"];
const ROWS: ReadonlyArray<TEntryRow> = POSTED_AT_VALUES.map((postedAt: string, index: number): TEntryRow => ({ accountId: index % 2 === 0 ? ACCOUNT_A : ACCOUNT_B, id: `00000000-0000-4000-8000-${index.toString().padStart(12, "0")}`, kind: index % 3 === 0 ? ETemporalEntryKind.CREDIT : ETemporalEntryKind.DEBIT, postedAt, sequence: index }));

const CONTROLLERS: ReadonlyArray<new () => unknown> = [
	createEntryController({ isIncluded: false, mode: EApiControllerGetListQueryPaginationMode.PAGE, path: "sti-temporal-entries-page" }),
	createEntryController({ isIncluded: false, mode: EApiControllerGetListQueryPaginationMode.CURSOR, path: "sti-temporal-entries-cursor" }),
	createEntryController({ isIncluded: true, mode: EApiControllerGetListQueryPaginationMode.PAGE, path: "sti-temporal-included-entries-page" }),
	createEntryController({ isIncluded: true, mode: EApiControllerGetListQueryPaginationMode.CURSOR, path: "sti-temporal-included-entries-cursor" }),
];

const VARIANTS: ReadonlyArray<[string, TVariant]> = [
	["no filter", { expected: (): boolean => true, path: "sti-temporal-entries", query: "" }],
	["a discriminator filter", { expected: (row: TEntryRow): boolean => row.kind === ETemporalEntryKind.DEBIT, path: "sti-temporal-entries", query: `kind[operator]=eq&kind[value]=${ETemporalEntryKind.DEBIT}` }],
	["included root and child relations", { expected: (): boolean => true, path: "sti-temporal-included-entries", query: "" }],
	["included relations under a discriminator filter", { expected: (row: TEntryRow): boolean => row.kind === ETemporalEntryKind.CREDIT, path: "sti-temporal-included-entries", query: `kind[operator]=eq&kind[value]=${ETemporalEntryKind.CREDIT}` }],
	["included relations under a temporal filter", { expected: (row: TEntryRow): boolean => row.postedAt >= (POSTED_AT_VALUES[2] as string), path: "sti-temporal-included-entries", query: `bookedAt[operator]=gte&bookedAt[value]=${POSTED_AT_VALUES[2] as string}` }],
	["included relations under relation, discriminator and temporal filters", { expected: (row: TEntryRow): boolean => row.accountId === ACCOUNT_B && row.kind === ETemporalEntryKind.DEBIT && row.postedAt < (POSTED_AT_VALUES[7] as string), path: "sti-temporal-included-entries", query: `account.id[operator]=eq&account.id[value]=${ACCOUNT_B}&kind[operator]=eq&kind[value]=${ETemporalEntryKind.DEBIT}&bookedAt[operator]=lt&bookedAt[value]=${POSTED_AT_VALUES[7] as string}` }],
];

const MATRIX: Array<[string, string, string, TVariant]> = TIMEZONES.flatMap((timezone: string): Array<[string, string, string, TVariant]> => VARIANTS.flatMap(([label, variant]: [string, TVariant]): Array<[string, string, string, TVariant]> => ["forward", "backward"].map((direction: string): [string, string, string, TVariant] => [timezone, label, direction, variant])));

/**
 * Builds the exact polymorphic response item a row must serialize to.
 * @param {TEntryRow} row - Fixture row
 * @param {boolean} isIncluded - Whether the route loads the account and counterparty relations
 * @returns {Record<string, unknown>} The expected item
 */
const toItem = (row: TEntryRow, isIncluded: boolean): Record<string, unknown> => ({
	accountId: row.accountId,
	bookedAt: row.postedAt,
	id: row.id,
	kind: row.kind,
	postedAt: row.postedAt,
	sequence: row.sequence,
	...(isIncluded ? { account: { id: row.accountId } } : {}),
	...(row.kind === ETemporalEntryKind.DEBIT ? { debitReference: `D-${row.sequence}`, ...(isIncluded ? { counterparty: { id: COUNTERPARTY } } : {}) } : { creditNote: `C-${row.sequence}` }),
});

describe("single-table inheritance reads of a temporal primary key with joins (E2E)", () => {
	let app: INestApplication | undefined;
	let container: StartedPostgreSqlContainer;
	let entryService: StiTemporalEntryService;
	let fastify: { inject: (options: { method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };

	const get = async <T>(url: string): Promise<T> => {
		const response = await fastify.inject({ method: "GET", url });

		expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);

		return response.json() as T;
	};

	const withQuery = (path: string, query: string, parameters: string): string => `/${path}?${[parameters, query].filter(Boolean).join("&")}`;

	const walkOffsetPages = async (path: string, query: string, direction: "ASC" | "DESC"): Promise<{ items: Array<TEntryItem>; totalCount: number }> => {
		const firstPage: TOffsetPage = await get<TOffsetPage>(withQuery(path, query, `limit=${PAGE_SIZE}&page=1&orderBy=sequence&orderDirection=${direction}`));
		const pages: Array<TOffsetPage> = [firstPage];

		for (let page: number = 2; page <= firstPage.totalPages && page <= MAXIMUM_WALK_PAGES; page++) {
			pages.push(await get<TOffsetPage>(withQuery(path, query, `limit=${PAGE_SIZE}&page=${page}&orderBy=sequence&orderDirection=${direction}`)));
		}

		return { items: pages.flatMap(({ items }: TOffsetPage): Array<TEntryItem> => items), totalCount: firstPage.totalCount };
	};

	const walkCursorPages = async (path: string, query: string): Promise<{ backward: Array<TEntryItem>; forward: Array<TEntryItem> }> => {
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

		const toItems = (pages: Array<TCursorPage>): Array<TEntryItem> => pages.flatMap(({ items }: TCursorPage): Array<TEntryItem> => items);

		return { backward: toItems(backwardPages), forward: toItems(forwardPages) };
	};

	beforeAll(async () => {
		process.env.TZ = PROCESS_TIMEZONE;
		container = await new PostgreSqlContainer("postgres:17-alpine").start();
		const entities = [StiTemporalAccountEntity, StiTemporalEntryEntity, StiTemporalDebitEntryEntity, StiTemporalCreditEntryEntity];
		const moduleReference = await Test.createTestingModule({
			controllers: [...CONTROLLERS],
			imports: [TypeOrmModule.forRoot({ dropSchema: true, entities, synchronize: true, type: "postgres", url: container.getConnectionUri() }), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
			providers: [StiTemporalEntryService],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		entryService = app.get(StiTemporalEntryService);
		fastify = app.getHttpAdapter().getInstance();

		// Raw SQL keeps the fixture exact: the rows are inserted as UTC text, not through a Date.
		for (const accountId of [ACCOUNT_A, ACCOUNT_B, COUNTERPARTY, ...WATCHERS]) {
			await entryService.repository.query(`INSERT INTO sti_temporal_accounts (id) VALUES ($1)`, [accountId]);
		}

		for (const { accountId, id, kind, postedAt, sequence } of ROWS) {
			const isDebit: boolean = kind === ETemporalEntryKind.DEBIT;

			await entryService.repository.query(`INSERT INTO sti_temporal_entries (id, "postedAt", "bookedAt", "accountId", kind, sequence, "counterpartyId", "debitReference", "creditNote") VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $8)`, [id, postedAt, accountId, kind, sequence, isDebit ? COUNTERPARTY : null, isDebit ? `D-${sequence}` : null, isDebit ? null : `C-${sequence}`]);

			for (const watcherId of WATCHERS) {
				await entryService.repository.query(`INSERT INTO sti_temporal_entry_watchers ("entryId", "entryPostedAt", "accountId") VALUES ($1, $2, $3)`, [id, postedAt, watcherId]);
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

	it.each(MATRIX)("pages exactly and polymorphically in an %s process with %s, %s", async (timezone, _label, direction, variant) => {
		const isIncluded: boolean = variant.path.includes("included");
		const expectedRows: Array<TEntryRow> = ROWS.filter((row: TEntryRow): boolean => variant.expected(row));
		const expected: Array<Record<string, unknown>> = expectedRows.map((row: TEntryRow): Record<string, unknown> => toItem(row, isIncluded));

		process.env.TZ = timezone;

		try {
			const offsetWalk: { items: Array<TEntryItem>; totalCount: number } = await walkOffsetPages(`${variant.path}-page`, variant.query, direction === "forward" ? "ASC" : "DESC");
			const cursorWalk: { backward: Array<TEntryItem>; forward: Array<TEntryItem> } = await walkCursorPages(`${variant.path}-cursor`, variant.query);

			expect(offsetWalk.items).toEqual(direction === "forward" ? expected : expected.toReversed());
			expect(offsetWalk.totalCount).toBe(expected.length);
			expect(direction === "forward" ? cursorWalk.forward : cursorWalk.backward).toEqual(expected);
		} finally {
			process.env.TZ = PROCESS_TIMEZONE;
		}
	});

	it("loads root and child relations of every subtype through the service in a historic process zone", async () => {
		process.env.TZ = "Europe/Moscow";

		try {
			const { items: listed, totalCount }: { items: Array<StiTemporalEntryEntity>; totalCount: number } = await entryService.getList({ order: { postedAt: "ASC" }, relations: { account: true, counterparty: true, watchers: true } as never, skip: 1, take: 3 });

			process.env.TZ = "America/New_York";
			const many: Array<StiTemporalEntryEntity> = await entryService.getMany({ order: { postedAt: "DESC" }, relations: { account: true, counterparty: true, watchers: true } as never, skip: 2, take: 3 });

			expect(listed.map(({ id }: StiTemporalEntryEntity): string => id)).toEqual(ROWS.slice(1, 4).map(({ id }: TEntryRow): string => id));
			expect(totalCount).toBe(ROWS.length);
			expect(many.map(({ id }: StiTemporalEntryEntity): string => id)).toEqual(
				ROWS.toReversed()
					.slice(2, 5)
					.map(({ id }: TEntryRow): string => id),
			);

			for (const entry of [...listed, ...many]) {
				const row: TEntryRow = ROWS.find(({ id }: TEntryRow): boolean => id === entry.id) as TEntryRow;

				expect(entry).toBeInstanceOf(row.kind === ETemporalEntryKind.DEBIT ? StiTemporalDebitEntryEntity : StiTemporalCreditEntryEntity);
				expect(entry.postedAt.toISOString()).toBe(row.postedAt);
				expect(entry.account.id).toBe(row.accountId);
				expect(entry.watchers.map(({ id }: StiTemporalAccountEntity): string => id).toSorted()).toEqual([...WATCHERS]);

				if (entry instanceof StiTemporalDebitEntryEntity) {
					expect(entry.counterparty.id).toBe(COUNTERPARTY);
				}
			}
		} finally {
			process.env.TZ = PROCESS_TIMEZONE;
		}
	});

	it("finds one subtype entity with joined relations by its exact temporal key in a historic process zone", async () => {
		process.env.TZ = "Asia/Kolkata";

		try {
			const row: TEntryRow = ROWS[4] as TEntryRow;
			const entry: StiTemporalEntryEntity = await entryService.get({ relations: { counterparty: true, watchers: true } as never, where: { id: row.id } });

			expect(entry).toBeInstanceOf(StiTemporalDebitEntryEntity);
			expect(entry.postedAt.toISOString()).toBe(row.postedAt);
			expect((entry as StiTemporalDebitEntryEntity).counterparty.id).toBe(COUNTERPARTY);
			expect(entry.watchers).toHaveLength(WATCHERS.length);
		} finally {
			process.env.TZ = PROCESS_TIMEZONE;
		}
	});

	it("fails closed when a service read loads a child relation of a temporal-key root by query", async () => {
		const error: unknown = await entryService
			.getMany({ relationLoadStrategy: "query", relations: { counterparty: true } as never, take: 2 })
			.then((): undefined => undefined)
			.catch((caught: unknown): unknown => caught);

		// Readers answer with a generic error and keep the exact relation load error as its cause.
		expect(((error as { cause?: Error } | undefined)?.cause as Error | undefined)?.message ?? "").toContain('relation "counterparty" of entity "StiTemporalEntryEntity" with relationLoadStrategy "query" cannot load');
	});
});
