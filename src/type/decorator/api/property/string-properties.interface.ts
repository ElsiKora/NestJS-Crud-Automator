import type { EApiPropertyDataType } from "../../../../enum";
import {TApiPropertyBaseProperties} from "./base-properties.type";

export type TApiPropertyStringProperties<T> = TApiPropertyBaseProperties<T> &{
	example: Array<string> | string;
	format: EApiPropertyDataType;
	maxLength?: number;
	minLength?: number;
	pattern: string;
	type: EApiPropertyDataType;
}
