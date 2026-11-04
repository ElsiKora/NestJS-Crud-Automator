import type { IApiAuthorizationIamColumn, IApiAuthorizationIamCondition, IApiAuthorizationIamPredicateColumn, IApiAuthorizationIamPredicatePair, IApiAuthorizationIamQueryField, IApiAuthorizationIamToken } from "@interface/class/api/authorization";
import type { TApiAuthorizationIamPredicate, TApiAuthorizationIamPredicateValue } from "@type/class/api/authorization/iam";

import { AUTHORIZATION_IAM_COLUMN_FAMILY_CONSTANT } from "@constant/class/authorization";
import { EApiAuthorizationIamColumnFamily, EApiAuthorizationIamPredicateComparison, EApiAuthorizationIamPredicateKind, EApiAuthorizationIamPredicateOperator, EApiAuthorizationIamTokenType, EApiPolicyConditionOperatorFamily } from "@enum/class/authorization";

// Column families a String operator compares as text: the in-memory evaluator reads their values as the text the column stores.
const IAM_PREDICATE_TEXT_FAMILIES: ReadonlySet<EApiAuthorizationIamColumnFamily> = new Set<EApiAuthorizationIamColumnFamily>([EApiAuthorizationIamColumnFamily.ENUM, EApiAuthorizationIamColumnFamily.TEXT, EApiAuthorizationIamColumnFamily.UUID]);

// Operator families whose positive form is an `IN` atom.
const IAM_PREDICATE_IN_FAMILIES: ReadonlySet<EApiPolicyConditionOperatorFamily> = new Set<EApiPolicyConditionOperatorFamily>([EApiPolicyConditionOperatorFamily.BOOL, EApiPolicyConditionOperatorFamily.STRING, EApiPolicyConditionOperatorFamily.STRING_IGNORE_CASE]);

// The complement of each comparison over non-NULL values.
const IAM_PREDICATE_COMPLEMENT: ReadonlyMap<EApiAuthorizationIamPredicateOperator, EApiAuthorizationIamPredicateOperator> = new Map<EApiAuthorizationIamPredicateOperator, EApiAuthorizationIamPredicateOperator>([
	[EApiAuthorizationIamPredicateOperator.EQUAL, EApiAuthorizationIamPredicateOperator.NOT_EQUAL],
	[EApiAuthorizationIamPredicateOperator.GREATER_THAN, EApiAuthorizationIamPredicateOperator.LESS_THAN_EQUAL],
	[EApiAuthorizationIamPredicateOperator.GREATER_THAN_EQUAL, EApiAuthorizationIamPredicateOperator.LESS_THAN],
	[EApiAuthorizationIamPredicateOperator.LESS_THAN, EApiAuthorizationIamPredicateOperator.GREATER_THAN_EQUAL],
	[EApiAuthorizationIamPredicateOperator.LESS_THAN_EQUAL, EApiAuthorizationIamPredicateOperator.GREATER_THAN],
	[EApiAuthorizationIamPredicateOperator.NOT_EQUAL, EApiAuthorizationIamPredicateOperator.EQUAL],
]);

/**
 * Builds the IAM predicate IR. Each condition key and each resource-pattern constraint becomes a NULL-complete pair of
 * `holds` and `fails`: disjoint, covering every row, and equal to the in-memory evaluator, so an Allow scope uses
 * `holds` and a Deny exclusion keeps `fails` without ever negating a comparison that NULL would turn `UNKNOWN`.
 *
 * For a positive operator P over the values V, with `c` the column and `k` the presence column of the last to-one
 * relation on the path:
 * - `holds(P) = c ∈ V`, `fails(P) = c ∉ V ∨ c IS NULL`;
 * - `P IfExists`: `holds = c ∈ V ∨ k IS NULL`, `fails = c ∉ V ∨ (c IS NULL ∧ k IS NOT NULL)`;
 * - a negated operator, with or without `IfExists`, swaps the pair of its positive form, because a missing value is NULL;
 * - a StringLike glob that matches `""` reads a NULL column as a match: `holds = c ∈ V ∨ c IS NULL`, `fails = c ∉ V`, and
 *   then a negated `IfExists` is the form that tells a missing relation from a NULL column.
 */
