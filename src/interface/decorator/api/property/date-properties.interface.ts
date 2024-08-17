import type { IApiPropertyBaseProperties } from "./base-properties.interface";
import type { EApiPropertyDateType } from "../../../../enum";

export interface IApiPropertyDateProperties<T> extends IApiPropertyBaseProperties<T> {
	type: EApiPropertyDateType;
}
