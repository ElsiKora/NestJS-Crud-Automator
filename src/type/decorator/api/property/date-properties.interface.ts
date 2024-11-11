import type { EApiPropertyDateType } from "../../../../enum";
import {TApiPropertyBaseProperties} from "./base-properties.type";

export type TApiPropertyDateProperties<T> = TApiPropertyBaseProperties<T> & {
	type: EApiPropertyDateType;
}
