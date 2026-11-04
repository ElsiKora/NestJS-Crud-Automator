import type { IApiAuthorizationIamCondition, IApiAuthorizationIamConditionValue, IApiAuthorizationIamDateValue, IApiAuthorizationIamDecimal, IApiAuthorizationIamNetwork, IApiAuthorizationIamOperand, IApiAuthorizationIamToken } from "@interface/class/api/authorization";

import { ApiAuthorizationIamDateValue } from "@class/api/authorization/iam/date-value.class";
import { ApiAuthorizationIamDecimal } from "@class/api/authorization/iam/decimal.class";
import { ApiAuthorizationIamGlob } from "@class/api/authorization/iam/glob.class";
import { ApiAuthorizationIamNetwork } from "@class/api/authorization/iam/network.class";
import { ApiAuthorizationIamVariable } from "@class/api/authorization/iam/variable.class";
import { AUTHORIZATION_POLICY_CONDITION_OPERATOR_CONSTANT } from "@constant/class/authorization";
import { EApiAuthorizationIamPredicateOperator, EApiAuthorizationIamTokenType, EApiPolicyConditionOperatorFamily } from "@enum/class/authorization";
import { AuthorizationSerializeValue } from "@utility/authorization/serialize-value.utility";

// What a Numeric column holds above every number: PostgreSQL sorts `NaN` above `Infinity`, and no literal names either.
const IAM_OPERATOR_ABOVE_EVERY_NUMBER: ReadonlySet<unknown> = new Set<unknown>(["Infinity", "NaN", Number.NaN, Number.POSITIVE_INFINITY]);

// What a Numeric column holds below every number.
const IAM_OPERATOR_BELOW_EVERY_NUMBER: ReadonlySet<unknown> = new Set<unknown>(["-Infinity", Number.NEGATIVE_INFINITY]);

/**
 * The in-memory rules of the IAM condition operators. A key reads to one of three outcomes: it holds, it fails, or it
 * cannot be read, which `undefined` says and the caller fails closed by the statement's effect. Per family:
 * - String: canonical text of both sides, a missing or NULL value as `""`, compared by code point;
 * - IgnoreCase: the same after folding only A-Z, so no Unicode case rule can widen a match;
 * - StringLike: a glob over code points, a missing or NULL value as `""`;
 * - Numeric: exact decimals, never through a double;
 * - Date: epoch milliseconds, or calendar text; an instant and a calendar date do not compare;
 * - Bool: `true`, `false` or that exact text;
 * - Null: whether the value is missing or NULL;
 * - IP: BigInt bits per address family;
 * - Arn: a glob per `:` segment, with equal segment counts.
 *
 * On a missing or NULL value a positive operator of the last five families gives false and a negated one true. `IfExists`
 * holds on a missing value, while on a NULL column the base operator applies. A list, an object or a value that does not
 * parse for the family cannot be read.
 */
export class ApiAuthorizationIamOperator {
	/**
	 * Evaluates one condition key against the value it reads.
	 * @param {IApiAuthorizationIamCondition} condition - Condition key read by the grammar.
	 * @param {unknown} actual - Value the key reads: undefined when it is missing, null when a column holds NULL.
	 * @param {IApiAuthorizationIamOperand} operand - Operand of the key, from `readOperand`.
	 * @param {boolean} isColumn - Whether the value comes from a database column, and not from the request: a column may also hold a value only a database has, such as `NaN`, and its address keeps the family it was stored in.
	 * @returns {boolean | undefined} Whether the key holds, or undefined when the value cannot be read.
	 */
	public static evaluate(condition: IApiAuthorizationIamCondition, actual: unknown, operand: IApiAuthorizationIamOperand, isColumn: boolean): boolean | undefined {
		if (condition.family === EApiPolicyConditionOperatorFamily.NULL) {
			return (actual === undefined || actual === null) === operand.isTrue;
		}

		if (condition.isIfExists && actual === undefined) {
			return true;
		}

		const isHolding: boolean | undefined = ApiAuthorizationIamOperator.evaluatePositive(condition, actual, operand, isColumn);

		if (isHolding === undefined) {
			return undefined;
		}

		return condition.isNegated ? !isHolding : isHolding;
	}

