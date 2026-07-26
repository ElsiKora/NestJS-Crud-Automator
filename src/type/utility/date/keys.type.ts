export type TDateKeys<E> = keyof {
	[P in keyof E as E[P] extends Date ? P : never]: E[P];
} &
	string;
