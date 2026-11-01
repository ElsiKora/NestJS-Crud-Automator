import type { ValueTransformer } from "typeorm";

import { FindOperator } from "typeorm";

/**
 * Find operator whose operands already went through the column transformer.
 * TypeORM runs the column transformer over the find operator of a transformed column, so this operator skips exactly that transformer.
 * Every other transformation, such as the parameter typing of the MSSQL driver, still reaches the operands.
 * @template T The operand type
 */
export class ApiFunctionBoundOperator<T> extends FindOperator<T> {
	private readonly COLUMN_TRANSFORMER: Array<ValueTransformer> | undefined | ValueTransformer;

	/**
	 * Creates an operator over bound operands, shaped like the operator they came from.
	 * @param {T | FindOperator<T>} value - Bound operands or nested bound operator
	 * @param {Array<ValueTransformer> | ValueTransformer | undefined} columnTransformer - Column transformer the operands already went through
	 * @param {FindOperator<unknown>} [source] - Operator the operands came from; an equality when there is none
	 */
	constructor(value: FindOperator<T> | T, columnTransformer: Array<ValueTransformer> | undefined | ValueTransformer, source?: FindOperator<unknown>) {
		super(source?.type ?? "equal", value, source?.useParameter, source?.multipleParameters, source?.getSql, source?.objectLiteralParameters);
		this.COLUMN_TRANSFORMER = columnTransformer;
	}

	/**
	 * Transforms the operands unless the transformer is the column transformer they already went through.
	 * @param {Array<ValueTransformer> | ValueTransformer} transformer - Transformer TypeORM or the driver applies
	 */
	public override transformValue(transformer: Array<ValueTransformer> | ValueTransformer): void {
		if (transformer !== this.COLUMN_TRANSFORMER) {
			super.transformValue(transformer);
		}
	}
}
