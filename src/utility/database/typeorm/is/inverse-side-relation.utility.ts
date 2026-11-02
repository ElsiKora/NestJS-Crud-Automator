import type { Type } from "@nestjs/common";
import type { TTypeOrmMetadataArgumentsStorage, TTypeOrmRelationMetadataArguments } from "@type/utility/typeorm";

import { GetClassHierarchy } from "@utility/get/class-hierarchy.utility";
import { getMetadataArgsStorage } from "typeorm";

/**
 * Tells whether the foreign key of a relation lives in the related row: a `OneToMany`, or a `OneToOne` without a join column on this side.
 * Saving such a relation with an existing related row writes that row, so a create cannot bind one.
 * The relation is looked up on the entity and its parent classes, from the TypeORM decorator metadata.
 * @param {unknown} entity - Entity class that declares the relation, or a child class of it.
 * @param {string} propertyName - Relation property name.
 * @returns {boolean} Whether the relation is a `OneToMany` or the inverse side of a `OneToOne`.
 */
export function DatabaseTypeOrmIsInverseSideRelation(entity: unknown, propertyName: string): boolean {
	const hierarchy: Array<Type<unknown>> = GetClassHierarchy(entity);

	const relation: TTypeOrmRelationMetadataArguments | undefined = getMetadataArgsStorage()
		.filterRelations(hierarchy)
		.find((candidate: TTypeOrmRelationMetadataArguments): boolean => candidate.propertyName === propertyName);

	if (relation?.relationType === "one-to-many") {
		return true;
	}

	if (relation?.relationType !== "one-to-one") {
		return false;
	}

	return !getMetadataArgsStorage().joinColumns.some(({ propertyName: joinPropertyName, target }: TTypeOrmMetadataArgumentsStorage["joinColumns"][number]): boolean => joinPropertyName === propertyName && hierarchy.includes(target as Type<unknown>));
}
