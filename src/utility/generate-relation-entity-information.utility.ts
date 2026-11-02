import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiEntity } from "@interface/entity";
import type { TMetadataStorageTarget } from "@type/class";

import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { ResolveRelationTarget } from "@utility/resolve/relation-target.utility";

/**
 * Generates entity information for the target of a relation, or nothing when the target is not an entity.
 * A target that names no entity class, or a class without an entity table, yields undefined.
 * A name that matches several entity classes fails, so the ambiguity surfaces instead of the relation being skipped.
 * @template E - The relation entity type
 * @param {IApiBaseEntity} target - Relation target: an entity class or a `{ name }` reference.
 * @returns {IApiEntity<E> | undefined} The relation entity information, or undefined when the target is not an entity.
 * @throws {Error} When a name matches several entity classes.
 */
export function GenerateRelationEntityInformation<E>(target: IApiBaseEntity): IApiEntity<E> | undefined {
	const metadataTarget: TMetadataStorageTarget | undefined = ResolveRelationTarget(target);

	return metadataTarget ? GenerateEntityInformation<E>(metadataTarget) : undefined;
}
