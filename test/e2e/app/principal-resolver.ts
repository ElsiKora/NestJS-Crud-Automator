import type { IApiAuthenticationRequest, IApiAuthorizationPrincipal, IApiAuthorizationPrincipalResolver } from "../../../dist/esm/index";

import { AuthorizationResolveDefaultPrincipal, EApiAuthorizationPrincipalType } from "../../../dist/esm/index";

export const e2eAuthorizationPrincipalResolver: IApiAuthorizationPrincipalResolver = {
	resolve(user: unknown, _authenticationRequest?: IApiAuthenticationRequest): IApiAuthorizationPrincipal {
		if (!user || typeof user !== "object") {
			return AuthorizationResolveDefaultPrincipal(user);
		}

		const record: Record<string, unknown> = user as Record<string, unknown>;
		const actor: unknown = record.actor;
		const access: unknown = record.access;
		const flags: unknown = record.flags;

		if (!actor || typeof actor !== "object" || !access || typeof access !== "object") {
			return {
				attributes: record,
				claims: {
					permissions: resolveStringArray(record, ["permissions", "permission"]),
				},
				id: resolveIdentity(record),
				roles: resolveStringArray(record, ["roles", "role"]),
				type: EApiAuthorizationPrincipalType.USER,
			};
		}

		const actorRecord: Record<string, unknown> = actor as Record<string, unknown>;
		const accessRecord: Record<string, unknown> = access as Record<string, unknown>;
		const flagsRecord: Record<string, unknown> | undefined = flags && typeof flags === "object" ? (flags as Record<string, unknown>) : undefined;

		return {
			attributes: {
				...actorRecord,
				...(flagsRecord ?? {}),
				authShape: "custom",
			},
			claims: {
				permissions: Array.isArray(accessRecord.permissions) ? accessRecord.permissions.filter((permission: unknown): permission is string => typeof permission === "string") : [],
			},
			id: typeof actorRecord.id === "string" && actorRecord.id.length > 0 ? actorRecord.id : "anonymous",
			roles: Array.isArray(accessRecord.roles) ? accessRecord.roles.filter((role: unknown): role is string => typeof role === "string") : [],
			type: EApiAuthorizationPrincipalType.USER,
		};
	},
};

function resolveIdentity(record: Record<string, unknown>): string {
	for (const field of ["id", "uuid", "email"]) {
		const value: unknown = record[field];

		if (typeof value === "string" && value.length > 0) {
			return value;
		}
	}

	return "anonymous";
}

function resolveStringArray(record: Record<string, unknown>, fields: Array<string>): Array<string> {
	for (const field of fields) {
		const value: unknown = record[field];

		if (typeof value === "string" && value.length > 0) {
			return [value];
		}

		if (Array.isArray(value)) {
			return value.filter((item: unknown): item is string => typeof item === "string");
		}
	}

	return [];
}
