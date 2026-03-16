import type { EApiAuthorizationPrincipalType } from "@enum/class/authorization";

export interface IApiAuthorizationPrincipal {
	attributes: Record<string, unknown>;
	claims?: Record<string, unknown>;
	groups?: ReadonlyArray<string>;
	id: string;
	roles: ReadonlyArray<string>;
	type: EApiAuthorizationPrincipalType;
}
