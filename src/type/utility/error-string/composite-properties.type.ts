import type { EErrorStringCompositeAction } from "@enum/utility";

export type TErrorStringCompositeProperties<T> = {
	entity: T;
	property: string;
	type: EErrorStringCompositeAction;
};
