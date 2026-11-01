import type { getMetadataArgsStorage } from "typeorm";

/**
 * TypeORM decorator metadata storage, taken from the public `getMetadataArgsStorage` instead of a path inside the package.
 */
export type TTypeOrmMetadataArgumentsStorage = ReturnType<typeof getMetadataArgsStorage>;
