import type { DataSourceOptions, FindManyOptions, ObjectLiteral, Repository } from "typeorm";

import { ApiFunctionBoundOperator } from "@class/api/function/bound-operator.class";
import { ApiFunctionKeyPageLoader } from "@class/api/function/key-page-loader.class";
import { KeyPageAccountEntity } from "@test/unit/class/api/function/fixture/key-page-account.entity";
import { KeyPageAuditorEntity } from "@test/unit/class/api/function/fixture/key-page-auditor.entity";
import { KeyPageBatchEntity } from "@test/unit/class/api/function/fixture/key-page-batch.entity";
import { KEY_PAGE_CALENDAR_INPUTS, KeyPageCalendarEntity } from "@test/unit/class/api/function/fixture/key-page-calendar.entity";
import { KeyPageCreatedEntity } from "@test/unit/class/api/function/fixture/key-page-created.entity";
import { KeyPageDayEntity } from "@test/unit/class/api/function/fixture/key-page-day.entity";
import { KeyPageEntryEntity } from "@test/unit/class/api/function/fixture/key-page-entry.entity";
import { KeyPageHolderEntity } from "@test/unit/class/api/function/fixture/key-page-holder.entity";
import { KEY_PAGE_INSTANT_INPUTS, KeyPageInstantEntity } from "@test/unit/class/api/function/fixture/key-page-instant.entity";
import { KeyPageJournalEntity } from "@test/unit/class/api/function/fixture/key-page-journal.entity";
import { KeyPageLedgerEntity } from "@test/unit/class/api/function/fixture/key-page-ledger.entity";
import { KeyPageMssqlEntity } from "@test/unit/class/api/function/fixture/key-page-mssql.entity";
import { KeyPageReceiptEntity } from "@test/unit/class/api/function/fixture/key-page-receipt.entity";
import { KeyPageWalletEntity } from "@test/unit/class/api/function/fixture/key-page-wallet.entity";
import { AuthorizationScopeMergeWhere } from "@utility/authorization/scope-merge-where.utility";
import { LoggerUtility } from "@utility/logger.utility";
import { And, Between, DataSource, Equal, In, IsNull, LessThan, LessThanOrEqual, MoreThan, MoreThanOrEqual, Not, SelectQueryBuilder } from "typeorm";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

type TCapturedQuery = { parameters: Array<unknown>; sql: string };

const HISTORIC_KEY: string = "1800-06-01 14:30:17+02:30:17";
const LEDGER_ID: string = "00000000-0000-4000-8000-000000000001";

const createDataSource = async (relationLoadStrategy?: "join" | "query"): Promise<DataSource> => {
	const dataSource: DataSource = new DataSource({ entities: [KeyPageAccountEntity, KeyPageAuditorEntity, KeyPageBatchEntity, KeyPageCalendarEntity, KeyPageDayEntity, KeyPageEntryEntity, KeyPageHolderEntity, KeyPageInstantEntity, KeyPageJournalEntity, KeyPageLedgerEntity, KeyPageReceiptEntity, KeyPageWalletEntity], type: "postgres", ...(relationLoadStrategy ? { relationLoadStrategy } : {}) });

	// Metadata is enough to build SQL; the tests never connect.
	await (dataSource as unknown as { buildMetadatas: () => Promise<void> }).buildMetadatas();

	return dataSource;
};

