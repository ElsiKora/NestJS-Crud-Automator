import type { EApiPropertyDateType } from "../../../../enum";
import type { IApiPropertyBaseProperties } from "./base-properties.interface";

export interface IApiPropertyDateProperties<T> extends IApiPropertyBaseProperties<T> {
	type: EApiPropertyDateType;
}
