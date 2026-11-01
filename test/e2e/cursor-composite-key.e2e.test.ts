import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";

import { HttpStatus } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../src/index";
import { E2eCursorSettlementController, E2eCursorTransactionController, E2eCursorTransactionEntity, E2eCursorTransactionService } from "./cursor-composite-key";

type TCursorItem = { createdAt: string; id: string; settledAt: string; walletId: string };
type TCursorPage = { items: Array<TCursorItem>; nextCursor: null | string; previousCursor: null | string };
type TCursorPayload = { c: string; v: number; values: Array<unknown> };

const ORIGINAL_TIMEZONE: string | undefined = process.env.TZ;
const PROCESS_TIMEZONE: string = "America/New_York";
const WALLET_A: string = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const WALLET_B: string = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const WALLET_C: string = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const WALLETS: ReadonlyArray<string> = [WALLET_A, WALLET_B, WALLET_C];
// Instants straddle both partition boundaries so one window can span several partitions.
const CREATED_AT_VALUES: ReadonlyArray<string> = ["2023-12-31T23:59:59.999Z", "2024-01-01T00:00:00.000Z", "2024-01-01T00:00:00.001Z", "2024-06-15T12:34:56.789Z", "2024-12-31T23:59:59.999Z", "2025-01-01T00:00:00.000Z"];
const SETTLED_AT_VALUES: ReadonlyArray<string> = ["2024-03-01T10:00:00.001Z", "2024-03-01T10:00:00.002Z", "2024-07-01T04:00:00.999Z"];
const ROW_COUNT: number = 48;

const ROWS: ReadonlyArray<TCursorItem> = Array.from({ length: ROW_COUNT }, (_value: unknown, index: number): TCursorItem => ({
	createdAt: CREATED_AT_VALUES[index % CREATED_AT_VALUES.length] as string,
	id: `00000000-0000-4000-8000-${index.toString().padStart(12, "0")}`,
	settledAt: SETTLED_AT_VALUES[index % SETTLED_AT_VALUES.length] as string,
	walletId: WALLETS[index % WALLETS.length] as string,
}));

const compareStrings = (left: string, right: string): number => {
	if (left < right) {
		return -1;
	}

	return left > right ? 1 : 0;
};
const compareTransactions = (left: TCursorItem, right: TCursorItem): number => compareStrings(right.createdAt, left.createdAt) || compareStrings(left.id, right.id);
const compareSettlements = (left: TCursorItem, right: TCursorItem): number => compareStrings(left.settledAt, right.settledAt) || compareStrings(left.id, right.id);
const compareSettlementsDescending = (left: TCursorItem, right: TCursorItem): number => compareStrings(right.settledAt, left.settledAt) || compareStrings(left.id, right.id);
const decodeCursor = (cursor: string): TCursorPayload => JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as TCursorPayload;
const encodeCursor = (payload: TCursorPayload): string => Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

