/**
 * Cache configuration for authorization policy registry.
 * Disabled by default to avoid caching principal-dependent rules.
 */
export interface IApiAuthorizationPolicyCacheOptions {
	isEnabled?: boolean;
	ttlMs?: number;
}
