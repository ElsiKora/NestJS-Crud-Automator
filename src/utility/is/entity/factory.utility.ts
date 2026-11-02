import type { TApiEntityReference } from "@type/api-entity-reference.type";

import { IsEntityConstructor } from "@utility/is/entity/constructor.utility";

/**
 * Checks whether the candidate is a factory returning an entity reference.
 * @param {unknown} candidate - Value to inspect.
 * @returns {boolean} True when candidate is a lazy resolver function.
 */
export function IsEntityFactory(candidate: unknown): candidate is () => TApiEntityReference | undefined {
	return typeof candidate === "function" && !IsEntityConstructor(candidate);
}
