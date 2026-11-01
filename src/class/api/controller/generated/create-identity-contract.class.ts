import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiEntityColumn } from "@interface/entity";
import type { FindOptionsWhere, Repository } from "typeorm";

import { ApiControllerGeneratedSecuritySnapshot } from "@class/api/controller/generated/security-snapshot.class";
import { ErrorException } from "@utility/error/exception.utility";
import { And, LessThan, MoreThanOrEqual } from "typeorm";

// Two rows are enough to tell the created row from an identity that also matches a sibling.
const IDENTITY_PROBE_SIZE: number = 2;

// node-postgres binds a Date with the local offset rounded to whole minutes, which can move it by seconds.
const UTC_STRING_DRIVER_TYPES: ReadonlySet<string> = new Set<string>(["cockroachdb", "postgres"]);

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
	 * A date matches its whole millisecond, because the database may store a finer precision than the driver reads back.
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

		const bindDate: (value: Date) => Date | string = UTC_STRING_DRIVER_TYPES.has(this.getDriverType(repository) ?? "") ? (value: Date): string => value.toISOString() : (value: Date): Date => new Date(value);
		const identity: Partial<Record<keyof E, unknown>> = {};

		for (const key of Object.keys(values) as Array<keyof E>) {
			const value: unknown = values[key];
			identity[key] = value instanceof Date ? And(MoreThanOrEqual(bindDate(value)), LessThan(bindDate(new Date(value.getTime() + 1)))) : value;
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

	private static getDriverType<E extends IApiBaseEntity>(repository: Repository<E>): string | undefined {
		const options: unknown = repository.manager.dataSource.options;
		const type: unknown = options && typeof options === "object" && "type" in options ? options.type : undefined;

		return typeof type === "string" ? type : undefined;
	}
}
