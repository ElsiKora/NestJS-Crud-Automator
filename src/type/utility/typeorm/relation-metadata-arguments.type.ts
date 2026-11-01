import type { TTypeOrmMetadataArgumentsStorage } from "@type/utility/typeorm/metadata-arguments-storage.type";

/**
 * Arguments TypeORM stores for one relation decorator.
 */
export type TTypeOrmRelationMetadataArguments = TTypeOrmMetadataArgumentsStorage["relations"][number];
