import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TMetadataStorageTarget } from "@type/class";
import type { TTypeOrmTableMetadataArguments } from "@type/utility/typeorm";

import { IsEntityConstructor } from "@utility/is/entity/constructor.utility";
import { ResolveMetadataTarget } from "@utility/resolve/metadata-target.utility";
import { getMetadataArgsStorage } from "typeorm";

/**
 * Resolves the target of a relation to its entity class, or to nothing when the target is not an entity.
 * A target that names no entity class, or a class without an entity table, yields undefined.
 * A name that matches several entity classes fails, so the ambiguity surfaces instead of the relation being skipped.
 * @param {IApiBaseEntity} target - Relation target: an entity class or a `{ name }` reference.
 * @returns {TMetadataStorageTarget | undefined} The entity class, or undefined when the target is not an entity.
 * @throws {Error} When a name matches several entity classes.
 */
export function ResolveRelationTarget(target: IApiBaseEntity): TMetadataStorageTarget | undefined {
	const tables: Array<TTypeOrmTableMetadataArguments> = getMetadataArgsStorage().tables;

	if (!IsEntityConstructor(target) && !tables.some((table: TTypeOrmTableMetadataArguments): boolean => IsEntityConstructor(table.target) && table.target.name === Reflect.get(target, "name"))) {
		return undefined;
	}

	const metadataTarget: TMetadataStorageTarget = ResolveMetadataTarget(target);

	return tables.some((table: TTypeOrmTableMetadataArguments): boolean => table.target === metadataTarget) ? metadataTarget : undefined;
}