export class ApiAuthorizationIamPredicateBuilder {
	/**
	 * ANDs predicates, dropping `TRUE` children and folding to `FALSE` when one child is `FALSE`.
	 * @param {ReadonlyArray<TApiAuthorizationIamPredicate>} children - Predicates to AND, in order.
	 * @returns {TApiAuthorizationIamPredicate} The conjunction.
	 */
	public static and(children: ReadonlyArray<TApiAuthorizationIamPredicate>): TApiAuthorizationIamPredicate {
		return ApiAuthorizationIamPredicateBuilder.group(EApiAuthorizationIamPredicateKind.AND, children);
	}

	/**
	 * Builds the pair of one Arn condition key: the column matches the pattern segment by segment.
	 * @param {object} options - Key options.
	 * @param {IApiAuthorizationIamPredicateColumn} options.column - Column the key reads.
	 * @param {IApiAuthorizationIamCondition} options.condition - Condition key read by the grammar.
	 * @param {ReadonlyArray<IApiAuthorizationIamToken>} options.pattern - Literal, `*` and `?` tokens of the resolved value.
	 * @param {IApiAuthorizationIamPredicateColumn} [options.presence] - Presence column of an optional path.
	 * @returns {IApiAuthorizationIamPredicatePair | undefined} The pair, or undefined when the key cannot be expressed.
	 */
	public static buildArn(options: { column: IApiAuthorizationIamPredicateColumn; condition: IApiAuthorizationIamCondition; pattern: ReadonlyArray<IApiAuthorizationIamToken>; presence?: IApiAuthorizationIamPredicateColumn }): IApiAuthorizationIamPredicatePair | undefined {
		return ApiAuthorizationIamPredicateBuilder.buildPair({
			column: options.column,
			condition: options.condition,
			isIn: { column: options.column, isNegated: false, kind: EApiAuthorizationIamPredicateKind.ARN, pattern: options.pattern },
			isNotIn: { column: options.column, isNegated: true, kind: EApiAuthorizationIamPredicateKind.ARN, pattern: options.pattern },
			presence: options.presence,
		});
	}

	/**
	 * Builds the pair of one Numeric or Date condition key: the column compares with the value by its order. The
	 * complement of each comparison over non-NULL values is also a comparison, so no `NOT` meets a NULL.
	 * @param {object} options - Key options.
	 * @param {IApiAuthorizationIamPredicateColumn} options.column - Column the key reads.
	 * @param {EApiAuthorizationIamPredicateComparison} options.comparison - `NUMERIC` or `DATE`.
	 * @param {IApiAuthorizationIamCondition} options.condition - Condition key read by the grammar.
	 * @param {EApiAuthorizationIamPredicateOperator} options.operator - How the operator's positive form orders the column against the value.
	 * @param {IApiAuthorizationIamPredicateColumn} [options.presence] - Presence column of an optional path.
	 * @param {string} options.value - Canonical text of the resolved value.
	 * @returns {IApiAuthorizationIamPredicatePair | undefined} The pair, or undefined when the key cannot be expressed.
	 */
	public static buildCompare(options: { column: IApiAuthorizationIamPredicateColumn; comparison: EApiAuthorizationIamPredicateComparison; condition: IApiAuthorizationIamCondition; operator: EApiAuthorizationIamPredicateOperator; presence?: IApiAuthorizationIamPredicateColumn; value: string }): IApiAuthorizationIamPredicatePair | undefined {
		const createAtom: (operator: EApiAuthorizationIamPredicateOperator) => TApiAuthorizationIamPredicate = (operator: EApiAuthorizationIamPredicateOperator): TApiAuthorizationIamPredicate => ({ column: options.column, comparison: options.comparison, kind: EApiAuthorizationIamPredicateKind.COMPARE, operator, value: options.value });

		return ApiAuthorizationIamPredicateBuilder.buildPair({
			column: options.column,
			condition: options.condition,
			isIn: createAtom(options.operator),
			isNotIn: createAtom(IAM_PREDICATE_COMPLEMENT.get(options.operator) ?? options.operator),
			presence: options.presence,
		});
	}

