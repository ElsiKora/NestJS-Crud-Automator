import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { CanActivate, Type } from "@nestjs/common";

import { ApiControllerGetListTransformGetRelationTarget } from "@utility/api/controller/get-list/transform/get-relation-target.utility";
import { ResolveRelationTarget } from "@utility/resolve/relation-target.utility";

/**
 * Resolves at controller startup every relation target that a GET_LIST route can filter by.
 * A route reaches to-one relations only, with or without a typed filter.
 * @template E - The entity type
 * @param {IApiEntity<E>} entityMetadata - The entity metadata containing column information
 * @param {Type<CanActivate>} [currentGuard] - Optional guard used to mirror generated query DTO visibility.
 * @throws {Error} When a relation target name matches several entity classes.
 */
export function ApiControllerGetListTransformAssertRelationTargets<E>(entityMetadata: IApiEntity<E>, currentGuard?: Type<CanActivate>): void {
	for (const relationName of new Set<string>(entityMetadata.columns.map((column: IApiEntityColumn<E>): string => String(column.name)))) {
		const target: IApiBaseEntity | undefined = ApiControllerGetListTransformGetRelationTarget(entityMetadata, relationName, currentGuard);

		if (target) {
			ResolveRelationTarget(target);
		}
	}
}
