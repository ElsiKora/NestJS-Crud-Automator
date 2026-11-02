import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TTypeOrmColumnMetadata } from "@type/utility/typeorm";
import type { Driver, Repository } from "typeorm";

import { ApiControllerGeneratedTemporalBodySource } from "@class/api/controller/generated/temporal-body-source.class";
import { ApiControllerGeneratedUtcDate } from "@class/api/controller/generated/utc-date.class";
import { DATABASE_COLUMN_TYPE_CONSTANT } from "@constant/database-column-type.constant";
import { DATABASE_DRIVER_TYPE_CONSTANT } from "@constant/database-driver-type.constant";
import { DATE_TIME_TEXT_CONSTANT } from "@constant/date-time-text.constant";
import { BadRequestException } from "@nestjs/common";
import { ErrorException } from "@utility/error/exception.utility";

// A JavaScript Date holds whole milliseconds.
const DATE_FRACTION_DIGITS: number = 3;

// An ISO 8601 calendar date followed by a time of day.
const DATE_TIME_PATTERN: RegExp = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;

// Digits of the fraction of a second.
const FRACTION_PATTERN: RegExp = /\.(\d+)/;

// Fraction digits past the precision a column stores, which must all be zeros.
const ZERO_DIGITS_PATTERN: RegExp = /^0*$/;

const MILLISECONDS_PER_SECOND: number = 1000;

const DECIMAL_BASE: number = 10;

// Drivers that read back a date and time primary key the database fills, proven by the temporal primary key matrix.
const FILLED_KEY_DRIVER_TYPES: ReadonlySet<string> = new Set<string>(["cockroachdb", "mariadb", "postgres"]);

// Column types without a declared default precision that still cannot store a finer value than a Date holds.
const MILLISECOND_COLUMN_TYPES: ReadonlySet<string> = new Set<string>(["datetime", "smalldatetime"]);

/**
 * Parses the date and time primary key values of a create body once, so the row the create writes and the key that identifies it hold the same value.
 * A value the column cannot store exactly is refused before the insert, because the stored key would no longer match it.
 */
export class ApiControllerGeneratedCreateTemporalKeyContract {
	/**
	 * Fails when the create could not tell which row it stored, because the database fills a date and time primary column on a driver that cannot read that value back.
	 * Under authorization it also fails for a date and time primary column that can hold a value finer than a millisecond: a Date cannot tell such rows apart, so the scope could be checked against another row of the same millisecond.
	 * A key the body supplies is known without reading it back, so without authorization it works on every driver.
	 * @template E The entity type
	 * @param {Repository<E> | undefined} repository - Repository of the created entity; nothing is checked without one.
	 * @param {string} source - Controller route named in the error.
	 * @param {boolean} isSecurable - Whether the route runs under authorization.
	 * @throws {Error} When a date and time primary column cannot identify the created row.
	 */
	public static assertIdentifiable<E extends IApiBaseEntity>(repository: Repository<E> | undefined, source: string, isSecurable: boolean): void {
		// A data source that starts after the application has no metadata yet, and the request path checks again once it does.
		if (!repository?.manager.dataSource.isInitialized) {
			return;
		}

		const { driver, options }: Repository<E>["manager"]["dataSource"] = repository.manager.dataSource;

		for (const column of repository.metadata.primaryColumns) {
			const columnType: string = driver.normalizeType(column);
			const path: string = column.propertyPath ?? column.propertyName;

			if (!this.isDateTime(columnType)) {
				continue;
			}

			if (this.isFilledByDatabase(column) && !FILLED_KEY_DRIVER_TYPES.has(options.type)) {
				throw ErrorException(`${source} cannot identify the row it creates: the database fills date and time primary column ${path} of ${repository.metadata.name}, and the ${options.type} driver cannot read that value back; send the key in the body or use one of ${[...FILLED_KEY_DRIVER_TYPES].join(", ")}`);
			}

			if (isSecurable && this.holdsFinerThanDate(driver, column, columnType, options.type)) {
				throw ErrorException(`${source} cannot identify the row it creates under authorization: date and time primary column ${path} of ${repository.metadata.name} can hold values finer than a millisecond, which a JavaScript Date cannot tell apart, so the scope could be checked against another row; declare it with precision: ${String(DATE_FRACTION_DIGITS)}`);
			}
		}
	}

	/**
	 * Tells whether a column stores a date and a time, with or without a zone.
	 * @param {string} columnType - Column type as the driver normalizes it.
	 * @returns {boolean} True for timestamp, datetime, and timestamptz columns.
	 */
	public static isDateTime(columnType: string): boolean {
		return DATABASE_COLUMN_TYPE_CONSTANT.DATE_TIME.has(columnType) || DATABASE_COLUMN_TYPE_CONSTANT.INSTANT.has(columnType);
	}

