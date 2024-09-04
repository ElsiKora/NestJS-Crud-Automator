export type TApiPropertyDescribeExampleProperties<T, TArrayT> = { example: T; isArray?: false } | { example: TArrayT; isArray: true };
