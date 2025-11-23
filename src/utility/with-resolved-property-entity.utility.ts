import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { Type } from "@nestjs/common";
import type { TApiPropertyEntity } from "@type/decorator/api/property/base/properties.type";

import { DeferPropertyDecoratorExecution } from "./defer-property-decorator-execution.utility";
import { ErrorException } from "./error-exception.utility";
import { TryResolvePropertyEntity } from "./resolve-property-entity.utility";

/**
 * Executes the provided callback once the entity reference resolves.
 * If the entity cannot be resolved immediately, the callback runs in a microtask after modules finish loading.
 * @param {TApiPropertyEntity} entity - Entity reference or resolver.
 * @param {string} decoratorName - Decorator name for error context.
 * @param {(resolved: IApiBaseEntity | Type<IApiBaseEntity>) => void} onResolved - Callback executed with the resolved entity.
 */
export function WithResolvedPropertyEntity(entity: TApiPropertyEntity, decoratorName: string, onResolved: (resolved: IApiBaseEntity | Type<IApiBaseEntity>) => void): void {
	const resolved: IApiBaseEntity | Type<IApiBaseEntity> | undefined = TryResolvePropertyEntity(entity);

	if (resolved) {
		onResolved(resolved);

		return;
	}

	DeferPropertyDecoratorExecution(() => {
		const deferredResolved: IApiBaseEntity | Type<IApiBaseEntity> | undefined = TryResolvePropertyEntity(entity);

		if (!deferredResolved) {
			throw ErrorException(`Entity for ${decoratorName} could not be resolved. Provide the entity class or a factory that returns it.`);
		}

		onResolved(deferredResolved);
	});
}