describe("generated CURSOR pagination over a composite primary key (E2E)", () => {
	let app: INestApplication | undefined;
	let container: StartedPostgreSqlContainer;
	let service: E2eCursorTransactionService;
	let fastify: { inject: (options: { method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };

	const getPage = async (url: string): Promise<TCursorPage> => {
		const response = await fastify.inject({ method: "GET", url });

		expect(response.statusCode).toBe(HttpStatus.OK);

		return response.json() as TCursorPage;
	};

	const walkForward = async (path: string, query: string): Promise<Array<TCursorPage>> => {
		const pages: Array<TCursorPage> = [await getPage(`${path}?${query}`)];
		let cursor: null | string | undefined = pages[0]?.nextCursor;

		while (cursor) {
			const page: TCursorPage = await getPage(`${path}?${query}&after=${cursor}`);

			pages.push(page);
			cursor = page.nextCursor;
		}

		return pages;
	};

	const walkBackward = async (path: string, query: string, startCursor: string): Promise<Array<TCursorPage>> => {
		const pages: Array<TCursorPage> = [];
		let cursor: null | string = startCursor;

		while (cursor) {
			const page: TCursorPage = await getPage(`${path}?${query}&before=${cursor}`);

			pages.unshift(page);
			cursor = page.previousCursor;
		}

		return pages;
	};

	const expectCompleteWalk = async (path: string, query: string, expected: ReadonlyArray<TCursorItem>): Promise<void> => {
		const forwardPages: Array<TCursorPage> = await walkForward(path, query);
		const forwardItems: Array<TCursorItem> = forwardPages.flatMap(({ items }: TCursorPage): Array<TCursorItem> => items);

		expect(forwardItems).toEqual(expected);
		expect(new Set(forwardItems.map(({ createdAt, id }: TCursorItem): string => `${createdAt}/${id}`)).size).toBe(expected.length);
		expect(forwardPages[0]?.previousCursor).toBeNull();
		expect(forwardPages.at(-1)?.nextCursor).toBeNull();
		expect(forwardPages.slice(1).every(({ previousCursor }: TCursorPage): boolean => typeof previousCursor === "string")).toBe(true);
		expect(forwardPages.slice(0, -1).every(({ nextCursor }: TCursorPage): boolean => typeof nextCursor === "string")).toBe(true);

		const lastPage: TCursorPage | undefined = forwardPages.at(-1);

		if (!lastPage?.previousCursor) {
			throw new Error("Expected more than one cursor page");
		}

		const backwardPages: Array<TCursorPage> = await walkBackward(path, query, lastPage.previousCursor);
		const backwardItems: Array<TCursorItem> = backwardPages.flatMap(({ items }: TCursorPage): Array<TCursorItem> => items);

		expect([...backwardItems, ...lastPage.items]).toEqual(expected);
		expect(backwardPages[0]?.previousCursor).toBeNull();
		expect(backwardPages.every(({ nextCursor }: TCursorPage): boolean => typeof nextCursor === "string")).toBe(true);
	};

	beforeAll(async () => {
		process.env.TZ = PROCESS_TIMEZONE;
		container = await new PostgreSqlContainer("postgres:17-alpine").start();
		const moduleReference = await Test.createTestingModule({
			controllers: [E2eCursorTransactionController, E2eCursorSettlementController],
			imports: [
				TypeOrmModule.forRoot({
					dropSchema: true,
					entities: [E2eCursorTransactionEntity],
					synchronize: true,
					type: "postgres",
					url: container.getConnectionUri(),
				}),
				TypeOrmModule.forFeature([E2eCursorTransactionEntity]),
				ApiAuthorizationModule.forRoot(),
				ApiSubscriberModule,
			],
			providers: [E2eCursorTransactionService],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		service = app.get(E2eCursorTransactionService);
		fastify = app.getHttpAdapter().getInstance();

		await service.repository.query(`CREATE TABLE e2e_cursor_transactions (id uuid NOT NULL, "createdAt" timestamptz(3) NOT NULL, "settledAt" timestamp(3) NOT NULL, "walletId" uuid NOT NULL, PRIMARY KEY (id, "createdAt")) PARTITION BY RANGE ("createdAt")`);
		await service.repository.query(`CREATE TABLE e2e_cursor_transactions_2023 PARTITION OF e2e_cursor_transactions FOR VALUES FROM ('2023-01-01 00:00:00+00') TO ('2024-01-01 00:00:00+00')`);
		await service.repository.query(`CREATE TABLE e2e_cursor_transactions_2024 PARTITION OF e2e_cursor_transactions FOR VALUES FROM ('2024-01-01 00:00:00+00') TO ('2025-01-01 00:00:00+00')`);
		await service.repository.query(`CREATE TABLE e2e_cursor_transactions_default PARTITION OF e2e_cursor_transactions DEFAULT`);
		await service.repository.insert(ROWS.map(({ createdAt, id, settledAt, walletId }: TCursorItem): Partial<E2eCursorTransactionEntity> => ({ createdAt: new Date(createdAt), id, settledAt: new Date(settledAt), walletId })));
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

	it("stores the fixture in a range-partitioned table with every row in its partition", async () => {
		const partitions = (await service.repository.query(`SELECT tableoid::regclass::text AS "partition", count(*)::int AS "count" FROM e2e_cursor_transactions GROUP BY 1 ORDER BY 1`)) as Array<{ count: number; partition: string }>;
		const parents = (await service.repository.query(`SELECT relkind FROM pg_class WHERE relname = 'e2e_cursor_transactions'`)) as Array<{ relkind: string }>;

		expect(parents).toEqual([{ relkind: "p" }]);
		expect(partitions).toEqual([
			{ count: 8, partition: "e2e_cursor_transactions_2023" },
			{ count: 32, partition: "e2e_cursor_transactions_2024" },
			{ count: 8, partition: "e2e_cursor_transactions_default" },
		]);
	});

	it.each([1, 5, 7, 13])("walks every row forward and backward with %i item windows and no duplicates or gaps", async (limit) => {
		await expectCompleteWalk("/cursor-transactions", `limit=${limit}`, ROWS.toSorted(compareTransactions));
	});

	it("keeps the seek exact across equal timestamps under an in filter", async () => {
		const expected: Array<TCursorItem> = ROWS.filter(({ walletId }: TCursorItem): boolean => walletId !== WALLET_C).toSorted(compareTransactions);

		await expectCompleteWalk("/cursor-transactions", `limit=4&walletId[operator]=in&walletId[values]=${WALLET_A}&walletId[values]=${WALLET_B}`, expected);
	});

	it("keeps the seek exact across equal timestamps under an eq filter", async () => {
		const expected: Array<TCursorItem> = ROWS.filter(({ walletId }: TCursorItem): boolean => walletId === WALLET_B).toSorted(compareTransactions);

		await expectCompleteWalk("/cursor-transactions", `limit=3&walletId[operator]=eq&walletId[value]=${WALLET_B}`, expected);
	});

	it("walks timestamp-without-time-zone order fields ahead of the composite key", async () => {
		const stored = (await service.repository.query(`SELECT DISTINCT "settledAt"::text AS "settledAt" FROM e2e_cursor_transactions ORDER BY 1`)) as Array<{ settledAt: string }>;

		expect(stored.map(({ settledAt }: { settledAt: string }): string => settledAt)).toEqual(["2024-03-01 05:00:00.001", "2024-03-01 05:00:00.002", "2024-07-01 00:00:00.999"]);
		await expectCompleteWalk("/cursor-settlements", "limit=6", ROWS.toSorted(compareSettlements));
		await expectCompleteWalk("/cursor-settlements", "limit=6&orderBy=settledAt&orderDirection=desc", ROWS.toSorted(compareSettlementsDescending));
	});

	it("reports the opposite window through its after and before probes", async () => {
		const expected: Array<TCursorItem> = ROWS.toSorted(compareTransactions);
		const first: TCursorPage = await getPage("/cursor-transactions?limit=1");

		expect(first.items).toEqual(expected.slice(0, 1));
		expect(first.previousCursor).toBeNull();
		expect(await getPage(`/cursor-transactions?limit=1&before=${String(first.nextCursor)}`)).toEqual({ items: [], nextCursor: first.nextCursor, previousCursor: null });

		const allButLast: TCursorPage = await getPage(`/cursor-transactions?limit=${ROW_COUNT - 1}`);
		const last: TCursorPage = await getPage(`/cursor-transactions?limit=${ROW_COUNT - 1}&after=${String(allButLast.nextCursor)}`);

		expect(last.items).toEqual(expected.slice(-1));
		expect(last.nextCursor).toBeNull();
		expect(last.previousCursor).toEqual(expect.any(String));
		expect(await getPage(`/cursor-transactions?limit=${ROW_COUNT - 1}&after=${String(last.previousCursor)}`)).toEqual({ items: [], nextCursor: null, previousCursor: last.previousCursor });
	});

	it("carries each composite key component in order as a canonical UTC token value", async () => {
		const page: TCursorPage = await getPage("/cursor-transactions?limit=2");
		const lastItem: TCursorItem | undefined = page.items.at(-1);
		const payload: TCursorPayload = decodeCursor(String(page.nextCursor));

		expect(payload.v).toBe(1);
		expect(payload.values).toEqual([lastItem?.createdAt, lastItem?.id]);
		expect(lastItem?.createdAt).toBe("2025-01-01T00:00:00.000Z");
	});

	it.each([
		["a non-canonical timestamp", (payload: TCursorPayload): void => void (payload.values[0] = "2024-06-15T12:34:56Z")],
		["an offset timestamp", (payload: TCursorPayload): void => void (payload.values[0] = "2024-06-15T12:34:56.789+00:00")],
		["an impossible timestamp", (payload: TCursorPayload): void => void (payload.values[0] = "2024-02-30T12:34:56.789Z")],
		["an expanded-year timestamp", (payload: TCursorPayload): void => void (payload.values[0] = "+275760-09-13T00:00:00.000Z")],
		["a numeric timestamp", (payload: TCursorPayload): void => void (payload.values[0] = 1_718_454_896_789)],
		["swapped key components", (payload: TCursorPayload): void => void payload.values.reverse()],
		["a missing key component", (payload: TCursorPayload): void => void payload.values.pop()],
		["an extra key component", (payload: TCursorPayload): void => void payload.values.push(WALLET_A)],
		["a tampered context", (payload: TCursorPayload): void => void (payload.c = "0".repeat(64))],
	])("rejects %s as INVALID_CURSOR", async (_label, tamper) => {
		const page: TCursorPage = await getPage("/cursor-transactions?limit=2");
		const payload: TCursorPayload = decodeCursor(String(page.nextCursor));

		tamper(payload);

		const response = await fastify.inject({ method: "GET", url: `/cursor-transactions?limit=2&after=${encodeCursor(payload)}` });

		expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
		expect(response.json()).toMatchObject({ message: "INVALID_CURSOR" });
	});

	it("rejects cross-context tokens as INVALID_CURSOR", async () => {
		const unfiltered: TCursorPage = await getPage("/cursor-transactions?limit=2");
		const filtered: TCursorPage = await getPage(`/cursor-transactions?limit=2&walletId[operator]=eq&walletId[value]=${WALLET_A}`);
		const settlements: TCursorPage = await getPage("/cursor-settlements?limit=2");
		const responses = await Promise.all([
			fastify.inject({ method: "GET", url: `/cursor-transactions?limit=2&walletId[operator]=eq&walletId[value]=${WALLET_A}&after=${String(unfiltered.nextCursor)}` }),
			fastify.inject({ method: "GET", url: `/cursor-transactions?limit=2&walletId[operator]=eq&walletId[value]=${WALLET_B}&after=${String(filtered.nextCursor)}` }),
			fastify.inject({ method: "GET", url: `/cursor-transactions?limit=2&after=${String(settlements.nextCursor)}` }),
			fastify.inject({ method: "GET", url: `/cursor-settlements?limit=2&orderBy=settledAt&orderDirection=desc&after=${String(settlements.nextCursor)}` }),
		]);

		for (const response of responses) {
			expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
			expect(response.json()).toMatchObject({ message: "INVALID_CURSOR" });
		}
	});

	it("treats the extreme canonical timestamps as opaque in-range boundaries", async () => {
		const page: TCursorPage = await getPage("/cursor-transactions?limit=2");
		const payload: TCursorPayload = decodeCursor(String(page.nextCursor));

		payload.values[0] = "9999-12-31T23:59:59.999Z";

		const beforeEveryRow: TCursorPage = await getPage(`/cursor-transactions?limit=2&after=${encodeCursor(payload)}`);

		payload.values[0] = "0000-01-01T00:00:00.000Z";

		const afterEveryRow: TCursorPage = await getPage(`/cursor-transactions?limit=2&after=${encodeCursor(payload)}`);

		expect(beforeEveryRow.items).toHaveLength(2);
		expect(afterEveryRow.items).toEqual([]);
	});

	it("rejects client order on composite key components", async () => {
		const response = await fastify.inject({ method: "GET", url: "/cursor-transactions?limit=2&orderBy=createdAt&orderDirection=desc" });

		expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
	});
});
