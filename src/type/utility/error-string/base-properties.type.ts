import type { EErrorStringAction } from "@enum/utility";

export type TErrorStringBaseProperties<T> = {
	entity: T;
	type: EErrorStringAction;
};
