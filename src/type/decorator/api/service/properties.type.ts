import type { TApiServiceFunctionPropertiesMap } from "@type/decorator/api/service/function";

export type TApiServiceProperties<E> = {
	entity: new () => E;
	functions?: TApiServiceFunctionPropertiesMap;
};
