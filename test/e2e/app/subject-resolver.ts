import type { IApiAuthenticationRequest, IApiAuthorizationSubject, IApiAuthorizationSubjectResolver } from "../../../dist/esm/index";

import { AuthorizationResolveDefaultSubject } from "../../../dist/esm/index";

export const e2eAuthorizationSubjectResolver: IApiAuthorizationSubjectResolver = {
	resolve(user: unknown, _authenticationRequest?: IApiAuthenticationRequest): IApiAuthorizationSubject {
		if (!user || typeof user !== "object") {
			return AuthorizationResolveDefaultSubject(user);
		}

		const record: Record<string, unknown> = user as Record<string, unknown>;
		const actor: unknown = record.actor;
		const access: unknown = record.access;
		const flags: unknown = record.flags;

		if (!actor || typeof actor !== "object" || !access || typeof access !== "object") {
			return AuthorizationResolveDefaultSubject(user);
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
			id: typeof actorRecord.id === "string" && actorRecord.id.length > 0 ? actorRecord.id : "anonymous",
			permissions: Array.isArray(accessRecord.permissions) ? accessRecord.permissions.filter((permission: unknown): permission is string => typeof permission === "string") : [],
			roles: Array.isArray(accessRecord.roles) ? accessRecord.roles.filter((role: unknown): role is string => typeof role === "string") : [],
		};
	},
};
