import type { DataSourceOptions } from "typeorm";

import { ApiFunctionKeyPageLoader } from "@class/api/function/key-page-loader.class";
import { KeyPageMysqlStampEntity, KeyPageSqliteStampEntity } from "@test/unit/class/api/function/fixture/key-page-stamp.entity";
import { And, DataSource, LessThan, MoreThanOrEqual } from "typeorm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

describe("ApiFunctionKeyPageLoader on other drivers", () => {
	const FROM: Date = new Date("2024-03-01T10:00:01.000Z");
	const TO: Date = new Date("2024-03-01T10:00:03.000Z");
	let sqlite: DataSource;

	beforeAll(async () => {
		sqlite = new DataSource({ database: ":memory:", entities: [KeyPageSqliteStampEntity], synchronize: true, type: "better-sqlite3" });
		await sqlite.initialize();

		for (const second of [0, 1, 2, 3, 4]) {
			await sqlite.query('INSERT INTO "key_page_sqlite_stamps" ("id", "stampedAt") VALUES (?, ?)', [`stamp-${String(second)}`, `2024-03-01T10:00:0${String(second)}.000Z`]);
		}
	});

	afterAll(async () => {
		await sqlite.destroy();
	});

	it("reads a composed condition on a transformed SQLite datetime column through the transformer once per operand", async () => {
		const stamps: Array<KeyPageSqliteStampEntity> = await ApiFunctionKeyPageLoader.findMany(sqlite.getRepository(KeyPageSqliteStampEntity), { order: { id: "ASC" }, where: { stampedAt: And(MoreThanOrEqual(FROM), LessThan(TO)) } });

		expect(stamps.map(({ id }: KeyPageSqliteStampEntity): string => id)).toEqual(["stamp-1", "stamp-2"]);
	});

	it("binds a composed condition on a transformed MySQL timestamp column as the transformer returns it", async () => {
		// A stub driver keeps TypeORM from loading a mysql package, which the project does not install; the test never connects.
		const mysql: DataSource = new DataSource({ connectorPackage: "mysql2", database: "stamps", driver: { isStub: true }, entities: [KeyPageMysqlStampEntity], type: "mysql" } as unknown as DataSourceOptions);

		await (mysql as unknown as { buildMetadatas: () => Promise<void> }).buildMetadatas();

		const repository = mysql.getRepository(KeyPageMysqlStampEntity);
		const find = vi.spyOn(repository, "find").mockResolvedValue([]);

		await ApiFunctionKeyPageLoader.findMany(repository, { where: { stampedAt: And(MoreThanOrEqual(FROM), LessThan(TO)) } });

		const [, parameters]: [string, Array<unknown>] = repository
			.createQueryBuilder()
			.setFindOptions(find.mock.calls[0]?.[0] ?? {})
			.getQueryAndParameters();

		expect(parameters).toEqual(["2024-03-01 10:00:01.000", "2024-03-01 10:00:03.000"]);
	});
});
