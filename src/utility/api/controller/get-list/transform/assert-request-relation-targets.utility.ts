import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiEntity } from "@interface/entity";
import type { CanActivate, Type } from "@nestjs/common";

import { ApiControllerGetListTransformGetRelationTarget } from "@utility/api/controller/get-list/transform/get-relation-target.utility";
import { ResolveRelationTarget } from "@utility/resolve/relation-target.utility";
import { getMetadataArgsStorage } from "typeorm";

const CHECKED_TABLE_COUNT_BY_TARGET: WeakMap<IApiBaseEntity, number> = new WeakMap<IApiBaseEntity, number>();

/**
 * Fails a request of a typed filter route that filters through a relation whose target became ambiguous after the controller was instantiated, such as by a lazily loaded module.
 * The plan was compiled against the class known back then, so without this check the request would filter by the wrong class.
 * A target is resolved again only after the TypeORM table registry grew, so an unchanged registry costs no walk.
 * @template E - The entity type
 * @param {Record<string, unknown>} query - The query parameters from the HTTP request
 * @param {IApiEntity<E>} entityMetadata - The entity metadata containing column information
 * @param {Type<CanActivate>} [currentGuard] - Optional guard used to mirror generated query DTO visibility.
 * @throws {Error} When the target of a requested relation matches several entity classes.
 */
export function ApiControllerGetListTransformAssertRequestRelationTargets<E>(query: Record<string, unknown>, entityMetadata: IApiEntity<E>, currentGuard?: Type<CanActivate>): void {
	const tableCount: number = getMetadataArgsStorage().tables.length;

	for (const key of Object.keys(query)) {
		const separatorIndex: number = key.indexOf(".");
		const target: IApiBaseEntity | undefined = separatorIndex === -1 ? undefined : ApiControllerGetListTransformGetRelationTarget(entityMetadata, key.slice(0, separatorIndex), currentGuard, true);

		if (target && CHECKED_TABLE_COUNT_BY_TARGET.get(target) !== tableCount) {
			ResolveRelationTarget(target);
			CHECKED_TABLE_COUNT_BY_TARGET.set(target, tableCount);
		}
	}
}
