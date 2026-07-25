import type { Type } from "@nestjs/common";

import { GetRegisteredAutoDtoChildrenRecursive } from "@utility/register-auto-dto-child.utility";

/**
 * Adds a DTO and all registered nested manual DTO children to an accumulator.
 * @param {Array<Type<unknown>>} target - DTO accumulator.
 * @param {Array<Type<unknown>> | Type<unknown>} dto - DTO or DTO list to add.
 * @returns {void}
 */
export function ApiRouteCollectDtoWithRegisteredChildren(target: Array<Type<unknown>>, dto: Array<Type<unknown>> | Type<unknown>): void {
	if (Array.isArray(dto)) {
		for (const item of dto) {
			ApiRouteCollectDtoWithRegisteredChildren(target, item);
		}

		return;
	}

	if (!target.includes(dto)) {
		target.push(dto);
	}

	for (const child of GetRegisteredAutoDtoChildrenRecursive(dto.prototype as object)) {
		if (!target.includes(child)) {
			target.push(child);
		}
	}
}
