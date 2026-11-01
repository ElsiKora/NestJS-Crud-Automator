import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerParametersColumnValue } from "@interface/class/api/controller";
import type { IApiEntity } from "@interface/entity";
import type { TApiAuthorizationScopeWhere } from "@type/class/api/authorization/scope-where.type";
import type { FindOptionsWhere } from "typeorm";

import { ApiControllerParametersParseColumnValue } from "@utility/api/controller/parameters/column";
import { In } from "typeorm";

/**
 * Converts the scalar column values of an authorization scope to the types of their columns, with the same parser that converts path values.
 * A scope value then merges with the typed identity and read-scope values of the route, so `{ id: "16" }` from a policy and `{ id: 16 }` from the path select the same row.
 * A value its column cannot hold becomes a match-nothing operator instead of reaching the database.
 * @template E - Entity type.
 * @param {TApiAuthorizationScopeWhere<E>} where - Scope WHERE from an authorization decision.
 * @param {IApiEntity<E>} entityMetadata - Entity metadata of the scoped entity.
 * @returns {Promise<TApiAuthorizationScopeWhere<E>>} A new WHERE with typed scalar values; operators, nested relations and undescribed keys are kept as they are.
 */
export async function AuthorizationScopeNormalizeWhere<E extends IApiBaseEntity>(where: TApiAuthorizationScopeWhere<E>, entityMetadata: IApiEntity<E>): Promise<TApiAuthorizationScopeWhere<E>> {
	if (!where) {
		return where;
	}

	if (Array.isArray(where)) {
		return await Promise.all(where.map(async (branch: FindOptionsWhere<E>): Promise<FindOptionsWhere<E>> => await normalizeWhereBranch(branch, entityMetadata)));
	}

	return await normalizeWhereBranch(where, entityMetadata);
}

/**
 * Checks whether a WHERE value is a plain scalar that the column parser can convert.
 * @param {unknown} value - WHERE value.
 * @returns {boolean} True for string, number, bigint and boolean values.
 */
function isScalarWhereValue(value: unknown): value is bigint | boolean | number | string {
	return typeof value === "string" || typeof value === "number" || typeof value === "bigint" || typeof value === "boolean";
}

/**
 * Converts the scalar column values of one WHERE branch.
 * @template E - Entity type.
 * @param {FindOptionsWhere<E>} branch - WHERE branch.
 * @param {IApiEntity<E>} entityMetadata - Entity metadata of the scoped entity.
 * @returns {Promise<FindOptionsWhere<E>>} New branch with typed scalar values.
 */
async function normalizeWhereBranch<E extends IApiBaseEntity>(branch: FindOptionsWhere<E>, entityMetadata: IApiEntity<E>): Promise<FindOptionsWhere<E>> {
	if (!branch || typeof branch !== "object" || Array.isArray(branch)) {
		return branch;
	}

	const normalized: Record<PropertyKey, unknown> = {};

	for (const key of Reflect.ownKeys(branch)) {
		const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(branch, key);

		if (!descriptor) {
			continue;
		}

		if (typeof key === "string" && "value" in descriptor && isScalarWhereValue(descriptor.value)) {
			const parsed: IApiControllerParametersColumnValue = await ApiControllerParametersParseColumnValue(entityMetadata, key, descriptor.value);

			if (parsed.isDescribed) {
				descriptor.value = parsed.isValid ? parsed.value : In([]);
			}
		}

		Object.defineProperty(normalized, key, descriptor);
	}

	return normalized as FindOptionsWhere<E>;
}
