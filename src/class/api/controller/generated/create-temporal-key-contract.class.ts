import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TTypeOrmColumnMetadata } from "@type/utility/typeorm";
import type { Driver, Repository } from "typeorm";

import { ApiControllerGeneratedTemporalBodySource } from "@class/api/controller/generated/temporal-body-source.class";
import { ApiControllerGeneratedTemporalParameterContract } from "@class/api/controller/generated/temporal-parameter-contract.class";
import { BadRequestException } from "@nestjs/common";
import { ErrorException } from "@utility/error/exception.utility";

// A JavaScript Date holds whole milliseconds.
const DATE_FRACTION_DIGITS: number = 3;

// An ISO 8601 calendar date followed by a time of day.
const DATE_TIME_PATTERN: RegExp = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;

// Digits of the fraction of a second.
const FRACTION_PATTERN: RegExp = /\.(\d+)/;

// Trailing zone designator or offset.
const ZONE_PATTERN: RegExp = /(?:Z|[+-]\d{2}(?::?\d{2})?)$/i;

// Fraction digits past the precision a column stores, which must all be zeros.
const ZERO_DIGITS_PATTERN: RegExp = /^0*$/;

const MILLISECONDS_PER_SECOND: number = 1000;

const DECIMAL_BASE: number = 10;

// Drivers that pass the temporal primary key matrix end to end.
const SUPPORTED_DRIVER_TYPES: ReadonlySet<string> = new Set<string>(["cockroachdb", "mariadb", "postgres"]);

/**
 * Parses the date and time primary key values of a create body once, so the row the create writes and the key that identifies it hold the same value.
 * A value the column cannot store exactly is refused before the insert, because the stored key would no longer match it.
 */
export class ApiControllerGeneratedCreateTemporalKeyContract {
	/**
	 * Fails when the entity has a date and time primary column and its driver is not one the create identity supports.
	 * @template E The entity type
	 * @param {Repository<E> | undefined} repository - Repository of the created entity; nothing is checked without one.
	 * @throws {Error} When a date and time primary key meets an unsupported driver.
	 */
	public static assertDriver<E extends IApiBaseEntity>(repository: Repository<E> | undefined): void {
		const column: TTypeOrmColumnMetadata | undefined = repository?.metadata.primaryColumns.find((primaryColumn: TTypeOrmColumnMetadata): boolean => ApiControllerGeneratedTemporalParameterContract.isDateTime(repository.manager.dataSource.driver.normalizeType(primaryColumn)));

		if (repository && column && !SUPPORTED_DRIVER_TYPES.has(repository.manager.dataSource.options.type)) {
			throw ErrorException(`Generated create of ${repository.metadata.name} cannot identify its date and time primary column ${column.propertyName} on the ${repository.manager.dataSource.options.type} driver; supported drivers are ${[...SUPPORTED_DRIVER_TYPES].join(", ")}`);
		}
	}

	/**
	 * Replaces each date and time primary key value of the body with its parsed value, bound by its column type.
	 * @template E The entity type
	 * @param {Repository<E> | undefined} repository - Repository of the created entity.
	 * @param {object | undefined} body - Create body, changed in place.
	 * @throws {BadRequestException} When a value is not a date and time, an instant has no zone, or a value is more precise than its column.
	 */
	public static parse<E extends IApiBaseEntity>(repository: Repository<E> | undefined, body: object | undefined): void {
		if (!repository) {
			throw ErrorException("Repository is not available in this context");
		}

		if (!body) {
			return;
		}

		const driver: Driver = repository.manager.dataSource.driver;
		const values: Record<string, unknown> = body as Record<string, unknown>;
		const messages: Array<string> = [];

		for (const column of repository.metadata.primaryColumns) {
			const columnType: string = driver.normalizeType(column);
			const value: unknown = values[column.propertyName];

			if (!ApiControllerGeneratedTemporalParameterContract.isDateTime(columnType) || value === undefined || value === null) {
				continue;
			}

			const text: string | undefined = this.readText(value);
			// A body DTO has already parsed its value, and that Date stays the one the row and the key hold.
			const date: Date | undefined = value instanceof Date ? value : this.parseText(text);
			const message: string | undefined = this.check(column.propertyName, date, text, ApiControllerGeneratedTemporalParameterContract.isInstant(columnType), Math.min(this.getPrecision(driver, column, columnType), DATE_FRACTION_DIGITS));

			if (message) {
				messages.push(message);
			} else if (date) {
				// The write binds like the key: node-postgres would move a Date in an instant column by its truncated local offset.
				values[column.propertyName] = ApiControllerGeneratedTemporalParameterContract.bind(date, columnType);
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
		if (isInstant && text !== undefined && !ZONE_PATTERN.test(text)) {
			return `${property} must carry a time zone designator or an offset`;
		}

		const isStorable: boolean = text === undefined ? (date.getTime() % MILLISECONDS_PER_SECOND) % DECIMAL_BASE ** (DATE_FRACTION_DIGITS - fractionDigits) === 0 : ZERO_DIGITS_PATTERN.test(FRACTION_PATTERN.exec(text)?.[1]?.slice(fractionDigits) ?? "");

		return isStorable ? undefined : `${property} must not hold more than ${fractionDigits} fractional second digits`;
	}

	private static getPrecision(driver: Driver, column: TTypeOrmColumnMetadata, columnType: string): number {
		// A column without a declared or default precision stores what the driver writes from a Date.
		return column.precision ?? driver.dataTypeDefaults?.[columnType]?.precision ?? DATE_FRACTION_DIGITS;
	}

	private static parseText(text: string | undefined): Date | undefined {
		return text === undefined ? undefined : new Date(text.replace(" ", "T"));
	}

	private static readText(value: unknown): string | undefined {
		if (typeof value === "string") {
			return value;
		}

		return value instanceof Date ? ApiControllerGeneratedTemporalBodySource.read(value) : undefined;
	}
}
