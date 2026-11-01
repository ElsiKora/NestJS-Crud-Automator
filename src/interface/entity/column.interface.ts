import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TTypeOrmRelationMetadataArguments } from "@type/utility/typeorm";
import type { ColumnType } from "typeorm";

export interface IApiEntityColumn<E> {
	isPrimary: boolean;
	metadata?: Record<string, unknown>;
	name: keyof E;
	relation?: {
		target: IApiBaseEntity;
	};
	/** Column type, or the TypeORM relation type of a relation property. */
	type: ColumnType | TTypeOrmRelationMetadataArguments["relationType"];
}
