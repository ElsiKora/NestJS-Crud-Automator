import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TTypeOrmRelationMetadataArguments } from "@type/utility/typeorm";
import type { ColumnType } from "typeorm";

export interface IApiEntityColumn<E> {
	isPrimary: boolean;
	/** False for a column TypeORM leaves out of every query unless asked (`select: false`); unset for a relation property. */
	isSelected?: boolean;
	metadata?: Record<string, unknown>;
	name: keyof E;
	/** Declared precision of a column, when its options name one. */
	precision?: null | number;
	relation?: {
		target: IApiBaseEntity;
	};
	/** Column type, or the TypeORM relation type of a relation property. */
	type: ColumnType | TTypeOrmRelationMetadataArguments["relationType"];
}
