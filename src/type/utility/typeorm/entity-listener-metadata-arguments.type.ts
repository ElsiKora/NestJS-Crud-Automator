import type { TTypeOrmMetadataArgumentsStorage } from "@type/utility/typeorm/metadata-arguments-storage.type";

/**
 * Arguments TypeORM stores for one entity listener decorator.
 */
export type TTypeOrmEntityListenerMetadataArguments = TTypeOrmMetadataArgumentsStorage["entityListeners"][number];