	/**
	 * Builds the pair of one String, IgnoreCase or Bool condition key on one column.
	 * @param {object} options - Key options.
	 * @param {IApiAuthorizationIamPredicateColumn} options.column - Column the key reads.
	 * @param {EApiAuthorizationIamPredicateComparison} options.comparison - How the column compares with the value.
	 * @param {IApiAuthorizationIamCondition} options.condition - Condition key read by the grammar.
	 * @param {IApiAuthorizationIamPredicateColumn} [options.presence] - Presence column of an optional path, the primary column of its last to-one relation.
	 * @param {ReadonlyArray<TApiAuthorizationIamPredicateValue>} options.values - Resolved values of the key: canonical text, folded for IgnoreCase, or booleans for a boolean column.
	 * @returns {IApiAuthorizationIamPredicatePair | undefined} The pair, or undefined when the key cannot be expressed: another operator family, or a positive `IfExists` on an optional path without a presence column.
	 */
	public static buildCondition(options: { column: IApiAuthorizationIamPredicateColumn; comparison: EApiAuthorizationIamPredicateComparison; condition: IApiAuthorizationIamCondition; presence?: IApiAuthorizationIamPredicateColumn; values: ReadonlyArray<TApiAuthorizationIamPredicateValue> }): IApiAuthorizationIamPredicatePair | undefined {
		if (!IAM_PREDICATE_IN_FAMILIES.has(options.condition.family) || options.values.length === 0) {
			return undefined;
		}

		return ApiAuthorizationIamPredicateBuilder.buildPair({
			column: options.column,
			condition: options.condition,
			isIn: { column: options.column, comparison: options.comparison, isNegated: false, kind: EApiAuthorizationIamPredicateKind.IN, values: options.values },
			isNotIn: { column: options.column, comparison: options.comparison, isNegated: true, kind: EApiAuthorizationIamPredicateKind.IN, values: options.values },
			presence: options.presence,
		});
	}

	/**
	 * Builds the pair of one exact resource-pattern constraint: the placeholder renders exactly the value. A NULL
	 * placeholder renders as `""`, so the empty value holds for NULL, and for `""` on a text column.
	 * @param {object} options - Constraint options.
	 * @param {IApiAuthorizationIamPredicateColumn} options.column - Column the placeholder reads.
	 * @param {EApiAuthorizationIamPredicateComparison} options.comparison - How the column compares with the value.
	 * @param {TApiAuthorizationIamPredicateValue} options.value - Value the placeholder must render: canonical text, `""`, or a boolean for a boolean column.
	 * @returns {IApiAuthorizationIamPredicatePair} The pair.
	 */
	public static buildExactConstraint(options: { column: IApiAuthorizationIamPredicateColumn; comparison: EApiAuthorizationIamPredicateComparison; value: TApiAuthorizationIamPredicateValue }): IApiAuthorizationIamPredicatePair {
		const isNull: TApiAuthorizationIamPredicate = { column: options.column, kind: EApiAuthorizationIamPredicateKind.IS_NULL };

		if (options.value !== "") {
			return {
				fails: ApiAuthorizationIamPredicateBuilder.or([{ column: options.column, comparison: options.comparison, isNegated: true, kind: EApiAuthorizationIamPredicateKind.IN, values: [options.value] }, isNull]),
				holds: { column: options.column, comparison: options.comparison, isNegated: false, kind: EApiAuthorizationIamPredicateKind.IN, values: [options.value] },
			};
		}

		const notNull: TApiAuthorizationIamPredicate = { column: options.column, kind: EApiAuthorizationIamPredicateKind.NOT_NULL };

		// Only a text column can hold "" itself; any other column renders "" only when it is NULL.
		if (options.comparison !== EApiAuthorizationIamPredicateComparison.TEXT) {
			return { fails: notNull, holds: isNull };
		}

		return {
			fails: ApiAuthorizationIamPredicateBuilder.and([notNull, { column: options.column, comparison: options.comparison, isNegated: true, kind: EApiAuthorizationIamPredicateKind.IN, values: [""] }]),
			holds: ApiAuthorizationIamPredicateBuilder.or([isNull, { column: options.column, comparison: options.comparison, isNegated: false, kind: EApiAuthorizationIamPredicateKind.IN, values: [""] }]),
		};
	}

