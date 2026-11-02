import type { Type } from "@nestjs/common";

import { IsEntityConstructor } from "@utility/is/entity/constructor.utility";

/**
 * Lists a class and its parent classes, nearest first, so TypeORM and Automator metadata declared on a parent is found too.
 * It follows TypeORM's `MetadataUtils.getInheritanceTree`: the walk stops at the first parent class without a name,
 * because TypeORM does not map declarations above such a class.
 * @param {unknown} target - Class to start from; any other value gives an empty list.
 * @returns {Array<Type<unknown>>} The class followed by each named parent class.
 */
export function GetClassHierarchy(target: unknown): Array<Type<unknown>> {
	if (!IsEntityConstructor(target)) {
		return [];
	}

	const hierarchy: Array<Type<unknown>> = [target];
	let current: unknown = Object.getPrototypeOf(target);

	while (IsEntityConstructor(current) && current.name) {
		hierarchy.push(current);
		current = Object.getPrototypeOf(current);
	}

	return hierarchy;
}
