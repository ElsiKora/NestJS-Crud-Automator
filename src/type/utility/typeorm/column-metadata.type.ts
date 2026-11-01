import type { EntityMetadata } from "typeorm";

/**
 * Column metadata of a built TypeORM entity, taken from the public `EntityMetadata` instead of a path inside the package.
 */
export type TTypeOrmColumnMetadata = EntityMetadata["columns"][number];
