import type { TApiControllerGetListQueryScalarValue } from "./scalar-value.type";

export type TApiControllerGetListQueryDirectScalarPath<E> = {
	[K in keyof E & string]: NonNullable<E[K]> extends TApiControllerGetListQueryScalarValue ? K : never;
}[keyof E & string];