describe("ApiFunctionKeyPageLoader", () => {
	let auditors: Repository<KeyPageAuditorEntity>;
	let batches: Repository<KeyPageBatchEntity>;
	let dataSource: DataSource;
	let entries: Repository<KeyPageEntryEntity>;
	let journals: Repository<KeyPageJournalEntity>;
	let ledgers: Repository<KeyPageLedgerEntity>;
	let receipts: Repository<KeyPageReceiptEntity>;
	let wallets: Repository<KeyPageWalletEntity>;
	let rawQueries: Array<TCapturedQuery>;
	let entityQueries: Array<TCapturedQuery>;
	let countQueries: Array<TCapturedQuery>;
	let keyRows: Array<Record<string, unknown>>;
	let entities: Array<KeyPageLedgerEntity>;
	let queryRunners: Array<unknown>;

	const capture = (builder: SelectQueryBuilder<ObjectLiteral>): TCapturedQuery => {
		const [sql, parameters]: [string, Array<unknown>] = builder.getQueryAndParameters();

		return { parameters, sql };
	};

	beforeAll(async () => {
		dataSource = await createDataSource();
		auditors = dataSource.getRepository(KeyPageAuditorEntity);
		batches = dataSource.getRepository(KeyPageBatchEntity);
		entries = dataSource.getRepository(KeyPageEntryEntity);
		journals = dataSource.getRepository(KeyPageJournalEntity);
		ledgers = dataSource.getRepository(KeyPageLedgerEntity);
		receipts = dataSource.getRepository(KeyPageReceiptEntity);
		wallets = dataSource.getRepository(KeyPageWalletEntity);
	});

	const stubQueries = (): void => {
		rawQueries = [];
		entityQueries = [];
		countQueries = [];
		queryRunners = [];
		keyRows = [{ key_0: LEDGER_ID, key_1: HISTORIC_KEY }];
		entities = [Object.assign(new KeyPageLedgerEntity(), { id: LEDGER_ID })];

		vi.spyOn(SelectQueryBuilder.prototype, "getRawMany").mockImplementation(async function (this: SelectQueryBuilder<ObjectLiteral>): Promise<Array<never>> {
			rawQueries.push(capture(this));
			queryRunners.push(this.queryRunner);

			return keyRows as Array<never>;
		});
		vi.spyOn(SelectQueryBuilder.prototype, "getMany").mockImplementation(async function (this: SelectQueryBuilder<ObjectLiteral>): Promise<Array<never>> {
			entityQueries.push(capture(this));
			queryRunners.push(this.queryRunner);

			return entities as Array<never>;
		});
		vi.spyOn(SelectQueryBuilder.prototype, "getCount").mockImplementation(async function (this: SelectQueryBuilder<ObjectLiteral>): Promise<number> {
			countQueries.push(capture(this));
			queryRunners.push(this.queryRunner);

			return 7;
		});
	};

	beforeEach(() => {
		vi.spyOn(LoggerUtility.prototype, "error").mockImplementation((): void => undefined);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("reads a joined temporal-key page as text keys and binds that text back", async () => {
		stubQueries();

		const items: Array<KeyPageLedgerEntity> = await ApiFunctionKeyPageLoader.findMany(ledgers, { order: { sequence: "DESC" }, relations: { account: true }, skip: 2, take: 2, where: { accountId: "account-a" } });
		const [keyQuery]: Array<TCapturedQuery> = rawQueries;
		const [entityQuery]: Array<TCapturedQuery> = entityQueries;

		expect(items).toBe(entities);
		expect(keyQuery?.sql).toContain("SELECT DISTINCT");
		expect(keyQuery?.sql).toContain('"KeyPageLedgerEntity"."postedAt"::text AS "key_1"');
		expect(keyQuery?.sql).toContain('"KeyPageLedgerEntity"."id"::text AS "key_0"');
		expect(keyQuery?.sql).toContain("LEFT JOIN");
		expect(keyQuery?.sql).toContain('ORDER BY "crud_automator_key_page"."order_0" DESC, "crud_automator_key_page"."primary_0" ASC, "crud_automator_key_page"."primary_1" ASC');
		expect(keyQuery?.sql).toMatch(/LIMIT 2 OFFSET 2$/u);
		expect(keyQuery?.parameters).toEqual(["account-a"]);
		expect(entityQuery?.sql).toContain('(("KeyPageLedgerEntity"."id" = $2 AND "KeyPageLedgerEntity"."postedAt" = $3))');
		expect(entityQuery?.sql).not.toContain("LIMIT");
		expect(entityQuery?.sql).not.toContain("OFFSET");
		expect(entityQuery?.parameters).toEqual(["account-a", LEDGER_ID, HISTORIC_KEY]);
	});

	it("keeps the find order direction of a primary column instead of a tie-breaker direction", async () => {
		stubQueries();

		await ApiFunctionKeyPageLoader.findMany(ledgers, { order: { postedAt: "DESC" }, relations: { account: true }, take: 2 });

		expect(rawQueries[0]?.sql).toContain('ORDER BY "crud_automator_key_page"."order_0" DESC, "crud_automator_key_page"."primary_0" ASC LIMIT 2');
		expect(entityQueries[0]?.sql).toMatch(/ORDER BY "KeyPageLedgerEntity"\."postedAt" DESC, "KeyPageLedgerEntity"\."id" ASC$/u);
	});

	it("reads every option of the request, inherited options included", async () => {
		stubQueries();

		const options: FindManyOptions<KeyPageLedgerEntity> = Object.assign(Object.create({ where: { accountId: "inherited-account" } }) as FindManyOptions<KeyPageLedgerEntity>, { relations: { account: true }, take: 2 });

		await ApiFunctionKeyPageLoader.findMany(ledgers, options);

		expect(rawQueries[0]?.parameters).toEqual(["inherited-account"]);
		expect(entityQueries[0]?.parameters).toEqual(["inherited-account", LEDGER_ID, HISTORIC_KEY]);
	});

	it("counts the unpaged matches next to a joined temporal-key page", async () => {
		stubQueries();

		const result: [Array<KeyPageLedgerEntity>, number] = await ApiFunctionKeyPageLoader.findAndCount(ledgers, { relations: { watchers: true }, skip: 1, take: 2, where: { accountId: "account-a" } });

		expect(result).toEqual([entities, 7]);
		expect(countQueries[0]?.sql).not.toContain("LIMIT");
		expect(countQueries[0]?.parameters).toEqual(["account-a"]);
	});

	it("finds one joined temporal-key entity through a single key, or null", async () => {
		stubQueries();

		expect(await ApiFunctionKeyPageLoader.findOne(ledgers, { relations: { account: true }, where: { id: LEDGER_ID } })).toBe(entities[0]);
		expect(rawQueries[0]?.sql).toMatch(/LIMIT 1$/u);

		keyRows = [];

		expect(await ApiFunctionKeyPageLoader.findOne(ledgers, { relations: { account: true }, where: { id: LEDGER_ID } })).toBeNull();
		expect(entityQueries).toHaveLength(1);
	});

	it("fails closed when a joined temporal-key page orders by a relation", async () => {
		stubQueries();

		await expect(ApiFunctionKeyPageLoader.findMany(ledgers, { order: { account: { name: "ASC" } }, take: 2 })).rejects.toThrow('Paged read of entity "KeyPageLedgerEntity" cannot order by relation path "account": an entity with a temporal primary key and joined relations pages only by its own columns');
		expect(rawQueries).toEqual([]);
	});

	it.each([
		["an unpaged read", { relations: { account: true } }],
		["a read without joins", { take: 2, where: { accountId: "account-a" } }],
		["a read with eager joins disabled", { loadEagerRelations: false, take: 2 }],
	] as const)("keeps the repository methods for %s", async (_label, options) => {
		stubQueries();

		const find = vi.spyOn(ledgers, "find").mockResolvedValue([]);
		const findAndCount = vi.spyOn(ledgers, "findAndCount").mockResolvedValue([[], 0]);

		await ApiFunctionKeyPageLoader.findMany(ledgers, options);
		await ApiFunctionKeyPageLoader.findAndCount(ledgers, options);

		expect(find.mock.calls[0]?.[0]).toBe(options);
		expect(findAndCount.mock.calls[0]?.[0]).toBe(options);
		expect(rawQueries).toEqual([]);
	});

	it("keeps the repository methods for a joined page without a temporal primary key", async () => {
		stubQueries();

		const options: FindManyOptions<KeyPageWalletEntity> = { take: 2 };
		const find = vi.spyOn(wallets, "find").mockResolvedValue([]);
		const findOne = vi.spyOn(wallets, "findOne").mockResolvedValue(null);

		await ApiFunctionKeyPageLoader.findMany(wallets, options);
		await ApiFunctionKeyPageLoader.findOne(wallets, { where: { id: LEDGER_ID } });

		expect(find.mock.calls[0]?.[0]).toBe(options);
		expect(findOne).toHaveBeenCalledOnce();
		expect(rawQueries).toEqual([]);
	});

	it("keeps the repository methods for other drivers and incomplete repositories", async () => {
		const options: FindManyOptions<KeyPageLedgerEntity> = { relations: { watchers: true }, relationLoadStrategy: "query", take: 2 };
		const find = vi.fn().mockResolvedValue([]);
		const mysqlRepository: Repository<KeyPageLedgerEntity> = { find, manager: { connection: { driver: { options: { type: "mysql" } } } }, metadata: ledgers.metadata } as unknown as Repository<KeyPageLedgerEntity>;
		const mockRepository: Repository<KeyPageLedgerEntity> = { find, manager: { connection: {} } } as unknown as Repository<KeyPageLedgerEntity>;

		await ApiFunctionKeyPageLoader.findMany(mysqlRepository, options);
		await ApiFunctionKeyPageLoader.findMany(mockRepository, options);

		expect(find).toHaveBeenCalledTimes(2);
		expect(find.mock.calls.every(([calledOptions]: Array<unknown>): boolean => calledOptions === options)).toBe(true);
	});

	it("pages and guards CockroachDB reads like PostgreSQL ones, since both bind through node-postgres", async () => {
		const cockroach: DataSource = new DataSource({ entities: [KeyPageAccountEntity, KeyPageLedgerEntity], timeTravelQueries: false, type: "cockroachdb" });

		await (cockroach as unknown as { buildMetadatas: () => Promise<void> }).buildMetadatas();
		stubQueries();

		const cockroachLedgers: Repository<KeyPageLedgerEntity> = cockroach.getRepository(KeyPageLedgerEntity);

		await ApiFunctionKeyPageLoader.findMany(cockroachLedgers, { relations: { account: true }, skip: 2, take: 2 });

		expect(rawQueries[0]?.sql).toContain('"KeyPageLedgerEntity"."postedAt"::text AS "key_1"');
		expect(entityQueries[0]?.parameters).toEqual([LEDGER_ID, HISTORIC_KEY]);
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(cockroachLedgers, { relationLoadStrategy: "query", relations: { account: true } })).toThrow('relation "account" of entity "KeyPageLedgerEntity" with relationLoadStrategy "query" cannot load');
	});

	it("pages an entity with a date primary key in two steps over text keys", async () => {
		stubQueries();
		await ApiFunctionKeyPageLoader.findMany(dataSource.getRepository(KeyPageDayEntity), { relations: { calendar: true }, skip: 1, take: 2 });

		expect(rawQueries[0]?.sql).toContain('"KeyPageDayEntity"."day"::text AS "key_0"');
	});

	it('rejects a "query" relation over a date join column and over a date primary key', () => {
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(dataSource.getRepository(KeyPageCalendarEntity), { relationLoadStrategy: "query", relations: { days: true } })).toThrow('relation "days" of entity "KeyPageCalendarEntity" with relationLoadStrategy "query" cannot load because its query filters by the PostgreSQL date or timestamp column "calendarOpenedOn" of entity "KeyPageDayEntity"');
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(dataSource.getRepository(KeyPageDayEntity), { relationLoadStrategy: "query", relations: { calendar: true } })).toThrow('relation "calendar" of entity "KeyPageDayEntity" with relationLoadStrategy "query" cannot load because its query filters by the PostgreSQL date or timestamp column "day" of entity "KeyPageDayEntity"');
	});

	it("sorts nulls of the key step the way the find order asks", async () => {
		stubQueries();

		await ApiFunctionKeyPageLoader.findMany(ledgers, { order: { sequence: { direction: "DESC", nulls: "last" } }, relations: { account: true }, take: 2 });
		await ApiFunctionKeyPageLoader.findMany(ledgers, { order: { sequence: { direction: "asc", nulls: "FIRST" } }, relations: { account: true }, take: 2 });

		expect(rawQueries[0]?.sql).toContain('ORDER BY "crud_automator_key_page"."order_0" DESC NULLS LAST, "crud_automator_key_page"."primary_0" ASC');
		expect(rawQueries[1]?.sql).toContain('ORDER BY "crud_automator_key_page"."order_0" ASC NULLS FIRST, "crud_automator_key_page"."primary_0" ASC');
	});

	it("reads every descending direction form of the find order", async () => {
		stubQueries();

		await ApiFunctionKeyPageLoader.findMany(ledgers, { order: { sequence: -1 }, relations: { account: true }, take: 2 });
		await ApiFunctionKeyPageLoader.findMany(ledgers, { order: { sequence: "desc" }, relations: { account: true }, take: 2 });
		await ApiFunctionKeyPageLoader.findMany(ledgers, { order: { sequence: 1 }, relations: { account: true }, take: 2 });

		expect(rawQueries.map((query: TCapturedQuery): string | undefined => /"order_0" (?<direction>ASC|DESC)/u.exec(query.sql)?.groups?.direction)).toEqual(["DESC", "DESC", "ASC"]);
	});

	it("runs the key step, the entity step and the count on one released read query runner", async () => {
		stubQueries();

		const release = vi.fn(async (): Promise<void> => undefined);
		const queryRunner: object = { release };
		const createQueryRunner = vi.spyOn(dataSource, "createQueryRunner").mockReturnValue(queryRunner as never);

		await ApiFunctionKeyPageLoader.findAndCount(ledgers, { relations: { account: true }, take: 2 });

		expect(createQueryRunner).toHaveBeenCalledExactlyOnceWith("slave");
		expect(queryRunners).toEqual([queryRunner, queryRunner, queryRunner]);
		expect(release).toHaveBeenCalledOnce();

		keyRows = [];
		await ApiFunctionKeyPageLoader.findOne(ledgers, { relations: { account: true } });

		expect(release).toHaveBeenCalledTimes(2);
	});

	it("keeps the query runner of a transaction manager open", async () => {
		stubQueries();

		const release = vi.fn(async (): Promise<void> => undefined);
		const queryRunner: object = { release };
		const createQueryRunner = vi.spyOn(dataSource, "createQueryRunner");
		const transactionLedgers: Repository<KeyPageLedgerEntity> = dataSource.createEntityManager(queryRunner as never).getRepository(KeyPageLedgerEntity);

		await ApiFunctionKeyPageLoader.findMany(transactionLedgers, { relations: { account: true }, take: 2 });

		expect(createQueryRunner).not.toHaveBeenCalled();
		expect(queryRunners).toEqual([queryRunner, queryRunner]);
		expect(release).not.toHaveBeenCalled();
	});

	it('rejects every "query" relation of an entity with a temporal primary key and names the relation, the column, and the recipe', () => {
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(ledgers, { relationLoadStrategy: "query", relations: { account: true } })).toThrow(
			/^\[NestJS-Crud-Automator\] relation "account" of entity "KeyPageLedgerEntity" with relationLoadStrategy "query" cannot load because its query filters by the PostgreSQL date or timestamp column "postedAt" of entity "KeyPageLedgerEntity", which pg binds through a local offset truncated to whole minutes; use relationLoadStrategy: "join"$/u,
		);
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(ledgers, { relationLoadStrategy: "query", relations: ["watchers"] })).toThrow('relation "watchers"');
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(ledgers, { relationLoadStrategy: "query", relations: { watchers: true } }, 'Controller "LedgerController" route "getList"')).toThrow('Controller "LedgerController" route "getList": relation "watchers"');
	});

	it('rejects a "query" relation over a temporal join column on either side of the relation', () => {
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(batches, { relationLoadStrategy: "query", relations: { entries: true } })).toThrow('relation "entries" of entity "KeyPageBatchEntity" with relationLoadStrategy "query" cannot load because its query filters by the PostgreSQL date or timestamp column "batchClosedAt" of entity "KeyPageEntryEntity"');
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(entries, { relationLoadStrategy: "query", relations: { batch: true } })).toThrow('relation "batch" of entity "KeyPageEntryEntity" with relationLoadStrategy "query" cannot load because its query filters by the PostgreSQL date or timestamp column "batchClosedAt" of entity "KeyPageEntryEntity"');
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(receipts, { loadEagerRelations: false, relationLoadStrategy: "query", relations: { journal: true } })).toThrow('relation "journal" of entity "KeyPageReceiptEntity" with relationLoadStrategy "query" cannot load because its query filters by the PostgreSQL date or timestamp column "journalBookedAt"');
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(auditors, { relationLoadStrategy: "query", relations: { batches: true } })).toThrow('relation "batches" of entity "KeyPageAuditorEntity" with relationLoadStrategy "query" cannot load because its query filters by the PostgreSQL date or timestamp column "batchClosedAt" of entity "key_page_auditor_batches"');
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(batches, { relationLoadStrategy: "query", relations: { auditors: true } })).toThrow('relation "auditors" of entity "KeyPageBatchEntity" with relationLoadStrategy "query" cannot load because its query filters by the PostgreSQL date or timestamp column "batchClosedAt" of entity "key_page_auditor_batches"');
	});

	it('walks nested "query" relations to the level whose query binds a temporal column', () => {
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(receipts, { loadEagerRelations: false, relationLoadStrategy: "query", relations: { batch: true } })).not.toThrow();
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(receipts, { loadEagerRelations: false, relationLoadStrategy: "query", relations: { batch: { entries: true } } })).toThrow('relation "batch.entries" of entity "KeyPageReceiptEntity" with relationLoadStrategy "query" cannot load because its query filters by the PostgreSQL date or timestamp column "batchClosedAt" of entity "KeyPageEntryEntity"');
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(receipts, { loadEagerRelations: false, relationLoadStrategy: "query", relations: ["batch.entries"] })).toThrow('relation "batch.entries"');
	});

	it('accepts "join" loading and "query" relations that bind no temporal value', () => {
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(ledgers, { relationLoadStrategy: "join", relations: { account: true, watchers: true } })).not.toThrow();
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(ledgers, { relations: { watchers: true } })).not.toThrow();
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(ledgers, { relationLoadStrategy: "query", relations: { account: false, watchers: false } })).not.toThrow();
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(ledgers, { relationLoadStrategy: "query" })).not.toThrow();
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(wallets, { relationLoadStrategy: "query", relations: { account: true } })).not.toThrow();
	});

	it('inherits a "query" data-source default for every falsy request strategy', async () => {
		const queryDataSource: DataSource = await createDataSource("query");
		const queryLedgers: Repository<KeyPageLedgerEntity> = queryDataSource.getRepository(KeyPageLedgerEntity);

		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(queryLedgers, { relations: { account: true } })).toThrow('relation "account"');
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(queryLedgers, { relationLoadStrategy: "", relations: { account: true } })).toThrow('relation "account"');
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(queryLedgers, { relationLoadStrategy: "join", relations: { account: true } })).not.toThrow();
	});

	it("rejects to-many @RelationId properties of an entity with a temporal primary key on every strategy", () => {
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(journals, {})).toThrow(/^\[NestJS-Crud-Automator\] @RelationId property "readerIds" of entity "KeyPageJournalEntity" cannot load because its query filters by the PostgreSQL date or timestamp column "bookedAt" of entity "KeyPageJournalEntity", which pg binds through a local offset truncated to whole minutes; load the relation with relationLoadStrategy: "join" instead$/u);
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(journals, { relationLoadStrategy: "join" }, 'Controller "JournalController" route "get"')).toThrow('Controller "JournalController" route "get": @RelationId property "readerIds"');
	});

	it("rejects @RelationId properties of eager and requested relation targets", () => {
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(receipts, {})).toThrow('@RelationId property "readerIds" of entity "KeyPageJournalEntity"');
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(receipts, { loadEagerRelations: false })).not.toThrow();
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(receipts, { loadEagerRelations: false, relations: { journal: true } })).toThrow('@RelationId property "readerIds" of entity "KeyPageJournalEntity"');
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(receipts, { loadEagerRelations: false, relations: { batch: { entries: true } } })).not.toThrow();
	});

	it("rejects to-many loadRelationIds of an entity with a temporal primary key", () => {
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(ledgers, { loadRelationIds: true })).toThrow(/^\[NestJS-Crud-Automator\] loadRelationIds relation "watchers" of entity "KeyPageLedgerEntity" cannot load because its query filters by the PostgreSQL date or timestamp column "postedAt"/u);
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(ledgers, { loadRelationIds: { relations: ["watchers"] } })).toThrow('loadRelationIds relation "watchers"');
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(ledgers, { loadRelationIds: { relations: ["account"] } })).not.toThrow();
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(ledgers, { loadRelationIds: false })).not.toThrow();
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(batches, { loadRelationIds: { relations: ["entries"] } })).toThrow('loadRelationIds relation "entries" of entity "KeyPageBatchEntity"');
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(wallets, { loadRelationIds: true })).not.toThrow();
	});

	it("writes the exact text of a relation load error to the error log", () => {
		const error = vi.spyOn(LoggerUtility.prototype, "error");

		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(journals, {})).toThrow("readerIds");
		expect(error).toHaveBeenCalledExactlyOnceWith(expect.stringMatching(/^@RelationId property "readerIds" of entity "KeyPageJournalEntity" cannot load because .+ instead$/u));
	});

	it("writes the exact text of a relation order error to the error log", async () => {
		stubQueries();

		const error = vi.spyOn(LoggerUtility.prototype, "error");

		await expect(ApiFunctionKeyPageLoader.findMany(ledgers, { order: { account: { name: "ASC" } }, take: 2 })).rejects.toThrow("relation path");
		expect(error).toHaveBeenCalledExactlyOnceWith('Paged read of entity "KeyPageLedgerEntity" cannot order by relation path "account": an entity with a temporal primary key and joined relations pages only by its own columns');
	});

	it("fails every read with a relation load over temporal values before any query runs", async () => {
		stubQueries();

		const find = vi.spyOn(ledgers, "find").mockResolvedValue([]);
		const findOne = vi.spyOn(journals, "findOne").mockResolvedValue(null);

		await expect(ApiFunctionKeyPageLoader.findMany(ledgers, { relationLoadStrategy: "query", relations: { account: true } })).rejects.toThrow('relation "account"');
		await expect(ApiFunctionKeyPageLoader.findAndCount(ledgers, { relationLoadStrategy: "query", relations: { watchers: true }, take: 2 })).rejects.toThrow('relation "watchers"');
		await expect(ApiFunctionKeyPageLoader.findOne(ledgers, { relationLoadStrategy: "query", relations: { account: true }, where: { id: LEDGER_ID } })).rejects.toThrow('relation "account"');
		await expect(ApiFunctionKeyPageLoader.findMany(ledgers, { loadRelationIds: true })).rejects.toThrow("loadRelationIds");
		await expect(ApiFunctionKeyPageLoader.findOne(journals, { where: { id: LEDGER_ID } })).rejects.toThrow("@RelationId");
		expect(find).not.toHaveBeenCalled();
		expect(findOne).not.toHaveBeenCalled();
		expect(rawQueries).toEqual([]);
	});
	it("releases its own query runner when a step of the read fails", async () => {
		stubQueries();

		const release = vi.fn(async (): Promise<void> => undefined);

		vi.spyOn(dataSource, "createQueryRunner").mockReturnValue({ release } as never);
		vi.spyOn(SelectQueryBuilder.prototype, "getRawMany").mockRejectedValue(new Error("key step failed"));

		await expect(ApiFunctionKeyPageLoader.findMany(ledgers, { relations: { account: true }, take: 2 })).rejects.toThrow("key step failed");
		expect(release).toHaveBeenCalledOnce();
	});

	it('checks eager relations of an entity a "query" relation loads, also when the read skips eager relations', () => {
		const holders: Repository<KeyPageHolderEntity> = dataSource.getRepository(KeyPageHolderEntity);

		for (const loadEagerRelations of [false, true, undefined]) {
			expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(holders, { loadEagerRelations, relationLoadStrategy: "query", relations: { receipt: true } })).toThrow('@RelationId property "readerIds" of entity "KeyPageJournalEntity"');
		}

		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(holders, { loadEagerRelations: false, relationLoadStrategy: "join", relations: { receipt: true } })).not.toThrow();
	});

	describe("binding Date conditions", () => {
		const INSTANT: Date = new Date("1800-06-01T12:00:00.000Z");
		const LATER: Date = new Date("1800-06-01T12:00:05.000Z");
		let instants: Repository<KeyPageInstantEntity>;

		beforeAll(() => {
			instants = dataSource.getRepository(KeyPageInstantEntity);
		});

		beforeEach(() => {
			stubQueries();
			KEY_PAGE_INSTANT_INPUTS.length = 0;
		});

		const bindParameters = async (where: unknown): Promise<Array<unknown>> => {
			await ApiFunctionKeyPageLoader.findMany(instants, { where: where as never });

			return entityQueries.at(-1)?.parameters ?? [];
		};

		it.each([
			["a plain Date", INSTANT, ["1800-06-01T12:00:01.000Z"], 1],
			["Equal", Equal(INSTANT), ["1800-06-01T12:00:01.000Z"], 1],
			["Not", Not(INSTANT), ["1800-06-01T12:00:01.000Z"], 1],
			["MoreThan", MoreThan(INSTANT), ["1800-06-01T12:00:01.000Z"], 1],
			["MoreThanOrEqual", MoreThanOrEqual(INSTANT), ["1800-06-01T12:00:01.000Z"], 1],
			["LessThan", LessThan(INSTANT), ["1800-06-01T12:00:01.000Z"], 1],
			["LessThanOrEqual", LessThanOrEqual(INSTANT), ["1800-06-01T12:00:01.000Z"], 1],
			["Between", Between(INSTANT, LATER), ["1800-06-01T12:00:01.000Z", "1800-06-01T12:00:06.000Z"], 2],
			["In", In([INSTANT, LATER]), ["1800-06-01T12:00:01.000Z", "1800-06-01T12:00:06.000Z"], 2],
			["Not of MoreThan", Not(MoreThan(INSTANT)), ["1800-06-01T12:00:01.000Z"], 1],
			["And of MoreThanOrEqual and Equal", And(MoreThanOrEqual(INSTANT), Equal(LATER)), ["1800-06-01T12:00:01.000Z", "1800-06-01T12:00:06.000Z"], 2],
		])("hands the transformer each Date of %s once and binds canonical UTC text", async (_label, condition, parameters, transformerCalls) => {
			expect(await bindParameters({ transformedAt: condition })).toEqual(parameters);
			expect(KEY_PAGE_INSTANT_INPUTS).toHaveLength(transformerCalls);
			expect(KEY_PAGE_INSTANT_INPUTS.every((input: unknown): boolean => input instanceof Date)).toBe(true);
		});

		it("keeps a condition that is already bound and hands the transformer nothing", async () => {
			const bound: ApiFunctionBoundOperator<unknown> = new ApiFunctionBoundOperator<unknown>("1800-06-01T12:00:00.000Z", instants.metadata.findColumnWithPropertyPath("transformedAt")?.transformer);

			expect(await bindParameters({ transformedAt: bound })).toEqual(["1800-06-01T12:00:00.000Z"]);
			expect(KEY_PAGE_INSTANT_INPUTS).toEqual([]);
		});

		it("keeps a bound operand of a composed condition and hands the transformer only the other one", async () => {
			const bound: ApiFunctionBoundOperator<unknown> = new ApiFunctionBoundOperator<unknown>("1800-06-01T12:00:00.000Z", instants.metadata.findColumnWithPropertyPath("transformedAt")?.transformer);

			expect(await bindParameters({ transformedAt: And(bound, Equal(LATER)) })).toEqual(["1800-06-01T12:00:00.000Z", "1800-06-01T12:00:06.000Z"]);
			expect(KEY_PAGE_INSTANT_INPUTS).toEqual([LATER]);
		});

		it("keeps a nested operator inside Not and binds its Date", async () => {
			expect(await bindParameters({ transformedAt: Not(MoreThan(INSTANT)) })).toEqual(["1800-06-01T12:00:01.000Z"]);
			expect(entityQueries[0]?.sql).toContain('NOT("KeyPageInstantEntity"."transformedAt" > $1)');
		});

		it("passes operands other than Dates through unchanged next to bound Dates", async () => {
			expect(await bindParameters({ plainAt: In([INSTANT, "1800-06-01T12:00:09.000Z"]) })).toEqual(["1800-06-01T12:00:00.000Z", "1800-06-01T12:00:09.000Z"]);
		});

		it("hands the transformer every operand of a bound condition once, Dates and others alike", async () => {
			expect(await bindParameters({ taggedAt: In([INSTANT, "1800-06-01T12:00:09.000Z"]) })).toEqual(["1800-06-01T12:00:00.000Z", "tag:1800-06-01T12:00:09.000Z"]);
			expect(KEY_PAGE_INSTANT_INPUTS).toEqual([INSTANT, "1800-06-01T12:00:09.000Z"]);
		});

		it("leaves Dates to TypeORM on drivers other than node-postgres", async () => {
			const oracle: DataSource = await createDataSource();

			(oracle.driver.options as { type: string }).type = "oracle";

			const oracleInstants: Repository<KeyPageInstantEntity> = oracle.getRepository(KeyPageInstantEntity);
			const find = vi.spyOn(oracleInstants, "find").mockResolvedValue([]);
			const options = { where: { plainAt: INSTANT, transformedAt: In([INSTANT]) } };

			await ApiFunctionKeyPageLoader.findMany(oracleInstants, options);

			expect(find.mock.calls[0]?.[0]).toBe(options);
		});

		it("hands the transformer of a timestamp column each Date of a composed condition once and keeps the Dates", async () => {
			const where: unknown = AuthorizationScopeMergeWhere({ localTransformedAt: MoreThanOrEqual(INSTANT) } as never, { localTransformedAt: LessThan(LATER) } as never);

			expect(await bindParameters(where)).toEqual([new Date("1800-06-01T12:00:01.000Z"), new Date("1800-06-01T12:00:06.000Z")]);
			expect(KEY_PAGE_INSTANT_INPUTS).toEqual([INSTANT, LATER]);
		});

		it("binds a composed condition under Not on a transformed timestamp column", async () => {
			expect(await bindParameters({ localTransformedAt: Not(And(MoreThanOrEqual(INSTANT), LessThan(LATER))) })).toEqual([new Date("1800-06-01T12:00:01.000Z"), new Date("1800-06-01T12:00:06.000Z")]);
			expect(KEY_PAGE_INSTANT_INPUTS).toEqual([INSTANT, LATER]);
		});

		it.each([
			["Not of one operator on a transformed timestamp column", { localTransformedAt: Not(MoreThan(INSTANT)) }],
			["And on a timestamp column without a transformer", { localAt: And(MoreThanOrEqual(INSTANT), LessThan(LATER)) }],
			["And on a transformed integer column", { count: And(MoreThanOrEqual(1), LessThan(5)) }],
		])("leaves %s to TypeORM", async (_label, where) => {
			const find = vi.spyOn(instants, "find");
			const options = { where: where as never };

			await ApiFunctionKeyPageLoader.findMany(instants, options);

			expect(find.mock.calls[0]?.[0]).toBe(options);
		});

		it("hands the transformer no operand of an operator that binds none", async () => {
			expect(await bindParameters({ transformedAt: And(MoreThanOrEqual(INSTANT), Not(IsNull())) })).toEqual(["1800-06-01T12:00:01.000Z"]);
			expect(KEY_PAGE_INSTANT_INPUTS).toEqual([INSTANT]);
		});

		it("hands the transformer the list operand of a single-parameter operator whole, as TypeORM does", async () => {
			await bindParameters({ taggedAt: Equal([INSTANT] as never) });

			expect(KEY_PAGE_INSTANT_INPUTS).toEqual([[INSTANT]]);
		});

		it("leaves a single operator on a transformed timestamp column to TypeORM", async () => {
			const find = vi.spyOn(instants, "find");
			const options = { where: { localTransformedAt: MoreThan(INSTANT) } };

			await ApiFunctionKeyPageLoader.findMany(instants, options);

			expect(find.mock.calls[0]?.[0]).toBe(options);
			expect(entityQueries[0]?.parameters).toEqual([new Date("1800-06-01T12:00:01.000Z")]);
		});

		it("binds a composed condition on a transformed instant column as transformed Dates on other drivers", async () => {
			const oracle: DataSource = await createDataSource();

			(oracle.driver.options as { type: string }).type = "oracle";

			const oracleInstants: Repository<KeyPageInstantEntity> = oracle.getRepository(KeyPageInstantEntity);
			const find = vi.spyOn(oracleInstants, "find").mockResolvedValue([]);

			await ApiFunctionKeyPageLoader.findMany(oracleInstants, { where: { transformedAt: And(MoreThanOrEqual(INSTANT), LessThan(LATER)) } });

			const bound = (find.mock.calls[0]?.[0] as unknown as { where: { transformedAt: { value: Array<{ value: unknown }> } } }).where.transformedAt;

			expect(bound.value.map((operator: { value: unknown }): unknown => operator.value)).toEqual([new Date("1800-06-01T12:00:01.000Z"), new Date("1800-06-01T12:00:06.000Z")]);
			expect(KEY_PAGE_INSTANT_INPUTS).toEqual([INSTANT, LATER]);
		});

		it.each([
			["a plain value", "1800-06-01T12:00:00.000Z", ["1800-06-01T12:00:00.000Z"]],
			["MoreThan", MoreThan("1800-06-01T12:00:00.000Z"), ["1800-06-01T12:00:00.000Z"]],
			["Between", Between("1800-06-01T12:00:00.000Z", "1800-06-01T12:00:05.000Z"), ["1800-06-01T12:00:00.000Z", "1800-06-01T12:00:05.000Z"]],
		])("binds canonical UTC text for the Date a transformer returns from %s", async (_label, condition, parameters) => {
			expect(await bindParameters({ parsedAt: condition })).toEqual(parameters);
		});

		it("leaves a null or undefined condition on a transformed instant column to TypeORM, which rejects it", async () => {
			await expect(bindParameters({ transformedAt: null })).rejects.toThrow("Null value encountered in property 'KeyPageInstantEntity.transformedAt'");
			await expect(bindParameters({ transformedAt: undefined })).rejects.toThrow("Undefined value encountered in property 'KeyPageInstantEntity.transformedAt'");
			expect(KEY_PAGE_INSTANT_INPUTS).toEqual([]);
		});

		it("binds what a transformer returns for a Date when it is not a Date", async () => {
			expect(await bindParameters({ textAt: INSTANT })).toEqual(["1800-06-01T12:00:00.000+00:00"]);
		});

		it("binds a client filter merged with an authorization scope on the same transformed column once", async () => {
			const where: unknown = AuthorizationScopeMergeWhere({ transformedAt: MoreThanOrEqual(INSTANT) } as never, { transformedAt: LATER } as never);

			expect(await bindParameters(where)).toEqual(["1800-06-01T12:00:01.000Z", "1800-06-01T12:00:06.000Z"]);
			expect(KEY_PAGE_INSTANT_INPUTS).toEqual([INSTANT, LATER]);
		});

		it("runs every transformer of a column in order", async () => {
			expect(await bindParameters({ orderedAt: INSTANT })).toEqual(["1800-06-01T12:00:01.000Z"]);
			expect(KEY_PAGE_INSTANT_INPUTS).toEqual([INSTANT, "second"]);
		});

		it("binds Dates in every branch, relation, and embedded part of the where clause", async () => {
			expect(await bindParameters([{ plainAt: INSTANT }, { ledger: { postedAt: LessThan(LATER) } }, { window: { startsAt: MoreThan(INSTANT) } }])).toEqual(["1800-06-01T12:00:00.000Z", "1800-06-01T12:00:05.000Z", "1800-06-01T12:00:00.000Z"]);
		});

		it("keeps the options of a read whose where clause binds no Date of a timestamptz column", async () => {
			const find = vi.spyOn(instants, "find");
			const options = { where: { id: LEDGER_ID, localAt: INSTANT, plainAt: "1800-06-01T12:00:00.000Z" as never } };

			await ApiFunctionKeyPageLoader.findMany(instants, options);

			expect(find.mock.calls[0]?.[0]).toBe(options);
			expect(entityQueries[0]?.parameters).toEqual([LEDGER_ID, INSTANT, "1800-06-01T12:00:00.000Z"]);
		});

		it("keeps every own and inherited option of a read whose where clause binds", async () => {
			const find = vi.spyOn(instants, "find");
			const options = Object.assign(Object.create({ where: { plainAt: INSTANT } }) as object, { order: { id: "ASC" as const }, take: 2 });

			await ApiFunctionKeyPageLoader.findMany(instants, options);

			const boundOptions: { order?: unknown; take?: unknown; where?: unknown } = find.mock.calls[0]?.[0] as never;

			expect(Object.getPrototypeOf(boundOptions)).toBe(Object.getPrototypeOf(options));
			expect(boundOptions.take).toBe(2);
			expect(boundOptions.where).toEqual({ plainAt: expect.objectContaining({ type: "equal", value: "1800-06-01T12:00:00.000Z" }) });
			expect(entityQueries[0]?.sql).toContain('ORDER BY "KeyPageInstantEntity"."id" ASC');
		});

		it("binds the where clause of every reader", async () => {
			const findOne = vi.spyOn(instants, "findOne").mockResolvedValue(null);
			const findAndCount = vi.spyOn(instants, "findAndCount").mockResolvedValue([[], 0]);

			await ApiFunctionKeyPageLoader.findOne(instants, { where: { plainAt: INSTANT } });
			await ApiFunctionKeyPageLoader.findAndCount(instants, { where: { plainAt: INSTANT } });

			for (const read of [findOne, findAndCount]) {
				expect((read.mock.calls[0]?.[0] as { where: { plainAt: { value: unknown } } }).where.plainAt.value).toBe("1800-06-01T12:00:00.000Z");
			}
		});

		it("hands the transformer of a date column each Date of a composed condition once", async () => {
			KEY_PAGE_CALENDAR_INPUTS.length = 0;
			await ApiFunctionKeyPageLoader.findMany(dataSource.getRepository(KeyPageCalendarEntity), { where: { dueOn: And(MoreThanOrEqual(new Date("2024-03-01T00:00:00.000Z")), LessThan(new Date("2024-04-01T00:00:00.000Z"))) } });

			expect(entityQueries.at(-1)?.parameters).toEqual(["2024-03-01", "2024-04-01"]);
			expect(KEY_PAGE_CALENDAR_INPUTS).toEqual([new Date("2024-03-01T00:00:00.000Z"), new Date("2024-04-01T00:00:00.000Z")]);
		});

		it("leaves the driver's parameter types to MSSQL on a composed condition it binds", async () => {
			// The driver option keeps TypeORM from loading the mssql package; the test never connects.
			const mssql: DataSource = new DataSource({ driver: {}, entities: [KeyPageMssqlEntity], type: "mssql" } as unknown as DataSourceOptions);

			await (mssql as unknown as { buildMetadatas: () => Promise<void> }).buildMetadatas();
			await ApiFunctionKeyPageLoader.findMany(mssql.getRepository(KeyPageMssqlEntity), { where: { bookedAt: And(MoreThanOrEqual(INSTANT), LessThan(LATER)) } });

			expect(entityQueries[0]?.parameters).toEqual([expect.objectContaining({ type: "datetime2", value: INSTANT }), expect.objectContaining({ type: "datetime2", value: LATER })]);
		});

		it("rejects an invalid Date before query I/O", async () => {
			await expect(ApiFunctionKeyPageLoader.findMany(instants, { where: { plainAt: new Date(Number.NaN) } })).rejects.toThrow("Cannot bind an invalid Date as a query parameter");
			expect(entityQueries).toEqual([]);
		});

		it("takes the column type from the driver, so a CockroachDB create date column binds canonical UTC text", async () => {
			const cockroach: DataSource = new DataSource({ entities: [KeyPageCreatedEntity], timeTravelQueries: false, type: "cockroachdb" });

			await (cockroach as unknown as { buildMetadatas: () => Promise<void> }).buildMetadatas();
			await ApiFunctionKeyPageLoader.findMany(cockroach.getRepository(KeyPageCreatedEntity), { where: { createdAt: INSTANT } });

			expect(entityQueries[0]?.parameters).toEqual(["1800-06-01T12:00:00.000Z"]);
		});
	});
});
