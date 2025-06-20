import type { ApiServiceBase } from "@class/api";

export type TApiServiceKeys<E> = {
	[K in Extract<keyof E, string> as `${K}Service`]: ApiServiceBase<E>;
};
