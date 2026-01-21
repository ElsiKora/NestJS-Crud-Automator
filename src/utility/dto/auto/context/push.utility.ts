import type { EApiDtoType, EApiRouteType } from "@enum/index";
import type { IDtoAutoContextMetadata } from "@type/auto-context-metadata.type";

import { DTO_AUTO_CONTEXT_METADATA_KEY } from "@constant/dto/auto-context.constant";
import { FlushAutoDtoContextExecutions } from "@utility/auto-dto-context-queue.utility";
import { GetRegisteredAutoDtoChildren } from "@utility/register-auto-dto-child.utility";

/**
 * Pushes DTO auto-context onto the provided DTO prototype so property decorators can read it later.
 * @param {object} target - DTO prototype to annotate.
 * @param {EApiRouteType} method - Route method currently being generated.
 * @param {EApiDtoType} dtoType - DTO type currently being generated.
 * @param {WeakSet<object>} [visited] - Set of visited prototypes to avoid infinite recursion.
 */
export function DtoAutoContextPush(target: object, method: EApiRouteType, dtoType: EApiDtoType, visited?: WeakSet<object>): void {
	if (!target) return;

	const stack: Array<IDtoAutoContextMetadata> = (Reflect.getMetadata?.(DTO_AUTO_CONTEXT_METADATA_KEY, target) as Array<IDtoAutoContextMetadata>) ?? [];
	stack.push({ dtoType, method });
	Reflect.defineMetadata?.(DTO_AUTO_CONTEXT_METADATA_KEY, stack, target);
	FlushAutoDtoContextExecutions(target);

	visited ??= new WeakSet<object>();

	if (visited.has(target)) return;
	visited.add(target);

	// eslint-disable-next-line @elsikora/typescript/no-unsafe-function-type
	const children: Set<Function> | undefined = GetRegisteredAutoDtoChildren(target);

	if (!children) return;

	for (const child of children) {
		DtoAutoContextPush(child.prototype as object, method, dtoType, visited);
	}
}
