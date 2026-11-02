import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { Type } from "@nestjs/common";

/**
 * Checks whether the candidate is a class constructor reference, abstract classes included.
 * An arrow function such as an entity factory, a TypeORM string target and `Function.prototype` at the end of a class's prototype chain are not.
 * @param {unknown} candidate - Value to inspect.
 * @returns {boolean} True when candidate is a constructor function.
 */
export function IsEntityConstructor(candidate: unknown): candidate is Type<IApiBaseEntity> {
	return typeof candidate === "function" && Object.prototype.hasOwnProperty.call(candidate, "prototype");
}
