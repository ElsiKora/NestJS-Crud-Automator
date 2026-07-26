import type { TDateKeys } from "@type/utility/date";

export type TNonDateKeys<E> = Omit<E, keyof TDateKeys<E>>;
