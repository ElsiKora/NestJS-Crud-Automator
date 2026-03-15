import type { IApiAuthorizationPrincipal, IApiHookPermissionSource } from "@interface/class/api/authorization";

import { AUTHORIZATION_HOOK_PERMISSION_SOURCES_TOKEN } from "@constant/class/authorization";
import { Inject, Injectable, Optional } from "@nestjs/common";
import { LoggerUtility } from "@utility/logger.utility";

const hookPermissionResolverLogger: LoggerUtility = LoggerUtility.getLogger("ApiAuthorizationHookPermissionResolver");

@Injectable()
export class ApiAuthorizationHookPermissionResolver {
	private readonly CACHE: Map<string, ReadonlyArray<string>> = new Map<string, ReadonlyArray<string>>();

	public constructor(
		@Optional()
		@Inject(AUTHORIZATION_HOOK_PERMISSION_SOURCES_TOKEN)
		private readonly sources: ReadonlyArray<IApiHookPermissionSource> = [],
	) {}

	public clear(): void {
		this.CACHE.clear();
	}

	public async resolve(principal: IApiAuthorizationPrincipal): Promise<ReadonlyArray<string>> {
		const cacheKey: string = this.createPrincipalCacheKey(principal);
		const cachedPermissions: ReadonlyArray<string> | undefined = this.CACHE.get(cacheKey);

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
		this.CACHE.set(cacheKey, result);
		hookPermissionResolverLogger.verbose(`Resolved ${result.length} hook permissions for principal "${principal.id}" from ${this.sources.length} sources.`);

		return result;
	}

	private createPrincipalCacheKey(principal: IApiAuthorizationPrincipal): string {
		return JSON.stringify(this.normalizeValue(principal));
	}

	private normalizeValue(value: unknown): unknown {
		if (Array.isArray(value)) {
			return value.map((item: unknown) => this.normalizeValue(item));
		}

		if (!value || typeof value !== "object") {
			return value;
		}

		const normalizedValue: Record<string, unknown> = {};
		const recordValue: Record<string, unknown> = value as Record<string, unknown>;
		const sortedKeys: Array<string> = Object.keys(recordValue).sort((left: string, right: string) => left.localeCompare(right));

		for (const key of sortedKeys) {
			normalizedValue[key] = this.normalizeValue(recordValue[key]);
		}

		return normalizedValue;
	}
}
