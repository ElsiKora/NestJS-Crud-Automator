import type { TMetadataStorageTarget } from "@type/class";

import { IsEntityConstructor } from "@utility/is/entity/constructor.utility";

/**
 * Rejects an argument that is not a class, such as the class name callers passed before 5.0.0, so a lookup by class never answers as if nothing were registered.
 * @param {string} source - Class and method that received the argument, named in the error.
 * @param {unknown} target - Argument passed to the method.
 * @returns {void}
 * @throws {TypeError} When the argument is not a class.
 */
export function AssertEntityClass(source: string, target: unknown): asserts target is TMetadataStorageTarget {
	if (IsEntityConstructor(target)) return;

	const received: string = typeof target === "string" ? `the string "${target}"` : typeof target;

	throw new TypeError(`${source} expects the entity class, got ${received}. From 5.0.0, pass the class itself.`);
}
