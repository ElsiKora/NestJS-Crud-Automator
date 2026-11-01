import type { TTypeOrmMetadataArgumentsStorage } from "@type/utility/typeorm/metadata-arguments-storage.type";

/**
 * Arguments TypeORM stores for one discriminator value decorator.
 */
export type TTypeOrmDiscriminatorValueMetadataArguments = TTypeOrmMetadataArgumentsStorage["discriminatorValues"][number];