	/**
	 * Builds the pair of one IP condition key: the column's network lies within the range.
	 * @param {object} options - Key options.
	 * @param {IApiAuthorizationIamPredicateColumn} options.column - Column the key reads.
	 * @param {IApiAuthorizationIamCondition} options.condition - Condition key read by the grammar.
	 * @param {IApiAuthorizationIamPredicateColumn} [options.presence] - Presence column of an optional path.
	 * @param {string} options.range - The resolved range as text.
	 * @returns {IApiAuthorizationIamPredicatePair | undefined} The pair, or undefined when the key cannot be expressed.
	 */
	public static buildIpContained(options: { column: IApiAuthorizationIamPredicateColumn; condition: IApiAuthorizationIamCondition; presence?: IApiAuthorizationIamPredicateColumn; range: string }): IApiAuthorizationIamPredicatePair | undefined {
		return ApiAuthorizationIamPredicateBuilder.buildPair({
			column: options.column,
			condition: options.condition,
			isIn: { column: options.column, isNegated: false, kind: EApiAuthorizationIamPredicateKind.IP_CONTAINED, range: options.range },
			isNotIn: { column: options.column, isNegated: true, kind: EApiAuthorizationIamPredicateKind.IP_CONTAINED, range: options.range },
			presence: options.presence,
		});
	}

	/**
	 * Builds the pair of one StringLike condition key: a NULL column reads as `""`, so it belongs to the positive form
	 * exactly when the glob matches `""`.
	 * @param {object} options - Key options.
	 * @param {IApiAuthorizationIamPredicateColumn} options.column - Column the key reads.
	 * @param {IApiAuthorizationIamCondition} options.condition - Condition key read by the grammar.
	 * @param {ReadonlyArray<IApiAuthorizationIamToken>} options.pattern - Literal, `*` and `?` tokens of the resolved value.
	 * @param {IApiAuthorizationIamPredicateColumn} [options.presence] - Presence column of an optional path.
	 * @returns {IApiAuthorizationIamPredicatePair | undefined} The pair, or undefined when the key cannot be expressed.
	 */
	public static buildLike(options: { column: IApiAuthorizationIamPredicateColumn; condition: IApiAuthorizationIamCondition; pattern: ReadonlyArray<IApiAuthorizationIamToken>; presence?: IApiAuthorizationIamPredicateColumn }): IApiAuthorizationIamPredicatePair | undefined {
		return ApiAuthorizationIamPredicateBuilder.buildPair({
			column: options.column,
			condition: options.condition,
			isIn: { column: options.column, isConditionKey: true, isNegated: false, kind: EApiAuthorizationIamPredicateKind.LIKE, pattern: options.pattern },
			isNotIn: { column: options.column, isConditionKey: true, isNegated: true, kind: EApiAuthorizationIamPredicateKind.LIKE, pattern: options.pattern },
			isNullIn: options.pattern.every((token: IApiAuthorizationIamToken): boolean => token.type === EApiAuthorizationIamTokenType.STAR),
			presence: options.presence,
		});
	}

