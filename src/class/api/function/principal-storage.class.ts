import type { AsyncLocalStorage } from "node:async_hooks";

import type { IApiAuthorizationPrincipal } from "@interface/class/api/authorization/principal/interface";
import type { IApiFunctionPrincipalStorageEntry } from "@interface/class/api/function/principal-storage";

import { AsyncLocalStorage as NodeAsyncLocalStorage } from "node:async_hooks";

import { ApiControllerGeneratedSecuritySnapshot } from "@class/api/controller/generated/security-snapshot.class";

/**
 * Carries the principal a route resolved to the functions its request runs.
 * Internal: function subscribers read it as `context.DATA.principal`. Work the request starts inherits it, nested service calls and transaction callbacks included; a function called outside a route, or on a route without authorization, sees none.
 */
export class ApiFunctionPrincipalStorage {
	private static readonly STORAGE: AsyncLocalStorage<IApiFunctionPrincipalStorageEntry> = new NodeAsyncLocalStorage<IApiFunctionPrincipalStorageEntry>();

	/**
	 * Reads the principal of the route request the current function runs in.
	 * @returns {Readonly<IApiAuthorizationPrincipal> | undefined} The deep-frozen principal, or undefined outside a route with authorization.
	 */
	public static get(): Readonly<IApiAuthorizationPrincipal> | undefined {
		return ApiFunctionPrincipalStorage.STORAGE.getStore()?.principal;
	}

	/**
	 * Runs the work of one route request with its principal.
	 * @template R Result type.
	 * @param {IApiAuthorizationPrincipal | undefined} principal - Principal of the request's authorization decision; undefined for a route without authorization.
	 * @param {() => Promise<R>} callback - Work of the request.
	 * @returns {Promise<R>} The result of the work.
	 */
	public static run<R>(principal: IApiAuthorizationPrincipal | undefined, callback: () => Promise<R>): Promise<R> {
		// A deep-frozen copy, so no subscriber can change the principal the decision holds or another subscriber reads.
		const entry: IApiFunctionPrincipalStorageEntry = Object.freeze({ principal: principal ? ApiControllerGeneratedSecuritySnapshot.freeze(principal) : undefined });

		return ApiFunctionPrincipalStorage.STORAGE.run(entry, callback);
	}
}
