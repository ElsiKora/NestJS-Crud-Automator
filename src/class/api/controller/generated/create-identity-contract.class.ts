import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TTypeOrmColumnMetadata } from "@type/utility/typeorm";
import type { FindOptionsWhere, Repository } from "typeorm";

import { ApiControllerGeneratedCreateTemporalKeyContract } from "@class/api/controller/generated/create-temporal-key-contract.class";
import { ApiFunctionBoundOperator } from "@class/api/function/bound-operator.class";
import { DatabaseTypeOrmBindInstant } from "@utility/database/typeorm/bind/instant.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { And, LessThan, MoreThanOrEqual } from "typeorm";

/**
 * Identifies the row a generated CREATE stored, so its reload never matches a sibling row or falls back to the scope alone.
 */
export class ApiControllerGeneratedCreateIdentityContract {
	/**
	 * Confirms that reload criteria match exactly one stored row.
	 * The database counts the rows, because rows whose date and time keys differ only below a millisecond read back as one entity.
	 * Rows that commit beside the created one only add to the count, so one row after a reload means the reload read the created row.
	 * @template E The entity type
	 * @param {Repository<E> | undefined} repository - Repository bound to the active transaction, if any.
	 * @param {FindOptionsWhere<E>} where - Criteria from {@link ApiControllerGeneratedCreateIdentityContract.identify}.
	 * @returns {Promise<void>} Resolves when exactly one stored row matches.
	 */
	public static async confirm<E extends IApiBaseEntity>(repository: Repository<E> | undefined, where: FindOptionsWhere<E>): Promise<void> {
		if (!repository) {
			throw ErrorException("Repository is not available in this context");
		}

		// eslint-disable-next-line @elsikora/typescript/naming-convention -- TypeORM owns this fixed FindManyOptions field.
		const count: number = await repository.count({ loadEagerRelations: false, where });

		if (count !== 1) {
			throw ErrorException("Generated create result must identify exactly one stored row");
		}
	}

	/**
	 * Builds reload criteria from the reported primary key values and confirms that they match exactly one stored row, which is then the created one.
	 * A generated CREATE confirms the criteria again after its reload, because a row another request commits meanwhile may match them too.
	 * A date and time column matches its whole millisecond, because the database may store a finer precision than the driver reads back.
	 * A transformed date and time column matches its stored value, because each end of that range would go through the transformer on its own.
	 * @template E The entity type
	 * @param {Repository<E> | undefined} repository - Repository bound to the active transaction, if any.
	 * @param {Partial<Record<keyof E, unknown>>} values - Primary key values the create function reported for the row it inserted.
	 * @returns {Promise<FindOptionsWhere<E>>} Criteria for the created row.
	 */
	public static async identify<E extends IApiBaseEntity>(repository: Repository<E> | undefined, values: Partial<Record<keyof E, unknown>>): Promise<FindOptionsWhere<E>> {
		if (Object.keys(values).length === 0) {
			throw ErrorException("Generated create result must hold a primary key column");
		}

		if (!repository) {
			throw ErrorException("Repository is not available in this context");
		}

		const identity: Record<string, unknown> = {};

		for (const [key, value] of Object.entries(values)) {
			const column: TTypeOrmColumnMetadata | undefined = repository.metadata.primaryColumns.find((primaryColumn: TTypeOrmColumnMetadata): boolean => primaryColumn.propertyName === key);
			identity[key] = column ? this.createCondition(column, value, repository.manager.dataSource.driver.normalizeType(column), repository.manager.dataSource.options.type) : value;
		}

		const where: FindOptionsWhere<E> = identity as FindOptionsWhere<E>;
		await this.confirm(repository, where);

		return where;
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
		const date: Date | undefined = this.readDate(value);

		if (!date || Number.isNaN(date.getTime())) {
			throw ErrorException(`Generated create result holds an invalid date in primary column ${column.propertyName}`);
		}

		const lower: unknown = DatabaseTypeOrmBindInstant(date, columnType, driverType);
		const upper: unknown = DatabaseTypeOrmBindInstant(new Date(date.getTime() + 1), columnType, driverType);
		const range: Array<ApiFunctionBoundOperator<unknown>> = [new ApiFunctionBoundOperator<unknown>(lower, undefined, MoreThanOrEqual(lower)), new ApiFunctionBoundOperator<unknown>(upper, undefined, LessThan(upper))];

		return new ApiFunctionBoundOperator<unknown>(range, undefined, And(...range));
	}

	private static readDate(value: unknown): Date | undefined {
		if (value instanceof Date) {
			return value;
		}

		return typeof value === "number" || typeof value === "string" ? new Date(value) : undefined;
	}
}
