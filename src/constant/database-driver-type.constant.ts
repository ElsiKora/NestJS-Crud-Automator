/**
 * Driver types as the TypeORM DataSource options name them.
 * Internal: node-postgres serializes a `Date` parameter through the local offset truncated to whole minutes, so only these drivers bind an instant as text.
 */
export const DATABASE_DRIVER_TYPE_CONSTANT: {
	readonly NODE_POSTGRES: ReadonlySet<string>;
} = Object.freeze({
	// Drivers whose queries run through node-postgres.
	NODE_POSTGRES: new Set<string>(["cockroachdb", "postgres"]),
});
