import type { TTypeOrmMetadataArgumentsStorage } from "@type/utility/typeorm/metadata-arguments-storage.type";

/**
 * Arguments TypeORM stores for one embedded property.
 */
export type TTypeOrmEmbeddedMetadataArguments = TTypeOrmMetadataArgumentsStorage["embeddeds"][number];