	/**
	 * Folds A-Z to a-z and nothing else, as `lower(c COLLATE "C")` does.
	 * @param {string} text - Text to fold.
	 * @returns {string} The folded text.
	 */
	public static foldCase(text: string): string {
		return text.replaceAll(/[A-Z]/g, (letter: string): string => letter.toLowerCase());
	}

	/**
	 * Resolves the value of a condition key against the request, in the form its family compares.
	 * @param {IApiAuthorizationIamCondition} condition - Condition key read by the grammar.
	 * @param {unknown} context - Evaluation context with the `principal`, `request` and `resource` roots.
	 * @returns {IApiAuthorizationIamOperand | undefined} The operand, or undefined when a variable does not resolve or resolves to what the family cannot read, which fails the key closed.
	 */
	public static readOperand(condition: IApiAuthorizationIamCondition, context: unknown): IApiAuthorizationIamOperand | undefined {
		// The grammar gives a key one value until several values reach the engine.
		const value: IApiAuthorizationIamConditionValue | undefined = condition.values[0];

		if (!value) {
			return undefined;
		}

		switch (condition.family) {
			case EApiPolicyConditionOperatorFamily.ARN:
			// falls through

			case EApiPolicyConditionOperatorFamily.STRING_LIKE: {
				const pattern: Array<IApiAuthorizationIamToken> | undefined = ApiAuthorizationIamVariable.resolveTokens(typeof value.source === "string" ? value.parts : [{ type: EApiAuthorizationIamTokenType.LITERAL, value: String(value.source) }], context);

				return pattern ? { pattern } : undefined;
			}

			case EApiPolicyConditionOperatorFamily.BOOL:
			// falls through

			case EApiPolicyConditionOperatorFamily.NULL: {
				const isTrue: boolean | undefined = ApiAuthorizationIamOperator.readBoolean(ApiAuthorizationIamVariable.resolveValue(value, context));

				return isTrue === undefined ? undefined : { isTrue };
			}

			case EApiPolicyConditionOperatorFamily.DATE: {
				const date: IApiAuthorizationIamDateValue | undefined = ApiAuthorizationIamDateValue.parse(ApiAuthorizationIamVariable.resolveValue(value, context));

				return date ? { date } : undefined;
			}

			case EApiPolicyConditionOperatorFamily.IP_ADDRESS: {
				const resolved: unknown = ApiAuthorizationIamVariable.resolveValue(value, context);
				const network: IApiAuthorizationIamNetwork | undefined = typeof resolved === "string" ? ApiAuthorizationIamNetwork.parse(resolved) : undefined;

				if (!network) {
					return undefined;
				}

				// A value a request carries may be IPv4-mapped; one a document writes means what it says.
				return { network: value.parts.some((part: IApiAuthorizationIamToken): boolean => part.type === EApiAuthorizationIamTokenType.VARIABLE) ? ApiAuthorizationIamNetwork.unmap(network) : network };
			}

			case EApiPolicyConditionOperatorFamily.NUMERIC: {
				const decimal: IApiAuthorizationIamDecimal | undefined = ApiAuthorizationIamDecimal.parseOperand(ApiAuthorizationIamVariable.resolveValue(value, context));

				return decimal ? { decimal } : undefined;
			}

			case EApiPolicyConditionOperatorFamily.STRING: {
				const text: string | undefined = AuthorizationSerializeValue(ApiAuthorizationIamVariable.resolveValue(value, context));

				return text === undefined ? undefined : { text };
			}

			case EApiPolicyConditionOperatorFamily.STRING_IGNORE_CASE: {
				const text: string | undefined = AuthorizationSerializeValue(ApiAuthorizationIamVariable.resolveValue(value, context));

				return text === undefined ? undefined : { text: ApiAuthorizationIamOperator.foldCase(text) };
			}
		}
	}