	/**
	 * Builds the pair of one Null condition key: a missing value reads as NULL on the joined row, so no presence column is needed.
	 * @param {object} options - Key options.
	 * @param {IApiAuthorizationIamPredicateColumn} options.column - Column the key reads.
	 * @param {boolean} options.isNull - Whether the key asks for a missing or NULL value.
	 * @returns {IApiAuthorizationIamPredicatePair} The pair.
	 */
	public static buildNull(options: { column: IApiAuthorizationIamPredicateColumn; isNull: boolean }): IApiAuthorizationIamPredicatePair {
		const isNull: TApiAuthorizationIamPredicate = { column: options.column, kind: EApiAuthorizationIamPredicateKind.IS_NULL };
		const notNull: TApiAuthorizationIamPredicate = { column: options.column, kind: EApiAuthorizationIamPredicateKind.NOT_NULL };

		return options.isNull ? { fails: notNull, holds: isNull } : { fails: isNull, holds: notNull };
	}

	/**
	 * Builds the pair of one prefix resource-pattern constraint: the placeholder renders text that starts with the prefix.
	 * A NULL placeholder renders as `""`, which only the empty prefix starts.
	 * @param {object} options - Constraint options.
	 * @param {IApiAuthorizationIamPredicateColumn} options.column - Text column the placeholder reads.
	 * @param {string} options.prefix - Literal prefix.
	 * @returns {IApiAuthorizationIamPredicatePair} The pair.
	 */
	public static buildPrefixConstraint(options: { column: IApiAuthorizationIamPredicateColumn; prefix: string }): IApiAuthorizationIamPredicatePair {
		if (options.prefix === "") {
			return { fails: { kind: EApiAuthorizationIamPredicateKind.FALSE }, holds: { kind: EApiAuthorizationIamPredicateKind.TRUE } };
		}

		const pattern: ReadonlyArray<IApiAuthorizationIamToken> = [{ type: EApiAuthorizationIamTokenType.LITERAL, value: options.prefix }, { type: EApiAuthorizationIamTokenType.STAR }];

		return {
			fails: ApiAuthorizationIamPredicateBuilder.or([
				{ column: options.column, isNegated: true, kind: EApiAuthorizationIamPredicateKind.LIKE, pattern },
				{ column: options.column, kind: EApiAuthorizationIamPredicateKind.IS_NULL },
			]),
			holds: { column: options.column, isNegated: false, kind: EApiAuthorizationIamPredicateKind.LIKE, pattern },
		};
	}

	/**
	 * Tells whether an operator family compares a column exactly, in SQL and in memory, whatever the dialect then does
	 * with it. A TypeORM value transformer holds another value than the read one, and `Raw` conditions bypass it, so
	 * only `StringEquals`, `StringNotEquals` and `Null` take such a column.
	 * @param {EApiPolicyConditionOperatorFamily} family - Operator family.
	 * @param {IApiAuthorizationIamQueryField} field - Resolved query path of the key.
	 * @returns {boolean} Whether the family fits the column.
	 */
	public static isOperatorFitting(family: EApiPolicyConditionOperatorFamily, field: IApiAuthorizationIamQueryField): boolean {
		const column: IApiAuthorizationIamColumn | undefined = field.column;

		if (!field.isResolvable || !column) {
			return false;
		}

		if (family === EApiPolicyConditionOperatorFamily.NULL) {
			return true;
		}

		if (family === EApiPolicyConditionOperatorFamily.STRING) {
			return ApiAuthorizationIamPredicateBuilder.isStringComparable(field);
		}

		if (column.hasTransformer) {
			return false;
		}

		switch (family) {
			case EApiPolicyConditionOperatorFamily.ARN:
			// falls through

			case EApiPolicyConditionOperatorFamily.STRING_IGNORE_CASE:
			// falls through

			case EApiPolicyConditionOperatorFamily.STRING_LIKE: {
				return !field.isBoolean && column.family === EApiAuthorizationIamColumnFamily.TEXT;
			}

			case EApiPolicyConditionOperatorFamily.BOOL: {
				return field.isBoolean && (column.type === undefined || AUTHORIZATION_IAM_COLUMN_FAMILY_CONSTANT.BOOLEAN_TYPES.has(column.type));
			}

			case EApiPolicyConditionOperatorFamily.DATE: {
				return column.family === EApiAuthorizationIamColumnFamily.DATE && (column.type === undefined || AUTHORIZATION_IAM_COLUMN_FAMILY_CONSTANT.DATE_TYPES.has(column.type));
			}

			case EApiPolicyConditionOperatorFamily.IP_ADDRESS: {
				return column.family === EApiAuthorizationIamColumnFamily.NETWORK;
			}

			case EApiPolicyConditionOperatorFamily.NUMERIC: {
				return column.family === EApiAuthorizationIamColumnFamily.NUMERIC && !(column.type !== undefined && AUTHORIZATION_IAM_COLUMN_FAMILY_CONSTANT.MONEY_TYPES.has(column.type));
			}

			default: {
				return false;
			}
		}
	}

