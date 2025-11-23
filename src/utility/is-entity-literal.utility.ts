import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

/**
 * Checks whether the candidate is an object literal representing metadata.
 * @param {unknown} candidate - Value to inspect.
 * @returns {boolean} True when candidate is a non-null object.
 */
export function IsEntityLiteral(candidate: unknown): candidate is IApiBaseEntity {
	return typeof candidate === "object" && candidate !== null;
}