	/**
	 * Tells whether an order satisfies a positive Numeric or Date operator.
	 * @param {IApiAuthorizationIamCondition} condition - Condition key read by the grammar.
	 * @param {number} order - -1, 0 or 1 as the value read is below, equal to or above the operand.
	 * @returns {boolean} Whether the positive operator holds.
	 */
	private static checkOrder(condition: IApiAuthorizationIamCondition, order: number): boolean {
		const comparison: EApiAuthorizationIamPredicateOperator | undefined = AUTHORIZATION_POLICY_CONDITION_OPERATOR_CONSTANT.OPERATORS.get(condition.operator)?.comparison;

		if (comparison === undefined) {
			return false;
		}

		switch (comparison) {
			case EApiAuthorizationIamPredicateOperator.EQUAL: {
				return order === 0;
			}

			case EApiAuthorizationIamPredicateOperator.GREATER_THAN: {
				return order > 0;
			}

			case EApiAuthorizationIamPredicateOperator.GREATER_THAN_EQUAL: {
				return order >= 0;
			}

			case EApiAuthorizationIamPredicateOperator.LESS_THAN: {
				return order < 0;
			}

			case EApiAuthorizationIamPredicateOperator.LESS_THAN_EQUAL: {
				return order <= 0;
			}

			case EApiAuthorizationIamPredicateOperator.NOT_EQUAL: {
				return order !== 0;
			}
		}
	}

	/**
	 * Evaluates the positive form of a Date operator.
	 * @param {IApiAuthorizationIamCondition} condition - Condition key read by the grammar.
	 * @param {unknown} actual - Value the key reads, neither missing nor NULL.
	 * @param {IApiAuthorizationIamDateValue} operand - Operand.
	 * @param {boolean} isColumn - Whether the value comes from a database column, which may hold an infinity.
	 * @returns {boolean | undefined} Whether the positive form holds, or undefined when the value cannot be read.
	 */
	private static evaluateDate(condition: IApiAuthorizationIamCondition, actual: unknown, operand: IApiAuthorizationIamDateValue, isColumn: boolean): boolean | undefined {
		if (isColumn && (actual === Number.POSITIVE_INFINITY || actual === Number.NEGATIVE_INFINITY)) {
			return ApiAuthorizationIamOperator.checkOrder(condition, actual === Number.POSITIVE_INFINITY ? 1 : -1);
		}

		const date: IApiAuthorizationIamDateValue | undefined = ApiAuthorizationIamDateValue.parse(actual);
		const order: number | undefined = date ? ApiAuthorizationIamDateValue.compare(date, operand) : undefined;

		return order === undefined ? undefined : ApiAuthorizationIamOperator.checkOrder(condition, order);
	}

	/**
	 * Evaluates the positive form of an IP operator.
	 * @param {unknown} actual - Value the key reads, neither missing nor NULL.
	 * @param {IApiAuthorizationIamNetwork} operand - Range.
	 * @param {boolean} isColumn - Whether the value comes from a database column, which may hold a network and keeps its family; a request holds one address, which may be IPv4-mapped.
	 * @returns {boolean | undefined} Whether the value lies within the range, or undefined when the value cannot be read.
	 */
	private static evaluateNetwork(actual: unknown, operand: IApiAuthorizationIamNetwork, isColumn: boolean): boolean | undefined {
		if (typeof actual !== "string" || (!isColumn && actual.includes("/"))) {
			return undefined;
		}

		const network: IApiAuthorizationIamNetwork | undefined = ApiAuthorizationIamNetwork.parse(actual);

		if (!network) {
			return undefined;
		}

		return ApiAuthorizationIamNetwork.isContained(operand, isColumn ? network : ApiAuthorizationIamNetwork.unmap(network));
	}

	/**
	 * Evaluates the positive form of a Numeric operator.
	 * @param {IApiAuthorizationIamCondition} condition - Condition key read by the grammar.
	 * @param {unknown} actual - Value the key reads, neither missing nor NULL.
	 * @param {IApiAuthorizationIamDecimal} operand - Operand.
	 * @param {boolean} isColumn - Whether the value comes from a database column: its number is what the column holds, and it may hold `NaN` or an infinity.
	 * @returns {boolean | undefined} Whether the positive form holds, or undefined when the value cannot be read.
	 */
	private static evaluateNumeric(condition: IApiAuthorizationIamCondition, actual: unknown, operand: IApiAuthorizationIamDecimal, isColumn: boolean): boolean | undefined {
		if (isColumn && IAM_OPERATOR_ABOVE_EVERY_NUMBER.has(actual)) {
			return ApiAuthorizationIamOperator.checkOrder(condition, 1);
		}

		if (isColumn && IAM_OPERATOR_BELOW_EVERY_NUMBER.has(actual)) {
			return ApiAuthorizationIamOperator.checkOrder(condition, -1);
		}

		const decimal: IApiAuthorizationIamDecimal | undefined = isColumn ? ApiAuthorizationIamDecimal.parse(actual) : ApiAuthorizationIamDecimal.parseOperand(actual);

		return decimal ? ApiAuthorizationIamOperator.checkOrder(condition, ApiAuthorizationIamDecimal.compare(decimal, operand)) : undefined;
	}

