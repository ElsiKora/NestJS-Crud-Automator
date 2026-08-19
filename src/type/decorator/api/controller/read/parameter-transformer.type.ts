import type { TApiRequestTransformer } from "@type/api-request-transformer.type";

export type TApiControllerReadParameterTransformer<E> = TApiControllerReadParameterTransformerWithStringKey<TApiRequestTransformer<E>>;

type TApiControllerReadParameterTransformerWithStringKey<T> = T extends { key: unknown } ? { key: string } & Omit<T, "key"> : never;
