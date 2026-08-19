export type TApiControllerReadParameterTransformerWithStringKey<T> = T extends { key: unknown } ? { key: string } & Omit<T, "key"> : never;
