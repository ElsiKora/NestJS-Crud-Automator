import type { BaseApiService } from "../../../../class";

export type TApiServiceKeys<E> = {
	[K in Extract<keyof E, string> as `${K}Service`]: BaseApiService<any>;
};
