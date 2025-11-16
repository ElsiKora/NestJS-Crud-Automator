import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiAuthorizationScopeWhere } from "@type/authorization/scope-where.type";
import type { FindOptionsWhere } from "typeorm";

/**
 * Merges two WHERE expressions by building a Cartesian product of OR branches.
 * @template E - Entity type
 * @param {TApiAuthorizationScopeWhere<E>} baseWhere - Existing filter.
 * @param {TApiAuthorizationScopeWhere<E>} scopedWhere - Additional scope filter.
 * @returns {TApiAuthorizationScopeWhere<E>} Combined filter.
 */
export function AuthorizationScopeMergeWhere<E extends IApiBaseEntity>(baseWhere: TApiAuthorizationScopeWhere<E>, scopedWhere: TApiAuthorizationScopeWhere<E>): TApiAuthorizationScopeWhere<E> {
	if (!baseWhere) {
		return scopedWhere;
	}

	if (!scopedWhere) {
		return baseWhere;
	}

	const baseVariants: Array<FindOptionsWhere<E>> = Array.isArray(baseWhere) ? baseWhere : [baseWhere];
	const scopedVariants: Array<FindOptionsWhere<E>> = Array.isArray(scopedWhere) ? scopedWhere : [scopedWhere];
	const mergedVariants: Array<FindOptionsWhere<E>> = [];

	for (const baseVariant of baseVariants) {
		for (const scopedVariant of scopedVariants) {
			mergedVariants.push({
				...baseVariant,
				...scopedVariant,
			});
		}
	}

	return mergedVariants.length === 1 ? mergedVariants[0] : mergedVariants;
}
