import type { IApiPropertyBaseProperties } from "./base-properties.interface";
import type { EApiPropertyDataType } from "../../../../enum";

export interface IApiPropertyNumberProperties<T> extends IApiPropertyBaseProperties<T> {
	example?: number;
	maximum: number;
	minimum: number;
	multipleOf: number;
	type: EApiPropertyDataType;
}