	/**
	 * Tells whether a String operator compares a column exactly as text, in SQL and in memory: a text, UUID or enum
	 * column, or a boolean column with `true` or `false`. A numeric or date column compares by value in SQL (`1.50`
	 * equals `1.5`) and as text in memory, and a JSON, list, binary or other column has no text the two would agree on,
	 * so a String operator on one fails closed.
	 * @param {IApiAuthorizationIamQueryField} field - Resolved query path of the key.
	 * @returns {boolean} Whether a String operator can compare the column.
	 */
	public static isStringComparable(field: IApiAuthorizationIamQueryField): boolean {
		return field.isBoolean || (field.column !== undefined && IAM_PREDICATE_TEXT_FAMILIES.has(field.column.family));
	}

	/**
	 * Tells whether a column holds text that a String operator or a resource placeholder compares code point by code point.
	 * @param {IApiAuthorizationIamQueryField} field - Resolved query path.
	 * @returns {boolean} Whether the column is a text, UUID or enum column.
	 */
	public static isTextColumn(field: IApiAuthorizationIamQueryField): boolean {
		return !field.isBoolean && field.column !== undefined && IAM_PREDICATE_TEXT_FAMILIES.has(field.column.family);
	}

	/**
	 * ORs predicates, dropping `FALSE` children and folding to `TRUE` when one child is `TRUE`.
	 * @param {ReadonlyArray<TApiAuthorizationIamPredicate>} children - Predicates to OR, in order.
	 * @returns {TApiAuthorizationIamPredicate} The disjunction.
	 */
	public static or(children: ReadonlyArray<TApiAuthorizationIamPredicate>): TApiAuthorizationIamPredicate {
		return ApiAuthorizationIamPredicateBuilder.group(EApiAuthorizationIamPredicateKind.OR, children);
	}

