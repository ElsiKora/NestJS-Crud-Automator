import type { EApiPropertyDescribeType } from "@enum/decorator/api";
import type { EFilterOperand } from "@enum/filter";
import type { FindOperator } from "typeorm";

export interface IApiControllerGetListQueryOperator {
	/** Builds the condition of the operator; a LIKE family operator reads the driver type of the DataSource, so its client text matches itself there. */
	compile: (operand?: unknown, driverType?: string) => FindOperator<unknown>;
	kinds: ReadonlyArray<EApiPropertyDescribeType>;
	operand: EFilterOperand;
}
