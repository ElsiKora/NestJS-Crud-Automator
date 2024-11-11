import type { TDateKeys } from "./date-keys.type";

export type TDateRangeKeys<E> = {
	[K in keyof TDateKeys<E> as `${K & string}From` | `${K & string}To`]: Date;
};
