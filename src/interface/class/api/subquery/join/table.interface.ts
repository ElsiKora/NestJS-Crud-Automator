import type { EntityMetadata } from "typeorm";

import type { IApiSubqueryJoinPair } from "./pair.interface";

/**
 * One table a relation crosses inside a correlated subquery, with what joins it to the table before it.
 */
export interface IApiSubqueryJoinTable {
	/** Metadata of the table, a junction table included. */
	metadata: EntityMetadata;
	/** Column pairs of the join; a composite join column holds one pair per column. */
	on: ReadonlyArray<IApiSubqueryJoinPair>;
}
