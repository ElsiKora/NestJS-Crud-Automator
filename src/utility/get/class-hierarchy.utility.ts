import type { Type } from "@nestjs/common";

/**
 * Lists a class and its parent classes, nearest first, so TypeORM and Automator metadata declared on a parent is found too.
 * @param {unknown} target - Class to start from; any other value gives an empty list.
 * @returns {Array<Type<unknown>>} The class followed by each parent class.
 */
export function GetClassHierarchy(target: unknown): Array<Type<unknown>> {
	const hierarchy: Array<Type<unknown>> = [];
	let current: unknown = target;

	while (typeof current === "function" && current !== Function.prototype) {
		hierarchy.push(current as Type<unknown>);
		current = Object.getPrototypeOf(current);
	}

	return hierarchy;
}
