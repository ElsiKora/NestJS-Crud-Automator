import type { IDtoAutoContextMetadata } from "@type/auto-context-metadata.type";

import { DTO_AUTO_CONTEXT_METADATA_KEY } from "@constant/dto/auto-context.constant";
import { GetRegisteredAutoDtoChildren } from "@utility/register-auto-dto-child.utility";

/**
 * Pops DTO auto-context from the provided DTO prototype.
 * @param {object} target - DTO prototype to update.
 * @param {WeakSet<object>} [visited] - Set of visited prototypes to avoid infinite recursion.
 */
export function DtoAutoContextPop(target: object, visited?: WeakSet<object>): void {
	if (!target) return;

	const stack: Array<IDtoAutoContextMetadata> | undefined = Reflect.getMetadata?.(DTO_AUTO_CONTEXT_METADATA_KEY, target) as Array<IDtoAutoContextMetadata> | undefined;

	if (stack && stack.length > 0) {
		stack.pop();

		if (stack.length === 0) {
			Reflect.deleteMetadata?.(DTO_AUTO_CONTEXT_METADATA_KEY, target);
		} else {
			Reflect.defineMetadata?.(DTO_AUTO_CONTEXT_METADATA_KEY, stack, target);
		}
	}

	visited ??= new WeakSet<object>();

	if (visited.has(target)) return;
	visited.add(target);

	// eslint-disable-next-line @elsikora/typescript/no-unsafe-function-type
	const children: Set<Function> | undefined = GetRegisteredAutoDtoChildren(target);

	if (!children) return;

	for (const child of children) {
		DtoAutoContextPop(child.prototype as object, visited);
	}
}
