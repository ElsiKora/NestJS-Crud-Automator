import type { EApiPropertyDescribeType } from "@enum/decorator/api";
import type { EFilterOperand } from "@enum/filter";
import type { FindOperator } from "typeorm";

export interface IApiControllerGetListQueryOperator {
	compile: (operand?: unknown) => FindOperator<unknown>;
	kinds: ReadonlyArray<EApiPropertyDescribeType>;
	operand: EFilterOperand;
}
