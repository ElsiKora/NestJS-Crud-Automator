import type { TApiEntityReference } from "@type/api-entity-reference.type";
import type { TApiPropertyEntity } from "@type/decorator/api/property/entity.type";

import { DeferPropertyDecoratorExecution } from "@utility/defer-property-decorator-execution.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { TryResolvePropertyEntity } from "@utility/resolve/property-entity.utility";

/**
 * Executes the provided callback once the entity reference resolves.
 * If the entity cannot be resolved immediately, the callback runs in a microtask after modules finish loading.
 * @param {TApiPropertyEntity} entity - Entity reference or resolver.
 * @param {string} decoratorName - Decorator name for error context.
 * @param {(resolved: TApiEntityReference) => void} onResolved - Callback executed with the resolved entity.
 */
export function WithResolvedPropertyEntity(entity: TApiPropertyEntity, decoratorName: string, onResolved: (resolved: TApiEntityReference) => void): void {
	const resolved: TApiEntityReference | undefined = TryResolvePropertyEntity(entity);

	if (resolved) {
		onResolved(resolved);

		return;
	}

	DeferPropertyDecoratorExecution(() => {
		const deferredResolved: TApiEntityReference | undefined = TryResolvePropertyEntity(entity);

		if (!deferredResolved) {
			throw ErrorException(`Entity for ${decoratorName} could not be resolved. Provide the entity class or a factory that returns it.`);
		}

		onResolved(deferredResolved);
	});
}
