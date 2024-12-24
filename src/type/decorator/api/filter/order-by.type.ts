import type { TApiFilterExctractedAllowedTypes } from "./extracted-allowed-types.type";

export type IApiFilterOrderBy<E> = {
	[K in Uppercase<keyof E & string> as TApiFilterExctractedAllowedTypes<E[keyof E & Lowercase<K>]> extends never ? never : K]: E[keyof E & Lowercase<K>];
};
