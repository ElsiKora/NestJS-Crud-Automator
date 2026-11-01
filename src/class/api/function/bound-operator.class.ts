import { FindOperator } from "typeorm";

/**
 * Find operator whose operands are already bound for the database.
 * TypeORM runs the column transformer over the find operator of a transformed column, so this operator keeps its operands as they are.
 * @template T The operand type
 */
export class ApiFunctionBoundOperator<T> extends FindOperator<T> {
	/**
	 * Keeps the operands, which already went through the column transformer.
	 */
	public override transformValue(): void {
		// The operands already went through the column transformer.
	}
}
