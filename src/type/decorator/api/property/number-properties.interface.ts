import type { EApiPropertyDataType } from "../../../../enum";
import {TApiPropertyBaseProperties} from "./base-properties.type";

export type TApiPropertyNumberProperties<T> = TApiPropertyBaseProperties<T> & {
	example?: number;
	maximum: number;
	minimum: number;
	multipleOf: number;
	type: EApiPropertyDataType;
}
