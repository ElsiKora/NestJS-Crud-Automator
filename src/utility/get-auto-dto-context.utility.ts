import type { IDtoAutoContextMetadata } from "@type/auto-context-metadata.type";

import { DTO_AUTO_CONTEXT_METADATA_KEY } from "@constant/dto/auto-context.constant";

/**
 * Retrieves stored DTO auto-context (route method + dto type) for a generated DTO prototype.
 * @param {object} target - DTO prototype that may contain context metadata.
 * @returns {IDtoAutoContextMetadata | undefined} Stored context metadata if available.
 */
export function GetAutoDtoContext(target: object): IDtoAutoContextMetadata | undefined {
	const stack: Array<IDtoAutoContextMetadata> | undefined = Reflect.getMetadata?.(DTO_AUTO_CONTEXT_METADATA_KEY, target) as Array<IDtoAutoContextMetadata> | undefined;

	if (!stack || stack.length === 0) {
		return undefined;
	}

	return stack.at(-1);
}
