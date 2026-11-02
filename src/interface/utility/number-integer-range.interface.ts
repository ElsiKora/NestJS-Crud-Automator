import type { EApiPropertyNumberType } from "@enum/decorator/api";

export interface INumberIntegerRange {
	format: EApiPropertyNumberType;
	maximum: number;
	minimum: number;
}
