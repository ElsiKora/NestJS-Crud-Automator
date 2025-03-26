import type { EErrorStringAction } from "@enum/utility";

export interface IErrorStringProperties<T> {
	entity: T;
	type: EErrorStringAction;
}
