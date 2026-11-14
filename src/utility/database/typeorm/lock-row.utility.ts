import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TTypeOrmColumnMetadata } from "@type/utility/typeorm";
import type { FindOptionsSelect, FindOptionsWhere, Repository } from "typeorm";

import { DATABASE_DRIVER_TYPE_CONSTANT } from "@constant/database-driver-type.constant";
import { DatabaseTypeOrmAssertRequiredWhere } from "@utility/database/typeorm/assert/required-where.utility";

/**
 * Reads the key of the row a write is about to change through a WHERE that may join, and locks it until the transaction ends.
 * The lock is `FOR UPDATE`, `FOR UPDATE OF` the entity on drivers whose plain lock refuses an outer join, and none on drivers that run every transaction on one connection.
 * Internal: the caller runs inside the transaction of the write, so the row's own columns cannot change between this check and the write. Related rows the WHERE reads are checked here but not locked where the lock is `FOR UPDATE OF` the entity (PostgreSQL, CockroachDB).
 * @template E Entity type.
 * @param {Repository<E>} repository - Transaction-bound repository of the write.
 * @param {Array<FindOptionsWhere<E>> | FindOptionsWhere<E>} where - Whole WHERE the row must meet, relations included.
 * @param {boolean} isWithDeleted - Whether soft deleted rows count, as the read of the write saw them.
 * @returns {Promise<boolean>} Whether a row meets the WHERE.
 */
export async function DatabaseTypeOrmLockRow<E extends IApiBaseEntity>(repository: Repository<E>, where: Array<FindOptionsWhere<E>> | FindOptionsWhere<E>, isWithDeleted: boolean): Promise<boolean> {
	DatabaseTypeOrmAssertRequiredWhere(where);
	const driverType: string = repository.manager.dataSource.options.type;

	const lockedRows: Array<E> = await repository.find({
		// eslint-disable-next-line @elsikora/typescript/naming-convention -- TypeORM owns this fixed FindManyOptions field.
		cache: false,
		// eslint-disable-next-line @elsikora/typescript/naming-convention -- TypeORM owns this fixed FindManyOptions field.
		loadEagerRelations: false,
		lock: DATABASE_DRIVER_TYPE_CONSTANT.ROW_LOCK_UNSUPPORTED.has(driverType) ? undefined : { mode: "pessimistic_write", tables: DATABASE_DRIVER_TYPE_CONSTANT.ROW_LOCK_NAMES_TABLE.has(driverType) ? [repository.metadata.tableNameWithoutPrefix] : undefined },
		select: Object.fromEntries(repository.metadata.primaryColumns.map((column: TTypeOrmColumnMetadata): [string, boolean] => [column.propertyName, true])) as FindOptionsSelect<E>,
		where,
		withDeleted: isWithDeleted,
	});

	return lockedRows.length > 0;
}
