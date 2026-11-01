import type { TTypeOrmMetadataArgumentsStorage } from "@type/utility/typeorm/metadata-arguments-storage.type";

/**
 * Arguments TypeORM stores for one table inheritance decorator.
 */
export type TTypeOrmInheritanceMetadataArguments = TTypeOrmMetadataArgumentsStorage["inheritances"][number];
