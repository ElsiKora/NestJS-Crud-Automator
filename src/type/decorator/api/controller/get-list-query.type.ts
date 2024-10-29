import type { PickKeysByType } from "typeorm/common/PickKeysByType";

type TDateKeys<E> = PickKeysByType<E, Date>;

type TDateRangeKeys<E> = {
	[K in keyof TDateKeys<E> as `${string & K}From` | `${string & K}To`]: Date;
};

type TNonDateKeys<E> = Omit<E, keyof PickKeysByType<E, Date>>;

export type TApiControllersGetListQuery<E> = Partial<TNonDateKeys<E>> &
	TDateRangeKeys<E> & {
		limit: number;
		page: number;
	};
