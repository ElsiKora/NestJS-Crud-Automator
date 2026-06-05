import type { IApiAuthorizationPrincipal, IApiHookPermissionSource } from "@interface/class/api/authorization";

import { AUTHORIZATION_HOOK_PERMISSION_SOURCES_TOKEN } from "@constant/class/authorization";
import { Inject, Injectable, Optional } from "@nestjs/common";
import { LoggerUtility } from "@utility/logger.utility";

import { ApiAuthorizationHookPermissionCache } from "./cache.class";

const hookPermissionResolverLogger: LoggerUtility = LoggerUtility.getLogger("ApiAuthorizationHookPermissionResolver");

@Injectable()
export class ApiAuthorizationHookPermissionResolver {
	public constructor(
		private readonly cache: ApiAuthorizationHookPermissionCache,
		@Inject(AUTHORIZATION_HOOK_PERMISSION_SOURCES_TOKEN)
		@Optional()
		private readonly sources: ReadonlyArray<IApiHookPermissionSource> = [],
	) {}

	public clear(): void {
		this.cache.clear();
	}

	public async resolve(principal: IApiAuthorizationPrincipal): Promise<ReadonlyArray<string>> {
		const cachedPermissions: ReadonlyArray<string> | undefined = this.cache.get(principal);

		if (cachedPermissions) {
			hookPermissionResolverLogger.verbose(`Using cached hook permissions for principal "${principal.id}" (${cachedPermissions.length} permissions).`);

			return cachedPermissions;
		}

		const permissions: Set<string> = new Set<string>();

		for (const source of this.sources) {
			const resolvedPermissions: ReadonlyArray<string> = await source.getPermissions(principal);

			for (const permission of resolvedPermissions) {
				if (typeof permission === "string" && permission.length > 0) {
					permissions.add(permission);
				}
			}
		}

		const result: ReadonlyArray<string> = [...permissions];
		this.cache.set(principal, result);
		hookPermissionResolverLogger.verbose(`Resolved ${result.length} hook permissions for principal "${principal.id}" from ${this.sources.length} sources.`);

		return result;
	}
}
