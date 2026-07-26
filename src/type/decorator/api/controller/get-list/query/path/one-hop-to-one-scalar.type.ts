import type { TApiControllerGetListQueryScalarValue } from "./scalar-value.type";
import type { TApiControllerGetListQueryToOneRelation } from "./to-one-relation.type";

export type TApiControllerGetListQueryOneHopToOneScalarPath<E> = {
	[K in keyof E & string]: TApiControllerGetListQueryToOneRelation<E[K]> extends infer R
		? R extends object
			? {
					[N in keyof R & string]: NonNullable<R[N]> extends TApiControllerGetListQueryScalarValue ? `${K}.${N}` : never;
				}[keyof R & string]
			: never
		: never;
}[keyof E & string];
