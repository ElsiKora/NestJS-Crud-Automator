import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { Type } from "@nestjs/common";
import type { TApiPropertyEntity } from "@type/index";

import { ErrorException } from "@utility/error/exception.utility";
import { IsEntityConstructor } from "@utility/is/entity/constructor.utility";
import { IsEntityFactory } from "@utility/is/entity/factory.utility";
import { IsEntityLiteral } from "@utility/is/entity/literal.utility";

/**
 * Resolves property decorator entity references immediately or throws if unavailable.
 * @param {TApiPropertyEntity} entity - Entity reference or resolver.
 * @param {string} decoratorName - Decorator name for error context.
 * @returns {IApiBaseEntity | Type<IApiBaseEntity>} Normalized entity reference.
 */
export function ResolvePropertyEntity(entity: TApiPropertyEntity, decoratorName: string): IApiBaseEntity | Type<IApiBaseEntity> {
	// eslint-disable-next-line @elsikora/sonar/use-type-alias
	const resolved: IApiBaseEntity | Type<IApiBaseEntity> | undefined = TryResolvePropertyEntity(entity);

	if (!resolved) {
		throw ErrorException(`Entity for ${decoratorName} could not be resolved. Provide the entity class or a factory that returns it.`);
	}

	return resolved;
}

/**
 * Attempts to resolve the entity reference without throwing when the resolver returns undefined.
 * @param {TApiPropertyEntity} entity - Entity reference or factory.
 * @returns {IApiBaseEntity | Type<IApiBaseEntity> | undefined} Resolved entity or undefined when not ready.
 */
export function TryResolvePropertyEntity(entity: TApiPropertyEntity): IApiBaseEntity | Type<IApiBaseEntity> | undefined {
	if (IsEntityConstructor(entity)) {
		return entity;
	}

	if (IsEntityLiteral(entity)) {
		return entity;
	}

	if (IsEntityFactory(entity)) {
		const factory: () => IApiBaseEntity | Type<IApiBaseEntity> | undefined = entity;

		return factory();
	}

	return undefined;
}
