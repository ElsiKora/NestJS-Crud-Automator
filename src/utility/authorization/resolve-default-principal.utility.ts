import type { IApiAuthorizationPrincipal } from "@interface/class/api/authorization";

import { EApiAuthorizationPrincipalType } from "@enum/class/authorization";

/**
 * Resolves a principal from request.user with smart fallbacks.
 * @param {unknown} user - Request user payload.
 * @returns {IApiAuthorizationPrincipal} Normalized authorization principal.
 */
export function AuthorizationResolveDefaultPrincipal(user: unknown): IApiAuthorizationPrincipal {
	const basePrincipal: IApiAuthorizationPrincipal = {
		attributes: {},
		groups: [],
		id: "anonymous",
		roles: [],
		type: EApiAuthorizationPrincipalType.USER,
	};

	if (!user || typeof user !== "object") {
		return basePrincipal;
	}

	const record: Record<string, unknown> = user as Record<string, unknown>;
	const idFields: Array<string> = ["id", "uuid", "email"];

	for (const field of idFields) {
		const value: unknown = record[field];

		if (typeof value === "string" && value.length > 0) {
			basePrincipal.id = value;

			break;
		}
	}

	basePrincipal.roles = resolveStringArray(record, ["roles", "role"]);
	basePrincipal.groups = resolveStringArray(record, ["groups", "group"]);
	basePrincipal.claims = resolveRecord(record.claims);
	basePrincipal.attributes = record;

	return basePrincipal;
}

/**
 * Returns a plain object record when the value is a non-array object.
 * @param {unknown} value - Candidate claims object.
 * @returns {Record<string, unknown> | undefined} Normalized record value.
 */
function resolveRecord(value: unknown): Record<string, unknown> | undefined {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return undefined;
	}

	return value as Record<string, unknown>;
}

/**
 * Resolves a string array from either a scalar or array field.
 * @param {Record<string, unknown>} record - Source record containing potential string values.
 * @param {Array<string>} fields - Candidate field names checked in order.
 * @returns {Array<string>} Normalized string array.
 */
function resolveStringArray(record: Record<string, unknown>, fields: Array<string>): Array<string> {
	for (const field of fields) {
		const value: unknown = record[field];

		if (typeof value === "string") {
			return [value];
		}

		if (Array.isArray(value)) {
			return value.filter((item: unknown): item is string => typeof item === "string");
		}
	}

	return [];
}
