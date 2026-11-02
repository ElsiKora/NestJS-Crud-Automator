import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerGetListQueryPlan } from "@interface/class/api/controller/get-list/query";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { CanActivate, Type } from "@nestjs/common";

import { ApiControllerGetListTransformGetRelationTarget } from "@utility/api/controller/get-list/transform/get-relation-target.utility";
import { ResolveRelationTarget } from "@utility/resolve/relation-target.utility";

/**
 * Resolves at controller startup every relation target that a GET_LIST route can filter by.
 * The request filter of a route without a typed filter reaches any relation; a typed filter reaches to-one relations only.
 * @template E - The entity type
 * @param {IApiEntity<E>} entityMetadata - The entity metadata containing column information
 * @param {Type<CanActivate>} [currentGuard] - Optional guard used to mirror generated query DTO visibility.
 * @param {IApiControllerGetListQueryPlan} [queryPlan] - Compiled query plan of the route, if it has one.
 * @throws {Error} When a relation target name matches several entity classes.
 */
export function ApiControllerGetListTransformAssertRelationTargets<E>(entityMetadata: IApiEntity<E>, currentGuard?: Type<CanActivate>, queryPlan?: IApiControllerGetListQueryPlan): void {
	const isToOneOnly: boolean = queryPlan !== undefined && !queryPlan.filter.isLegacy;

	for (const relationName of new Set<string>(entityMetadata.columns.map((column: IApiEntityColumn<E>): string => String(column.name)))) {
		const target: IApiBaseEntity | undefined = ApiControllerGetListTransformGetRelationTarget(entityMetadata, relationName, currentGuard, isToOneOnly);

		if (target) {
			ResolveRelationTarget(target);
		}
	}
}
