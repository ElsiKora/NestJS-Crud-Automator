import type { IApiAuthorizationIamCondition, IApiAuthorizationIamPredicateColumn, IApiAuthorizationIamPredicatePair, IApiAuthorizationIamQueryField, IApiAuthorizationIamToken } from "@interface/class/api/authorization";
import type { TApiAuthorizationIamPredicate, TApiAuthorizationIamPredicateValue } from "@type/class/api/authorization/iam";

import { EApiAuthorizationIamColumnFamily, EApiAuthorizationIamPredicateComparison, EApiAuthorizationIamPredicateKind, EApiAuthorizationIamTokenType, EApiPolicyConditionOperatorFamily } from "@enum/class/authorization";

// Column families a String operator compares as text: the in-memory evaluator reads their values as the text the column stores.
const IAM_PREDICATE_TEXT_FAMILIES: ReadonlySet<EApiAuthorizationIamColumnFamily> = new Set<EApiAuthorizationIamColumnFamily>([EApiAuthorizationIamColumnFamily.ENUM, EApiAuthorizationIamColumnFamily.TEXT, EApiAuthorizationIamColumnFamily.UUID]);

/**
 * Builds the IAM predicate IR. Each condition key and each resource-pattern constraint becomes a NULL-complete pair of
 * `holds` and `fails`: disjoint, covering every row, and equal to the in-memory evaluator, so an Allow scope uses
 * `holds` and a Deny exclusion keeps `fails` without ever negating a comparison that NULL would turn `UNKNOWN`.
 *
 * For a positive operator P over the values V, with `c` the column and `k` the presence column of the last to-one
 * relation on the path:
 * - `holds(P) = c ∈ V`, `fails(P) = c ∉ V ∨ c IS NULL`;
 * - `P IfExists`: `holds = c ∈ V ∨ k IS NULL`, `fails = c ∉ V ∨ (c IS NULL ∧ k IS NOT NULL)`;
 * - a negated operator, with or without `IfExists`, swaps the pair of its positive form, because a missing value is NULL.
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
	 * Builds the pair of one String condition key on one column.
	 * @param {object} options - Key options.
	 * @param {IApiAuthorizationIamPredicateColumn} options.column - Column the key reads.
	 * @param {EApiAuthorizationIamPredicateComparison} options.comparison - How the column compares with the value.
	 * @param {IApiAuthorizationIamCondition} options.condition - Condition key read by the grammar.
	 * @param {IApiAuthorizationIamPredicateColumn} [options.presence] - Presence column of an optional path, the primary column of its last to-one relation.
	 * @param {ReadonlyArray<TApiAuthorizationIamPredicateValue>} options.values - Resolved values of the key: canonical text, or booleans for a boolean column.
	 * @returns {IApiAuthorizationIamPredicatePair | undefined} The pair, or undefined when the key cannot be expressed: another operator family, or a positive `IfExists` on an optional path without a presence column.
	 */
	public static buildCondition(options: { column: IApiAuthorizationIamPredicateColumn; comparison: EApiAuthorizationIamPredicateComparison; condition: IApiAuthorizationIamCondition; presence?: IApiAuthorizationIamPredicateColumn; values: ReadonlyArray<TApiAuthorizationIamPredicateValue> }): IApiAuthorizationIamPredicatePair | undefined {
		if (options.condition.family !== EApiPolicyConditionOperatorFamily.STRING || options.values.length === 0) {
			return undefined;
		}

		const isIn: TApiAuthorizationIamPredicate = { column: options.column, comparison: options.comparison, isNegated: false, kind: EApiAuthorizationIamPredicateKind.IN, values: options.values };
		const isNotIn: TApiAuthorizationIamPredicate = { column: options.column, comparison: options.comparison, isNegated: true, kind: EApiAuthorizationIamPredicateKind.IN, values: options.values };
		const isNull: TApiAuthorizationIamPredicate = { column: options.column, kind: EApiAuthorizationIamPredicateKind.IS_NULL };
		const plain: IApiAuthorizationIamPredicatePair = { fails: ApiAuthorizationIamPredicateBuilder.or([isNotIn, isNull]), holds: isIn };

		// A missing value reads as NULL, which no negated operator's positive form holds for, so IfExists changes nothing there.
		if (options.condition.isNegated) {
			return { fails: plain.holds, holds: plain.fails };
		}

		if (!options.condition.isIfExists || !options.column.field.isOptional) {
			return plain;
		}

		if (!options.presence) {
			return undefined;
		}

		return {
			fails: ApiAuthorizationIamPredicateBuilder.or([isNotIn, ApiAuthorizationIamPredicateBuilder.and([isNull, { column: options.presence, kind: EApiAuthorizationIamPredicateKind.NOT_NULL }])]),
			holds: ApiAuthorizationIamPredicateBuilder.or([isIn, { column: options.presence, kind: EApiAuthorizationIamPredicateKind.IS_NULL }]),
		};
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
