import type { TApiFilterAllowedTypes } from "@type/decorator/api/filter/allowed-types.type";

export type TApiFilterExctractedAllowedTypes<T> = T extends TApiFilterAllowedTypes ? T : never;
