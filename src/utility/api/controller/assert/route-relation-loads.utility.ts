import type { EApiRouteType } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerPropertiesRouteBaseRelationsRequestLoad } from "@interface/decorator/api/controller/properties/route/base/relations/request/load.interface";
import type { IApiControllerPropertiesRouteBaseRelationsResponseLoad } from "@interface/decorator/api/controller/properties/route/base/relations/response/load.interface";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";
import type { RelationMetadata, Repository } from "typeorm";

import { ApiFunctionKeyPageLoader } from "@class/api/function/key-page-loader.class";

/**
 * Validates the relation loads of a generated route against the initialized data source.
 * The response load reads the route entity; each request relation load reads its related entity through that entity's service.
 * @param {Repository<E>} repository - Repository of the controller entity
 * @param {TApiControllerPropertiesRoute<E, EApiRouteType> | undefined} route - Route configuration, absent for an unlisted generated route
 * @param {string} source - Route named in the error
 * @template E - The entity type
 * @throws {Error} When a relation load of the route binds a PostgreSQL date or timestamp column
 */
export function ApiControllerAssertRouteRelationLoads<E extends IApiBaseEntity>(repository: Repository<E>, route: TApiControllerPropertiesRoute<E, EApiRouteType> | undefined, source: string): void {
	if (route?.generation?.isEnabled === false) {
		return;
	}

	const responseLoad: IApiControllerPropertiesRouteBaseRelationsResponseLoad<E> | undefined = route?.relations?.response?.load;

	ApiFunctionKeyPageLoader.assertRelationLoad(repository, { relationLoadStrategy: responseLoad?.relationLoadStrategy, relations: responseLoad?.include }, source);

	const requestLoad: IApiControllerPropertiesRouteBaseRelationsRequestLoad<E> | undefined = route?.relations?.request?.load;

	for (const [propertyName, include] of Object.entries(requestLoad?.include ?? {})) {
		const relation: RelationMetadata | undefined = repository.metadata.findRelationWithPropertyPath(propertyName);

		if (!include || !relation) {
			continue;
		}

		ApiFunctionKeyPageLoader.assertRelationLoad(
			repository.manager.getRepository(relation.inverseEntityMetadata.target),
			{
				// Request relation reads with a lock skip eager relations.
				// eslint-disable-next-line @elsikora/typescript/naming-convention -- TypeORM owns this fixed FindOptions field.
				loadEagerRelations: (requestLoad?.locks as Record<string, unknown> | undefined)?.[propertyName] ? false : undefined,
				relationLoadStrategy: requestLoad?.relationLoadStrategy,
				relations: include === true ? undefined : include,
			},
			`${source} request relation "${propertyName}"`,
		);
	}
}
