import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerReadPlan } from "@interface/class/api/controller/read";
import type { FindOptionsWhere } from "typeorm";

import { BadRequestException } from "@nestjs/common";

/**
 * Converts validated inherited path parameters into a direct entity where scope.
 * @template E - Entity type owned by the generated route.
 * @param {Partial<E> | undefined} parameters - Transformed route parameter object.
 * @param {IApiControllerReadPlan} readPlan - Validated route-local read plan.
 * @returns {FindOptionsWhere<E>} Direct entity scope derived from the route path.
 * @throws {BadRequestException} When a required inherited parameter is missing.
 */
export function ApiControllerReadScopeWhere<E extends IApiBaseEntity>(parameters: Partial<E> | undefined, readPlan: IApiControllerReadPlan): FindOptionsWhere<E> {
	const parameterRecord: Record<string, unknown> = parameters ?? {};
	const scope: Record<string, unknown> = {};

	for (const mapping of readPlan.parameters) {
		if (!Object.hasOwn(parameterRecord, mapping.parameter)) {
			throw new BadRequestException("INVALID_PARAMETERS");
		}

		const value: unknown = parameterRecord[mapping.parameter];

		if (value === undefined || value === null) {
			throw new BadRequestException("INVALID_PARAMETERS");
		}

		Object.defineProperty(scope, mapping.field, {
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			configurable: true,
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			enumerable: true,
			value,
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			writable: true,
		});
	}

	return scope as FindOptionsWhere<E>;
}
