import type { TApiFilterAllowedTypes } from "./allowed-types.type";

export type TApiFilterExctractedAllowedTypes<T> = T extends TApiFilterAllowedTypes ? T : never;
