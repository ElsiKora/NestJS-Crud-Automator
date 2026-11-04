import type { DataSource } from "typeorm";

import { ApiAuthorizationIamDialectRegistry } from "@class/api/authorization/iam";
import { AUTHORIZATION_IAM_DIALECT_CONSTANT } from "@constant/class/authorization";
import { EApiAuthorizationIamDialect } from "@enum/class/authorization";
import { describe, expect, it, vi } from "vitest";

class DialectItemEntity {}

const createDataSource = (type: string, options: { charset?: string; isInitialized?: boolean; query?: () => Promise<unknown>; version?: string } = {}): DataSource =>
	({
		isInitialized: options.isInitialized ?? true,
		options: { type },
		query: vi.fn(options.query ?? (async (): Promise<unknown> => [{ charset: options.charset ?? "utf8mb4", version: options.version ?? "8.4.2" }])),
	}) as unknown as DataSource;

const resolve = async (dataSource: DataSource): Promise<unknown> => {
	const registry: ApiAuthorizationIamDialectRegistry = new ApiAuthorizationIamDialectRegistry();

	registry.register(DialectItemEntity, dataSource);

	return await registry.resolve(DialectItemEntity);
};

describe("ApiAuthorizationIamDialectRegistry", () => {
	it("lowers an entity no DataSource maps with the portable dialect", async () => {
		await expect(new ApiAuthorizationIamDialectRegistry().resolve(DialectItemEntity)).resolves.toEqual({ type: EApiAuthorizationIamDialect.PORTABLE });
	});

	it.each([
		["postgres", EApiAuthorizationIamDialect.POSTGRES],
		["cockroachdb", EApiAuthorizationIamDialect.POSTGRES],
		["better-sqlite3", EApiAuthorizationIamDialect.SQLITE],
		["sqljs", EApiAuthorizationIamDialect.SQLITE],
		["oracle", EApiAuthorizationIamDialect.PORTABLE],
		["mssql", EApiAuthorizationIamDialect.PORTABLE],
	])("reads the %s driver type without a query", async (type: string, dialect: EApiAuthorizationIamDialect) => {
		const dataSource: DataSource = createDataSource(type);

		await expect(resolve(dataSource)).resolves.toEqual({ driverType: type, type: dialect });
		expect(dataSource.query).not.toHaveBeenCalled();
	});

	it.each([
		["MySQL 8.4", "mysql", "8.4.2", "utf8mb4", { binaryCollation: "utf8mb4_0900_bin", driverType: "mysql", type: EApiAuthorizationIamDialect.MYSQL, version: "8.4.2" }],
		["MySQL at the first version with the collation", "mysql", "8.0.17", "utf8mb4", { binaryCollation: "utf8mb4_0900_bin", driverType: "mysql", type: EApiAuthorizationIamDialect.MYSQL, version: "8.0.17" }],
		["MySQL before the collation", "mysql", "8.0.16", "utf8mb4", { driverType: "mysql", type: EApiAuthorizationIamDialect.MYSQL, version: "8.0.16" }],
		["MariaDB behind the mysql type", "mysql", "11.4.2-MariaDB-ubu2404", "utf8mb4", { binaryCollation: "utf8mb4_nopad_bin", driverType: "mysql", type: EApiAuthorizationIamDialect.MARIADB, version: "11.4.2-MariaDB-ubu2404" }],
		["MariaDB behind the mariadb type", "mariadb", "10.2.2-whatever", "utf8mb4", { binaryCollation: "utf8mb4_nopad_bin", driverType: "mariadb", type: EApiAuthorizationIamDialect.MARIADB, version: "10.2.2-whatever" }],
		["MariaDB before the collation", "mysql", "10.1.48-MariaDB", "utf8mb4", { driverType: "mysql", type: EApiAuthorizationIamDialect.MARIADB, version: "10.1.48-MariaDB" }],
		["a connection that is not utf8mb4", "mysql", "8.4.2", "latin1", { driverType: "mysql", type: EApiAuthorizationIamDialect.MYSQL, version: "8.4.2" }],
		["an unreadable version", "mysql", "unknown", "utf8mb4", { driverType: "mysql", type: EApiAuthorizationIamDialect.MYSQL, version: "unknown" }],
	])("probes %s", async (_name: string, type: string, version: string, charset: string, dialect: unknown) => {
		const dataSource: DataSource = createDataSource(type, { charset, version });

		await expect(resolve(dataSource)).resolves.toEqual(dialect);
		expect(dataSource.query).toHaveBeenCalledWith(AUTHORIZATION_IAM_DIALECT_CONSTANT.MYSQL_PROBE_QUERY);
	});

	it("probes a DataSource once, from the registration on", async () => {
		const registry: ApiAuthorizationIamDialectRegistry = new ApiAuthorizationIamDialectRegistry();
		const dataSource: DataSource = createDataSource("mysql");

		registry.register(DialectItemEntity, dataSource);
		expect(dataSource.query).toHaveBeenCalledTimes(1);

		await registry.resolve(DialectItemEntity);
		await registry.resolve(DialectItemEntity);
		expect(dataSource.query).toHaveBeenCalledTimes(1);
	});

	it("fails closed while a MySQL DataSource is not initialized, and probes it once it is", async () => {
		const registry: ApiAuthorizationIamDialectRegistry = new ApiAuthorizationIamDialectRegistry();
		const dataSource: DataSource = createDataSource("mysql", { isInitialized: false });

		registry.register(DialectItemEntity, dataSource);
		await expect(registry.resolve(DialectItemEntity)).resolves.toEqual({ driverType: "mysql", type: EApiAuthorizationIamDialect.UNRESOLVED });

		Reflect.set(dataSource, "isInitialized", true);
		await expect(registry.resolve(DialectItemEntity)).resolves.toMatchObject({ type: EApiAuthorizationIamDialect.MYSQL });
	});

	it("fails closed when the probe fails", async () => {
		await expect(
			resolve(
				createDataSource("mysql", {
					query: async (): Promise<unknown> => {
						throw new Error("connection lost");
					},
				}),
			),
		).resolves.toEqual({ driverType: "mysql", type: EApiAuthorizationIamDialect.UNRESOLVED });
	});

	it("fails closed for an entity read through DataSources of different dialects", async () => {
		const registry: ApiAuthorizationIamDialectRegistry = new ApiAuthorizationIamDialectRegistry();

		registry.register(DialectItemEntity, createDataSource("postgres"));
		registry.register(DialectItemEntity, createDataSource("better-sqlite3"));

		await expect(registry.resolve(DialectItemEntity)).resolves.toEqual({ type: EApiAuthorizationIamDialect.UNRESOLVED });
	});

	it("keeps one dialect for an entity read through two DataSources of the same dialect", async () => {
		const registry: ApiAuthorizationIamDialectRegistry = new ApiAuthorizationIamDialectRegistry();

		registry.register(DialectItemEntity, createDataSource("postgres"));
		registry.register(DialectItemEntity, createDataSource("postgres"));

		await expect(registry.resolve(DialectItemEntity)).resolves.toEqual({ driverType: "postgres", type: EApiAuthorizationIamDialect.POSTGRES });
	});

	it("forgets its registrations on clear", async () => {
		const registry: ApiAuthorizationIamDialectRegistry = new ApiAuthorizationIamDialectRegistry();

		registry.register(DialectItemEntity, createDataSource("postgres"));
		registry.clear();

		await expect(registry.resolve(DialectItemEntity)).resolves.toEqual({ type: EApiAuthorizationIamDialect.PORTABLE });
	});
});
