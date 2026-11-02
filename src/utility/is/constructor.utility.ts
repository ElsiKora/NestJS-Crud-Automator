import type { Type } from "@nestjs/common";

/**
 * Narrows a TypeORM metadata target or a prototype-chain link to a class.
 * TypeORM types targets as `Function | string`, and an abstract class has no construct signature at runtime either way.
 * @param {unknown} target - Value to check.
 * @returns {boolean} Whether the value is a class.
 */
export function IsConstructor(target: unknown): target is Type<unknown> {
	return typeof target === "function";
}
