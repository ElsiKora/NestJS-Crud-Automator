import type { Type } from "@nestjs/common";

import { IsConstructor } from "@utility/is/constructor.utility";

/**
 * Lists a class and its parent classes, nearest first, so TypeORM and Automator metadata declared on a parent is found too.
 * @param {unknown} target - Class to start from; any other value gives an empty list.
 * @returns {Array<Type<unknown>>} The class followed by each parent class.
 */
export function GetClassHierarchy(target: unknown): Array<Type<unknown>> {
	const hierarchy: Array<Type<unknown>> = [];
	let current: unknown = target;

	while (IsConstructor(current) && current !== Function.prototype) {
		hierarchy.push(current);
		current = Object.getPrototypeOf(current);
	}

	return hierarchy;
}
