import type { TApiEntityReference } from "@type/api-entity-reference.type";
import type { TApiPropertyEntity } from "@type/index";

import { ErrorException } from "@utility/error/exception.utility";
import { IsEntityConstructor } from "@utility/is/entity/constructor.utility";
import { IsEntityFactory } from "@utility/is/entity/factory.utility";
import { IsEntityLiteral } from "@utility/is/entity/literal.utility";

/**
 * Resolves property decorator entity references immediately or throws if unavailable.
 * @param {TApiPropertyEntity} entity - Entity reference or resolver.
 * @param {string} decoratorName - Decorator name for error context.
 * @returns {TApiEntityReference} Normalized entity reference.
 */
export function ResolvePropertyEntity(entity: TApiPropertyEntity, decoratorName: string): TApiEntityReference {
	const resolved: TApiEntityReference | undefined = TryResolvePropertyEntity(entity);

	if (!resolved) {
		throw ErrorException(`Entity for ${decoratorName} could not be resolved. Provide the entity class or a factory that returns it.`);
	}

	return resolved;
}

/**
 * Attempts to resolve the entity reference without throwing when the resolver returns undefined.
 * @param {TApiPropertyEntity} entity - Entity reference or factory.
 * @returns {TApiEntityReference | undefined} Resolved entity or undefined when not ready.
 */
export function TryResolvePropertyEntity(entity: TApiPropertyEntity): TApiEntityReference | undefined {
	if (IsEntityConstructor(entity)) {
		return entity;
	}

	if (IsEntityLiteral(entity)) {
		return entity;
	}

	if (IsEntityFactory(entity)) {
		const factory: () => TApiEntityReference | undefined = entity;

		return factory();
	}

	return undefined;
}
