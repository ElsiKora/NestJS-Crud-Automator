import type { IApiAuthorizationIamDialect } from "@interface/class/api/authorization";
import type { DataSource } from "typeorm";

import { AUTHORIZATION_IAM_DIALECT_CONSTANT } from "@constant/class/authorization";
import { DATABASE_DRIVER_TYPE_CONSTANT } from "@constant/database-driver-type.constant";
import { EApiAuthorizationIamDialect } from "@enum/class/authorization";
import { Injectable } from "@nestjs/common";
import { LoggerUtility } from "@utility/logger.utility";

const iamDialectRegistryLogger: LoggerUtility = LoggerUtility.getLogger("ApiAuthorizationIamDialectRegistry");

// Driver types of PostgreSQL and CockroachDB, as the TypeORM DataSource options name them.
const IAM_DIALECT_REGISTRY_POSTGRES_DRIVER_TYPES: ReadonlySet<string> = new Set<string>(["cockroachdb", "postgres"]);

/**
 * The SQL dialect of each IAM resource entity in one application. Bootstrap registers the DataSource each IAM
 * controller reads its entity from; the dialect of a DataSource is read once and kept. PostgreSQL, CockroachDB and the
 * SQLite family are known from the driver type. MySQL and MariaDB both run behind the TypeORM type `mysql`, so one
 * `SELECT VERSION()` probe tells them apart, and reads the connection charset their binary String comparison needs.
 *
 * An entity no registered DataSource maps lowers with the portable dialect. DataSources of different dialects for one
 * entity, or a DataSource whose probe fails, make it `UNRESOLVED`, which compiles no scope.
 */
@Injectable()
export class ApiAuthorizationIamDialectRegistry {
	private readonly dataSources: Map<object, Set<DataSource>> = new Map<object, Set<DataSource>>();

	private readonly dialects: WeakMap<DataSource, Promise<IApiAuthorizationIamDialect>> = new WeakMap<DataSource, Promise<IApiAuthorizationIamDialect>>();

	/**
	 * Forgets every registration. The dialect read of a DataSource stays with the DataSource.
	 */
	public clear(): void {
		this.dataSources.clear();
	}

	/**
	 * Registers the DataSource an IAM resource entity is read from. The dialect of an initialized DataSource is read
	 * at once, so a request does not wait for the probe.
	 * @param {object} entity - Resource entity class.
	 * @param {DataSource} dataSource - DataSource that reads the entity.
	 */
	public register(entity: object, dataSource: DataSource): void {
		let entityDataSources: Set<DataSource> | undefined = this.dataSources.get(entity);

		if (!entityDataSources) {
			entityDataSources = new Set<DataSource>();
			this.dataSources.set(entity, entityDataSources);
		}

		entityDataSources.add(dataSource);

		if (dataSource.isInitialized) {
			void this.readDialect(dataSource);
		}
	}

	/**
	 * Resolves the dialect an IAM scope of a resource entity is lowered to.
	 * @param {object} entity - Resource entity class.
	 * @returns {Promise<IApiAuthorizationIamDialect>} The dialect: portable when no DataSource is registered for the entity, unresolved when its DataSources disagree or one cannot be read, and with the DataSource when exactly one reads the entity.
	 */
	public async resolve(entity: object): Promise<IApiAuthorizationIamDialect> {
		const entityDataSources: Set<DataSource> | undefined = this.dataSources.get(entity);

		if (!entityDataSources || entityDataSources.size === 0) {
			return { type: EApiAuthorizationIamDialect.PORTABLE };
		}

		const dialects: Array<IApiAuthorizationIamDialect> = await Promise.all([...entityDataSources].map(async (dataSource: DataSource): Promise<IApiAuthorizationIamDialect> => await this.readDialect(dataSource)));
		const first: IApiAuthorizationIamDialect | undefined = dialects[0];
		const others: Array<IApiAuthorizationIamDialect> = dialects.slice(1);

		if (!first || others.some((dialect: IApiAuthorizationIamDialect): boolean => dialect.type !== first.type || dialect.binaryCollation !== first.binaryCollation || dialect.driverType !== first.driverType)) {
			iamDialectRegistryLogger.warn(`IAM resource entity "${(entity as { name?: string }).name ?? "unknown"}" is read through DataSources of different dialects, so its scopes fail closed.`);

			return { type: EApiAuthorizationIamDialect.UNRESOLVED };
		}

		// A key through a to-many relation names tables and columns, which only one DataSource's metadata spells for sure.
		const [onlyDataSource]: Array<DataSource> = entityDataSources.size === 1 ? [...entityDataSources] : [];

		return onlyDataSource ? { ...first, dataSource: onlyDataSource } : first;
	}

