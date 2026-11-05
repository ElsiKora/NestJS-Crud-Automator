import type { TTypeOrmColumnMetadata } from "@type/utility/typeorm";

/**
 * Two columns a correlated subquery joins on.
 */
export interface IApiSubqueryJoinPair {
	/** The column of the table this pair belongs to. */
	column: TTypeOrmColumnMetadata;
	/** The column of the table before it: the row itself for the first table of a subquery. */
	previous: TTypeOrmColumnMetadata;
}
