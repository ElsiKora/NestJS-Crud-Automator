export type TCapitalizeString<S extends string> = S extends `${infer F}${infer R}` ? `${Uppercase<F>}${R}` : S;
