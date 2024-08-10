import type { EApiPropertyDataType } from "../../../../enum";
import type { IApiPropertyBaseProperties } from "./base-properties.interface";

export interface IApiPropertyStringProperties<T> extends IApiPropertyBaseProperties<T> {
	example: Array<string> | string;
	format: EApiPropertyDataType;
	maxLength?: number;
	minLength?: number;
	pattern: string;
	type: EApiPropertyDataType;
}