	/**
	 * Compares the leading `major.minor.patch` of a server version with a minimum.
	 * @param {string} version - Server version, such as `8.4.2` or `11.4.2-MariaDB-ubu2404`.
	 * @param {string} minimum - Minimum version, such as `8.0.17`.
	 * @returns {boolean} Whether the version is at least the minimum; false when it cannot be read.
	 */
	private isVersionAtLeast(version: string, minimum: string): boolean {
		const parts: Array<number> | undefined = this.readVersion(version);
		const required: Array<number> | undefined = this.readVersion(minimum);

		if (!parts || !required) {
			return false;
		}

		for (const [index, part] of parts.entries()) {
			const requiredPart: number = required[index] ?? 0;

			if (part !== requiredPart) {
				return part > requiredPart;
			}
		}

		return true;
	}

	/**
	 * Reads the dialect of the MySQL family through the version probe.
	 * @param {DataSource} dataSource - Initialized MySQL-family DataSource.
	 * @returns {Promise<IApiAuthorizationIamDialect>} The MySQL or MariaDB dialect.
	 */
	private async probeMysqlFamily(dataSource: DataSource): Promise<IApiAuthorizationIamDialect> {
		const rows: unknown = await dataSource.query(AUTHORIZATION_IAM_DIALECT_CONSTANT.MYSQL_PROBE_QUERY);
		const row: Record<string, unknown> | undefined = Array.isArray(rows) ? (rows[0] as Record<string, unknown> | undefined) : undefined;
		const version: string = typeof row?.version === "string" ? row.version : "";
		const charset: string = typeof row?.charset === "string" ? row.charset.toLowerCase() : "";
		const isMariaDatabase: boolean = dataSource.options.type === "mariadb" || version.toLowerCase().includes("mariadb");
		const collation: string = isMariaDatabase ? AUTHORIZATION_IAM_DIALECT_CONSTANT.MARIADB_BINARY_COLLATION : AUTHORIZATION_IAM_DIALECT_CONSTANT.MYSQL_BINARY_COLLATION;
		const since: string = isMariaDatabase ? AUTHORIZATION_IAM_DIALECT_CONSTANT.MARIADB_BINARY_COLLATION_SINCE : AUTHORIZATION_IAM_DIALECT_CONSTANT.MYSQL_BINARY_COLLATION_SINCE;
		const hasBinaryCollation: boolean = charset === AUTHORIZATION_IAM_DIALECT_CONSTANT.MYSQL_CONNECTION_CHARSET && this.isVersionAtLeast(version, since);

		if (!hasBinaryCollation) {
			iamDialectRegistryLogger.warn(`IAM String conditions fail closed on ${isMariaDatabase ? "MariaDB" : "MySQL"} ${version || "of an unknown version"} with the connection charset "${charset}": they need ${collation} and a utf8mb4 connection.`);
		}

		return { ...(hasBinaryCollation ? { binaryCollation: collation } : {}), driverType: dataSource.options.type, type: isMariaDatabase ? EApiAuthorizationIamDialect.MARIADB : EApiAuthorizationIamDialect.MYSQL, version };
	}

	/**
	 * Reads the dialect of a DataSource once. A MySQL-family DataSource that is not initialized yet cannot be probed:
	 * it reads as unresolved and is probed again on the next call.
	 * @param {DataSource} dataSource - DataSource.
	 * @returns {Promise<IApiAuthorizationIamDialect>} The dialect.
	 */
	private async readDialect(dataSource: DataSource): Promise<IApiAuthorizationIamDialect> {
		const known: Promise<IApiAuthorizationIamDialect> | undefined = this.dialects.get(dataSource);

		if (known) {
			return await known;
		}

		const driverType: string = dataSource.options.type;

		if (IAM_DIALECT_REGISTRY_POSTGRES_DRIVER_TYPES.has(driverType)) {
			return { driverType, type: EApiAuthorizationIamDialect.POSTGRES };
		}

		if (DATABASE_DRIVER_TYPE_CONSTANT.SQLITE_FAMILY.has(driverType)) {
			return { driverType, type: EApiAuthorizationIamDialect.SQLITE };
		}

		if (!AUTHORIZATION_IAM_DIALECT_CONSTANT.MYSQL_DRIVER_TYPES.has(driverType)) {
			return { driverType, type: EApiAuthorizationIamDialect.PORTABLE };
		}

		if (!dataSource.isInitialized) {
			return { driverType, type: EApiAuthorizationIamDialect.UNRESOLVED };
		}

		const probe: Promise<IApiAuthorizationIamDialect> = this.probeMysqlFamily(dataSource).catch((error: unknown): IApiAuthorizationIamDialect => {
			iamDialectRegistryLogger.warn(`The IAM dialect probe of a ${driverType} DataSource failed, so its scopes fail closed: ${error instanceof Error ? error.name : "unknown error"}`);

			return { driverType, type: EApiAuthorizationIamDialect.UNRESOLVED };
		});

		this.dialects.set(dataSource, probe);

		return await probe;
	}

	/**
	 * Reads the leading `major.minor.patch` of a version.
	 * @param {string} version - Version text.
	 * @returns {Array<number> | undefined} The three numbers, or undefined when the text does not start with them.
	 */
	private readVersion(version: string): Array<number> | undefined {
		const match: null | RegExpExecArray = /^(\d+)\.(\d+)\.(\d+)/u.exec(version);

		return match ? match.slice(1).map(Number) : undefined;
	}
}
