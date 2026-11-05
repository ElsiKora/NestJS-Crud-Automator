import { FindOperator } from "typeorm";

// SQL of each TypeORM operator that compares a related column with one bound value.
const API_SUBQUERY_FIND_OPERATOR_SQL: ReadonlyMap<string, string> = new Map<string, string>([
	["equal", "="],
	["lessThan", "<"],
	["lessThanOrEqual", "<="],
	["moreThan", ">"],
	["moreThanOrEqual", ">="],
]);

/**
 * Writes a TypeORM condition as SQL on a related column, where no query builder writes it. It writes equality, the
 * order comparisons, `IN`, `IS NULL`, `NOT` and raw SQL the library holds; a caller that accepts more passes what writes it.
 */
export class ApiSubqueryOperand {
	/**
	 * Writes one condition.
	 * @param {unknown} operand - Value or find operator.
	 * @param {string} expression - The related column.
	 * @param {Record<string, unknown>} parameters - Parameters of the subquery, which this adds to.
	 * @param {(value: unknown) => string} createName - Names the parameter of a bound value.
	 * @param {(operator: FindOperator<unknown>) => string | undefined} [renderOther] - Writes an operator this class does not.
	 * @returns {string | undefined} The SQL, or undefined for a condition nothing can write.
	 */
	public static render(operand: unknown, expression: string, parameters: Record<string, unknown>, createName: (value: unknown) => string, renderOther?: (operator: FindOperator<unknown>) => string | undefined): string | undefined {
		const bind = (value: unknown): string => {
			const name: string = createName(value);

			parameters[name] = value;

			return `:${name}`;
		};

		if (!(operand instanceof FindOperator)) {
			return `${expression} = ${bind(operand)}`;
		}

		const findOperator: FindOperator<unknown> = operand as FindOperator<unknown>;
		const comparison: string | undefined = API_SUBQUERY_FIND_OPERATOR_SQL.get(findOperator.type);

		if (comparison !== undefined) {
			return `${expression} ${comparison} ${bind(findOperator.value)}`;
		}

		if (findOperator.type === "in") {
			const values: Array<unknown> = findOperator.value as Array<unknown>;
			const name: string = createName(values);

			if (values.length === 0) {
				return "1=0";
			}

			parameters[name] = values;

			return `${expression} IN (:...${name})`;
		}

		if (findOperator.type === "isNull") {
			return `${expression} IS NULL`;
		}

		if (findOperator.type === "not") {
			const child: string | undefined = findOperator.child ? this.render(findOperator.child, expression, parameters, createName, renderOther) : undefined;

			return child === undefined ? undefined : `NOT (${child})`;
		}

		if (findOperator.type === "raw") {
			Object.assign(parameters, findOperator.objectLiteralParameters);

			return findOperator.getSql?.(expression);
		}

		return renderOther?.(findOperator);
	}
}
