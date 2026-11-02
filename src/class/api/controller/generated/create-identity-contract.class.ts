import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiEntityColumn } from "@interface/entity";
import type { TTypeOrmColumnMetadata } from "@type/utility/typeorm";
import type { FindOptionsWhere, Repository } from "typeorm";

import { ApiControllerGeneratedCreateTemporalKeyContract } from "@class/api/controller/generated/create-temporal-key-contract.class";
import { ApiControllerGeneratedSecuritySnapshot } from "@class/api/controller/generated/security-snapshot.class";
import { ApiFunctionBoundOperator } from "@class/api/function/bound-operator.class";
import { DatabaseTypeOrmBindInstant } from "@utility/database/typeorm/bind/instant.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { And, LessThan, MoreThanOrEqual } from "typeorm";

// Two rows are enough to tell the created row from an identity that also matches a sibling.
const IDENTITY_PROBE_SIZE: number = 2;

/**
 * Identifies the row a generated CREATE stored, so its reload never matches a sibling row or falls back to the scope alone.
 */
export class ApiControllerGeneratedCreateIdentityContract {
	/**
	 * Copies the primary column values a create result holds, before anything can change the result.
	 * @template E The entity type
	 * @param {object} result - Stored row or create function result.
	 * @param {Array<IApiEntityColumn<E>>} primaryColumns - Primary columns of the entity.
	 * @returns {Partial<Record<keyof E, unknown>>} Present primary column values.
	 */
	public static capture<E extends IApiBaseEntity>(result: object, primaryColumns: Array<IApiEntityColumn<E>>): Partial<Record<keyof E, unknown>> {
		const values: Partial<Record<keyof E, unknown>> = {};

		for (const column of primaryColumns) {
			const value: unknown = (result as Partial<Record<keyof E, unknown>>)[column.name];

			if (value !== undefined && value !== null) {
				values[column.name] = ApiControllerGeneratedSecuritySnapshot.detach(value);
			}
		}

		return values;
	}

	/**
	 * Builds reload criteria from captured primary column values and confirms that they match exactly one stored row, which is then the created one.
	 * A date and time column matches its whole millisecond, because the database may store a finer precision than the driver reads back.
	 * A transformed date and time column matches its stored value, because each end of that range would go through the transformer on its own.
	 * @template E The entity type
	 * @param {Repository<E> | undefined} repository - Repository bound to the active transaction, if any.
	 * @param {Partial<Record<keyof E, unknown>>} values - Values from {@link ApiControllerGeneratedCreateIdentityContract.capture}.
	 * @returns {Promise<FindOptionsWhere<E>>} Criteria for the created row.
	 */
	public static async identify<E extends IApiBaseEntity>(repository: Repository<E> | undefined, values: Partial<Record<keyof E, unknown>>): Promise<FindOptionsWhere<E>> {
		if (Object.keys(values).length === 0) {
			throw ErrorException("Generated create result must hold a primary key column");
		}

		if (!repository) {
			throw ErrorException("Repository is not available in this context");
		}

		const identity: Partial<Record<keyof E, unknown>> = {};

		for (const key of Object.keys(values) as Array<keyof E>) {
			const column: TTypeOrmColumnMetadata | undefined = repository.metadata.primaryColumns.find((primaryColumn: TTypeOrmColumnMetadata): boolean => primaryColumn.propertyName === key);
			identity[key] = column ? this.createCondition(column, values[key], repository.manager.dataSource.driver.normalizeType(column), repository.manager.dataSource.options.type) : values[key];
		}

		const rows: Array<E> = await repository.find({
			// eslint-disable-next-line @elsikora/typescript/naming-convention -- TypeORM owns this fixed FindManyOptions field.
			loadEagerRelations: false,
			take: IDENTITY_PROBE_SIZE,
			where: identity as FindOptionsWhere<E>,
		});

		if (rows.length !== 1) {
			throw ErrorException("Generated create result must identify exactly one stored row");
		}

		return identity as FindOptionsWhere<E>;
	}

	private static createCondition(column: TTypeOrmColumnMetadata, value: unknown, columnType: string, driverType: string): unknown {
		if (!ApiControllerGeneratedCreateTemporalKeyContract.isDateTime(columnType)) {
			return value;
		}

		// A bound operator keeps TypeORM from running the column transformer again, or over the operators of the range.
		if (column.transformer) {
			return new ApiFunctionBoundOperator<unknown>(DatabaseTypeOrmBindInstant(value, columnType, driverType, column.transformer), column.transformer);
		}

		// A create function may report its key as text, while the column stores a parsed date.
		const date: Date = value instanceof Date ? value : new Date(value as number | string);

		if (Number.isNaN(date.getTime())) {
			throw ErrorException(`Generated create result holds an invalid date in primary column ${column.propertyName}`);
		}

		const lower: unknown = DatabaseTypeOrmBindInstant(date, columnType, driverType);
		const upper: unknown = DatabaseTypeOrmBindInstant(new Date(date.getTime() + 1), columnType, driverType);
		const range: Array<ApiFunctionBoundOperator<unknown>> = [new ApiFunctionBoundOperator<unknown>(lower, undefined, MoreThanOrEqual(lower)), new ApiFunctionBoundOperator<unknown>(upper, undefined, LessThan(upper))];

		return new ApiFunctionBoundOperator<unknown>(range, undefined, And(...range));
	}
}
