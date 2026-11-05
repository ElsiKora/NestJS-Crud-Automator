import { DTO_GENERATE_CONSTANT } from "@constant/utility/dto/generate.constant";
import { EFilterOperation } from "@enum/filter";

// Most relations a filter path may cross; a link entity counts as two. The typed path of a plan counts its depth from this literal type.
// eslint-disable-next-line @elsikora/typescript/no-magic-numbers, @elsikora/typescript/typedef
const MAXIMUM_HOPS = 4 as const;

// Length of the hash in a parameter name: 96 bits, so two different values never share a name in practice.
const PARAMETER_HASH_LENGTH: number = 24;

/**
 * Limits and vocabulary of a declared relation filter on a typed GET_LIST plan.
 */
export const FILTER_RELATION_CONSTANT: {
	readonly ABSENCE_OPERATIONS: ReadonlySet<EFilterOperation>;
	readonly ALIAS_PREFIX: string;
	readonly MAXIMUM_HOPS: typeof MAXIMUM_HOPS;
	readonly MAXIMUM_VALUES: number;
	readonly MINIMUM_VALUES: number;
	readonly PARAMETER_HASH_LENGTH: number;
	readonly SUPPORTED_DRIVER_TYPES: ReadonlySet<string>;
	readonly TABLE_TYPE_ENTITY_CHILD: string;
} = Object.freeze({
	// Operations that ask about the absence of a related row or value. A relation filter means that a related row exists that matches, so none of them can mean the same.
	ABSENCE_OPERATIONS: new Set<EFilterOperation>([EFilterOperation.EXCL, EFilterOperation.EXCLL, EFilterOperation.ISNULL, EFilterOperation.NE, EFilterOperation.NEL, EFilterOperation.NOTIN, EFilterOperation.NOTINL, EFilterOperation.NOTNULL]),
	// Alias of the row of a hop inside the subquery, followed by its position.
	ALIAS_PREFIX: "relation_filter_",
	MAXIMUM_HOPS,
	MAXIMUM_VALUES: DTO_GENERATE_CONSTANT.MAXIMUM_FILTER_PROPERTIES,
	MINIMUM_VALUES: 1,
	PARAMETER_HASH_LENGTH,
	// Drivers whose SQL the relation filter suites run against.
	SUPPORTED_DRIVER_TYPES: new Set<string>(["better-sqlite3", "mariadb", "mysql", "postgres"]),
	// Table type TypeORM gives an entity that shares the table of its single-table-inheritance parent.
	TABLE_TYPE_ENTITY_CHILD: "entity-child",
});
