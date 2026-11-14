import type { EntityMetadata, ObjectLiteral } from "typeorm";

/**
 * Tells whether a loaded row is soft-deleted, which shows that the read that loaded it included deleted rows.
 * Internal: a locking check after that read keeps the same visibility, and otherwise requires the row to still not be deleted.
 * @param {EntityMetadata} metadata - Metadata of the row's entity.
 * @param {ObjectLiteral} entity - Loaded row.
 * @returns {boolean} Whether the entity has a delete date column and the row holds a value in it.
 */
export function DatabaseTypeOrmIsSoftDeleted(metadata: EntityMetadata, entity: ObjectLiteral): boolean {
	const deleteDate: unknown = metadata.deleteDateColumn?.getEntityValue(entity);

	return deleteDate !== undefined && deleteDate !== null;
}
