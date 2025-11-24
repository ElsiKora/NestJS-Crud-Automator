import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { Type } from "@nestjs/common";

import { IsEntityConstructor } from "./is-entity-constructor.utility";

/**
 * Checks whether the candidate is a factory returning an entity reference.
 * @param {unknown} candidate - Value to inspect.
 * @returns {boolean} True when candidate is a lazy resolver function.
 */
export function IsEntityFactory(candidate: unknown): candidate is () => IApiBaseEntity | Type<IApiBaseEntity> | undefined {
	return typeof candidate === "function" && !IsEntityConstructor(candidate);
}