	/**
	 * Builds the NULL-complete pair of a key from the two atoms of its positive form, as the class comment says.
	 * @param {object} options - Pair options.
	 * @param {IApiAuthorizationIamPredicateColumn} options.column - Column the key reads.
	 * @param {IApiAuthorizationIamCondition} options.condition - Condition key read by the grammar.
	 * @param {TApiAuthorizationIamPredicate} options.isIn - The positive form on a non-NULL column.
	 * @param {TApiAuthorizationIamPredicate} options.isNotIn - The complement of the positive form on a non-NULL column.
	 * @param {boolean} [options.isNullIn] - Whether the positive form holds on a NULL column, which it does for a glob that matches `""`.
	 * @param {IApiAuthorizationIamPredicateColumn} [options.presence] - Presence column of an optional path.
	 * @returns {IApiAuthorizationIamPredicatePair | undefined} The pair, or undefined when `IfExists` must tell a missing relation from a NULL column on a path without a presence column.
	 */
	private static buildPair(options: { column: IApiAuthorizationIamPredicateColumn; condition: IApiAuthorizationIamCondition; isIn: TApiAuthorizationIamPredicate; isNotIn: TApiAuthorizationIamPredicate; isNullIn?: boolean; presence?: IApiAuthorizationIamPredicateColumn }): IApiAuthorizationIamPredicatePair | undefined {
		const isNull: TApiAuthorizationIamPredicate = { column: options.column, kind: EApiAuthorizationIamPredicateKind.IS_NULL };
		const isNullIn: boolean = options.isNullIn === true;
		const positive: IApiAuthorizationIamPredicatePair = isNullIn ? { fails: options.isNotIn, holds: ApiAuthorizationIamPredicateBuilder.or([options.isIn, isNull]) } : { fails: ApiAuthorizationIamPredicateBuilder.or([options.isNotIn, isNull]), holds: options.isIn };
		const plain: IApiAuthorizationIamPredicatePair = options.condition.isNegated ? { fails: positive.holds, holds: positive.fails } : positive;

		// Where the form already holds on a NULL column, a missing relation, which reads as NULL, holds too: IfExists changes nothing.
		if (!options.condition.isIfExists || !options.column.field.isOptional || options.condition.isNegated !== isNullIn) {
			return plain;
		}

		if (!options.presence) {
			return undefined;
		}

		const isMissing: TApiAuthorizationIamPredicate = { column: options.presence, kind: EApiAuthorizationIamPredicateKind.IS_NULL };
		const isNullColumn: TApiAuthorizationIamPredicate = ApiAuthorizationIamPredicateBuilder.and([isNull, { column: options.presence, kind: EApiAuthorizationIamPredicateKind.NOT_NULL }]);
		const isHeld: TApiAuthorizationIamPredicate = options.condition.isNegated ? options.isNotIn : options.isIn;
		const isFailed: TApiAuthorizationIamPredicate = options.condition.isNegated ? options.isIn : options.isNotIn;

		return { fails: ApiAuthorizationIamPredicateBuilder.or([isFailed, isNullColumn]), holds: ApiAuthorizationIamPredicateBuilder.or([isHeld, isMissing]) };
	}

	/**
	 * Builds an AND or an OR with constant folding: the neutral constant drops, the absorbing one wins, a nested group
	 * of the same kind is flattened, and a group of one child is that child.
	 * @param {EApiAuthorizationIamPredicateKind.AND | EApiAuthorizationIamPredicateKind.OR} kind - Group kind.
	 * @param {ReadonlyArray<TApiAuthorizationIamPredicate>} children - Children, in order.
	 * @returns {TApiAuthorizationIamPredicate} The group.
	 */
	private static group(kind: EApiAuthorizationIamPredicateKind.AND | EApiAuthorizationIamPredicateKind.OR, children: ReadonlyArray<TApiAuthorizationIamPredicate>): TApiAuthorizationIamPredicate {
		const neutral: EApiAuthorizationIamPredicateKind = kind === EApiAuthorizationIamPredicateKind.AND ? EApiAuthorizationIamPredicateKind.TRUE : EApiAuthorizationIamPredicateKind.FALSE;
		const absorbing: EApiAuthorizationIamPredicateKind = kind === EApiAuthorizationIamPredicateKind.AND ? EApiAuthorizationIamPredicateKind.FALSE : EApiAuthorizationIamPredicateKind.TRUE;
		const kept: Array<TApiAuthorizationIamPredicate> = [];

		for (const child of children) {
			if (child.kind === absorbing) {
				return { kind: absorbing };
			}

			if (child.kind === neutral) {
				continue;
			}

			if (child.kind === kind) {
				kept.push(...child.children);

				continue;
			}

			kept.push(child);
		}

		if (kept.length === 0) {
			return { kind: neutral };
		}

		return kept.length === 1 && kept[0] ? kept[0] : { children: kept, kind };
	}
}