	/**
	 * Replaces each date and time primary key value of the body with its parsed Date.
	 * @template E The entity type
	 * @param {Repository<E> | undefined} repository - Repository of the created entity.
	 * @param {object | undefined} body - Create body, changed in place.
	 * @throws {BadRequestException} When a value is not a date and time, an instant has no zone, a value is more precise than its column, or a wall clock column cannot store the value apart from another one.
	 */
	public static parse<E extends IApiBaseEntity>(repository: Repository<E> | undefined, body: object | undefined): void {
		if (!repository) {
			throw ErrorException("Repository is not available in this context");
		}

		if (!body) {
			return;
		}

		const driver: Driver = repository.manager.dataSource.driver;
		const messages: Array<string> = [];

		for (const column of repository.metadata.primaryColumns) {
			const columnType: string = driver.normalizeType(column);
			// A key inside an embedded property sits under that property in the body, as in the entity.
			const path: string = column.propertyPath ?? column.propertyName;
			const value: unknown = this.readPath(body, path);

			if (!this.isDateTime(columnType) || value === undefined || value === null) {
				continue;
			}

			const text: string | undefined = this.readText(value);
			// A body DTO has already parsed its value, and that Date stays the one the row and the key hold.
			const date: Date | undefined = value instanceof Date ? value : this.parseText(text);
			const isInstant: boolean = DATABASE_COLUMN_TYPE_CONSTANT.INSTANT.has(columnType);
			// Every other column stores the local wall clock of the Date, which the second occurrence of a repeated hour shares with the first, so one key would name the row of the other.
			const isWallClock: boolean = !isInstant && !DATABASE_DRIVER_TYPE_CONSTANT.SQLITE_FAMILY.has(repository.manager.dataSource.options.type);
			const message: string | undefined = this.check(path, date, text, isInstant, Math.min(this.getPrecision(driver, column, columnType) ?? DATE_FRACTION_DIGITS, DATE_FRACTION_DIGITS)) ?? (isWallClock && date && this.isRepeatedHour(date) ? `${path} falls in the second occurrence of an hour that a daylight saving change repeats in the process time zone, which this column cannot store apart from the first` : undefined);

			if (message) {
				messages.push(message);
			} else if (date) {
				// The column transformer receives this Date once on the write; node-postgres would move an instant in a zone whose offset holds seconds.
				this.writePath(body, path, isInstant && DATABASE_DRIVER_TYPE_CONSTANT.NODE_POSTGRES.has(repository.manager.dataSource.options.type) ? new ApiControllerGeneratedUtcDate(date.getTime()) : date);
			}
		}

		if (messages.length > 0) {
			throw new BadRequestException(messages);
		}
	}

	private static check(property: string, date: Date | undefined, text: string | undefined, isInstant: boolean, fractionDigits: number): string | undefined {
		if (!date || Number.isNaN(date.getTime()) || (text !== undefined && !DATE_TIME_PATTERN.test(text))) {
			return `${property} must be a valid ISO 8601 date-time`;
		}

		// An instant column stores a point in time, which a wall-clock value without a zone does not name.
		if (isInstant && text !== undefined && !DATE_TIME_TEXT_CONSTANT.ZONE_PATTERN.test(text)) {
			return `${property} must carry a time zone designator or an offset`;
		}

		const isStorable: boolean = text === undefined ? (date.getTime() % MILLISECONDS_PER_SECOND) % DECIMAL_BASE ** (DATE_FRACTION_DIGITS - fractionDigits) === 0 : ZERO_DIGITS_PATTERN.test(FRACTION_PATTERN.exec(text)?.[1]?.slice(fractionDigits) ?? "");

		return isStorable ? undefined : `${property} must not hold more than ${fractionDigits} fractional second digits`;
	}

	private static getPrecision(driver: Driver, column: TTypeOrmColumnMetadata, columnType: string): number | undefined {
		return column.precision ?? driver.dataTypeDefaults?.[columnType]?.precision ?? undefined;
	}

	private static holdsFinerThanDate(driver: Driver, column: TTypeOrmColumnMetadata, columnType: string, driverType: string): boolean {
		const precision: number | undefined = this.getPrecision(driver, column, columnType);

		if (precision !== undefined) {
			return precision > DATE_FRACTION_DIGITS;
		}

		// SQLite stores the text of a Date; every other driver with no known default, such as CockroachDB, keeps a finer fraction.
		return !DATABASE_DRIVER_TYPE_CONSTANT.SQLITE_FAMILY.has(driverType) && !MILLISECOND_COLUMN_TYPES.has(columnType);
	}

	private static isFilledByDatabase(column: TTypeOrmColumnMetadata): boolean {
		return column.isCreateDate || column.isUpdateDate || column.isGenerated || column.asExpression !== undefined || (column.default !== undefined && column.default !== null);
	}

	private static isRepeatedHour(date: Date): boolean {
		// Local fields resolve to the first occurrence of a repeated hour.
		const wallClock: Date = new Date(0);
		wallClock.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
		wallClock.setHours(date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());

		return wallClock.getTime() !== date.getTime();
	}

	private static parseText(text: string | undefined): Date | undefined {
		return text === undefined ? undefined : new Date(text.replace(" ", "T"));
	}

	/**
	 * Reads a value of the body by its property path, through the embedded properties it holds.
	 * @param {object} body - Create body.
	 * @param {string} path - Property path of the column.
	 * @returns {unknown} The value, or undefined when the body lacks it or an embedded property on its way.
	 */
	private static readPath(body: object, path: string): unknown {
		let current: unknown = body;

		for (const key of path.split(".")) {
			if (typeof current !== "object" || current === null) {
				return undefined;
			}

			current = Reflect.get(current, key);
		}

		return current;
	}

	private static readText(value: unknown): string | undefined {
		if (typeof value === "string") {
			return value;
		}

		return value instanceof Date ? ApiControllerGeneratedTemporalBodySource.read(value) : undefined;
	}

	/**
	 * Writes a value of the body by its property path, into the embedded properties {@link ApiControllerGeneratedCreateTemporalKeyContract.readPath} found.
	 * @param {object} body - Create body, changed in place.
	 * @param {string} path - Property path of the column.
	 * @param {unknown} value - The value to write.
	 */
	private static writePath(body: object, path: string, value: unknown): void {
		const separator: number = path.lastIndexOf(".");
		const owner: unknown = separator === -1 ? body : this.readPath(body, path.slice(0, separator));

		if (typeof owner === "object" && owner !== null) {
			Reflect.set(owner, path.slice(separator + 1), value);
		}
	}
}
