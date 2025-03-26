import type { TApiFilterExctractedAllowedTypes } from "@type/decorator/api/filter/extracted-allowed-types.type";

export type TApiFilterOrderBy<E> = {
	[K in Uppercase<keyof E & string> as TApiFilterExctractedAllowedTypes<E[keyof E & Lowercase<K>]> extends never ? never : K]: E[keyof E & Lowercase<K>];
};
