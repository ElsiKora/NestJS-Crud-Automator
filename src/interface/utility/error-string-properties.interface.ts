import type { EErrorStringAction } from "../../enum";

export interface IErrorStringProperties<T> {
	entity: T;
	type: EErrorStringAction;
}
