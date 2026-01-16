/**
 * Cache configuration for authorization policy registry.
 * Disabled by default to avoid caching subject-dependent rules.
 */
export interface IApiAuthorizationPolicyCacheOptions {
	isEnabled?: boolean;
	ttlMs?: number;
}