	/**
	 * Evaluates the positive form of an operator.
	 * @param {IApiAuthorizationIamCondition} condition - Condition key read by the grammar.
	 * @param {unknown} actual - Value the key reads.
	 * @param {IApiAuthorizationIamOperand} operand - Operand of the key.
	 * @param {boolean} isColumn - Whether the value comes from a database column.
	 * @returns {boolean | undefined} Whether the positive form holds, or undefined when the value cannot be read.
	 */
	private static evaluatePositive(condition: IApiAuthorizationIamCondition, actual: unknown, operand: IApiAuthorizationIamOperand, isColumn: boolean): boolean | undefined {
		const isAbsent: boolean = actual === undefined || actual === null;

		switch (condition.family) {
			case EApiPolicyConditionOperatorFamily.ARN: {
				const text: string | undefined = isAbsent ? undefined : AuthorizationSerializeValue(actual);

				if (isAbsent) {
					return false;
				}

				return text === undefined ? undefined : ApiAuthorizationIamGlob.isSegmentMatched(operand.pattern ?? [], text);
			}

			case EApiPolicyConditionOperatorFamily.BOOL: {
				const isTrue: boolean | undefined = ApiAuthorizationIamOperator.readBoolean(actual);

				if (isAbsent) {
					return false;
				}

				return isTrue === undefined ? undefined : isTrue === operand.isTrue;
			}

			case EApiPolicyConditionOperatorFamily.DATE: {
				if (isAbsent) {
					return false;
				}

				return operand.date ? ApiAuthorizationIamOperator.evaluateDate(condition, actual, operand.date, isColumn) : undefined;
			}

			case EApiPolicyConditionOperatorFamily.IP_ADDRESS: {
				if (isAbsent) {
					return false;
				}

				return operand.network ? ApiAuthorizationIamOperator.evaluateNetwork(actual, operand.network, isColumn) : undefined;
			}

			case EApiPolicyConditionOperatorFamily.NULL: {
				return undefined;
			}

			case EApiPolicyConditionOperatorFamily.NUMERIC: {
				if (isAbsent) {
					return false;
				}

				return operand.decimal ? ApiAuthorizationIamOperator.evaluateNumeric(condition, actual, operand.decimal, isColumn) : undefined;
			}

			case EApiPolicyConditionOperatorFamily.STRING: {
				const text: string | undefined = isAbsent ? "" : AuthorizationSerializeValue(actual);

				return text === undefined ? undefined : text === operand.text;
			}

			case EApiPolicyConditionOperatorFamily.STRING_IGNORE_CASE: {
				const text: string | undefined = isAbsent ? "" : AuthorizationSerializeValue(actual);

				return text === undefined ? undefined : ApiAuthorizationIamOperator.foldCase(text) === operand.text;
			}

			case EApiPolicyConditionOperatorFamily.STRING_LIKE: {
				const text: string | undefined = isAbsent ? "" : AuthorizationSerializeValue(actual);

				return text === undefined ? undefined : ApiAuthorizationIamGlob.isMatched(operand.pattern ?? [], text);
			}
		}
	}

	/**
	 * Reads a boolean strictly: `true`, `false` or that exact text.
	 * @param {unknown} value - Value to read.
	 * @returns {boolean | undefined} The boolean, or undefined when the value is none.
	 */
	private static readBoolean(value: unknown): boolean | undefined {
		if (typeof value === "boolean") {
			return value;
		}

		if (value === "true" || value === "false") {
			return value === "true";
		}

		return undefined;
	}
}
