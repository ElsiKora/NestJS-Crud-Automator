import type { IApiAuthorizationSubject } from "@interface/authorization/subject.interface";

/**
 * Resolves a subject from request.user with smart fallbacks.
 * @param {unknown} user - Request user payload.
 * @returns {IApiAuthorizationSubject} Normalized authorization subject.
 */
export function AuthorizationResolveDefaultSubject(user: unknown): IApiAuthorizationSubject {
	const baseSubject: IApiAuthorizationSubject = {
		attributes: {},
		id: "anonymous",
		permissions: [],
		roles: [],
	};

	if (!user || typeof user !== "object") {
		return baseSubject;
	}

	const record: Record<string, unknown> = user as Record<string, unknown>;
	const idFields: Array<string> = ["id", "uuid", "email"];

	for (const field of idFields) {
		const value: unknown = record[field];

		if (typeof value === "string" && value.length > 0) {
			baseSubject.id = value;

			break;
		}
	}

	baseSubject.roles = resolveStringArray(record, ["roles", "role"]);
	baseSubject.permissions = resolveStringArray(record, ["permissions", "permission"]);
	baseSubject.attributes = record;

	return baseSubject;
}

/**
 * Resolves the first string array found in the provided record for the given field candidates.
 * @param {Record<string, unknown>} record - Object containing candidate fields.
 * @param {Array<string>} fields - Candidate field names to inspect in order.
 * @returns {Array<string>} Normalized array of string values.
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
