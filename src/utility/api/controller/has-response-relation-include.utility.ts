/**
 * Checks whether a route reloads its response row, which answers `404` when the row is missing.
 * Any configured include key reloads the row, also one set to `false`.
 * @param {unknown} include - Response relation load include.
 * @returns {boolean} Whether the response row is reloaded.
 */
export function ApiControllerHasResponseRelationInclude(include: unknown): boolean {
	return include !== null && typeof include === "object" && Object.keys(include).length > 0;
}
