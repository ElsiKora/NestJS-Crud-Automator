import type { FindManyOptions, ObjectLiteral, Repository } from "typeorm";

import { ApiFunctionKeyPageLoader } from "@class/api/function/key-page-loader.class";
import { KeyPageAccountEntity } from "@test/unit/class/api/function/fixture/key-page-account.entity";
import { KeyPageLedgerEntity } from "@test/unit/class/api/function/fixture/key-page-ledger.entity";
import { KeyPageWalletEntity } from "@test/unit/class/api/function/fixture/key-page-wallet.entity";
import { DataSource, SelectQueryBuilder } from "typeorm";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

type TCapturedQuery = { parameters: Array<unknown>; sql: string };

const HISTORIC_KEY: string = "1800-06-01 14:30:17+02:30:17";
const LEDGER_ID: string = "00000000-0000-4000-8000-000000000001";

const createDataSource = async (relationLoadStrategy?: "join" | "query"): Promise<DataSource> => {
	const dataSource: DataSource = new DataSource({ entities: [KeyPageAccountEntity, KeyPageLedgerEntity, KeyPageWalletEntity], type: "postgres", ...(relationLoadStrategy ? { relationLoadStrategy } : {}) });

	// Metadata is enough to build SQL; the tests never connect.
	await (dataSource as unknown as { buildMetadatas: () => Promise<void> }).buildMetadatas();

	return dataSource;
};

describe("ApiFunctionKeyPageLoader", () => {
	let ledgers: Repository<KeyPageLedgerEntity>;
	let wallets: Repository<KeyPageWalletEntity>;
	let rawQueries: Array<TCapturedQuery>;
	let entityQueries: Array<TCapturedQuery>;
	let countQueries: Array<TCapturedQuery>;
	let keyRows: Array<Record<string, unknown>>;
	let entities: Array<KeyPageLedgerEntity>;

	const capture = (builder: SelectQueryBuilder<ObjectLiteral>): TCapturedQuery => {
		const [sql, parameters]: [string, Array<unknown>] = builder.getQueryAndParameters();

		return { parameters, sql };
	};

	beforeAll(async () => {
		const dataSource: DataSource = await createDataSource();

		ledgers = dataSource.getRepository(KeyPageLedgerEntity);
		wallets = dataSource.getRepository(KeyPageWalletEntity);
	});

	const stubQueries = (): void => {
		rawQueries = [];
		entityQueries = [];
		countQueries = [];
		keyRows = [{ key_0: LEDGER_ID, key_1: HISTORIC_KEY }];
		entities = [Object.assign(new KeyPageLedgerEntity(), { id: LEDGER_ID })];

		vi.spyOn(SelectQueryBuilder.prototype, "getRawMany").mockImplementation(async function (this: SelectQueryBuilder<ObjectLiteral>): Promise<Array<never>> {
			rawQueries.push(capture(this));

			return keyRows as Array<never>;
		});
		vi.spyOn(SelectQueryBuilder.prototype, "getMany").mockImplementation(async function (this: SelectQueryBuilder<ObjectLiteral>): Promise<Array<never>> {
			entityQueries.push(capture(this));

			return entities as Array<never>;
		});
		vi.spyOn(SelectQueryBuilder.prototype, "getCount").mockImplementation(async function (this: SelectQueryBuilder<ObjectLiteral>): Promise<number> {
			countQueries.push(capture(this));

			return 7;
		});
	};

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

	it('rejects a "query" relation over a temporal join column and names the relation, the column, and the recipe', () => {
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(ledgers, { watchers: true }, "query")).toThrow(/^\[NestJS-Crud-Automator\] relation "watchers" of entity "KeyPageLedgerEntity" cannot load with relationLoadStrategy "query" because its join column "keyPageLedgersPostedAt" is a PostgreSQL date or timestamp, which pg binds through a local offset truncated to whole minutes; use relationLoadStrategy: "join"$/u);
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(ledgers, ["account", "watchers"], "query")).toThrow('relation "watchers"');
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(ledgers, { watchers: true }, "query", 'Controller "LedgerController" route "getList"')).toThrow('Controller "LedgerController" route "getList": relation "watchers"');
	});

	it('accepts "join" loading and "query" relations without temporal join columns', () => {
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(ledgers, { watchers: true }, "join")).not.toThrow();
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(ledgers, { watchers: true }, undefined)).not.toThrow();
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(ledgers, { account: true, watchers: false }, "query")).not.toThrow();
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(ledgers, undefined, "query")).not.toThrow();
	});

	it('inherits a "query" data-source default for every falsy request strategy', async () => {
		const queryDataSource: DataSource = await createDataSource("query");
		const queryLedgers: Repository<KeyPageLedgerEntity> = queryDataSource.getRepository(KeyPageLedgerEntity);

		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(queryLedgers, { watchers: true }, undefined)).toThrow('relation "watchers"');
		expect(() => ApiFunctionKeyPageLoader.assertRelationLoad(queryLedgers, { watchers: true }, "join")).not.toThrow();
	});

	it('fails every read with a "query" temporal relation before any query runs', async () => {
		stubQueries();

		const find = vi.spyOn(ledgers, "find").mockResolvedValue([]);

		await expect(ApiFunctionKeyPageLoader.findMany(ledgers, { relationLoadStrategy: "query", relations: { watchers: true } })).rejects.toThrow('relation "watchers"');
		await expect(ApiFunctionKeyPageLoader.findAndCount(ledgers, { relationLoadStrategy: "query", relations: { watchers: true }, take: 2 })).rejects.toThrow('relation "watchers"');
		await expect(ApiFunctionKeyPageLoader.findOne(ledgers, { relationLoadStrategy: "query", relations: { watchers: true }, where: { id: LEDGER_ID } })).rejects.toThrow('relation "watchers"');
		expect(find).not.toHaveBeenCalled();
		expect(rawQueries).toEqual([]);
	});
});
