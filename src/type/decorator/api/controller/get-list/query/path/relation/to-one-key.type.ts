import type { TApiControllerGetListQueryToOneRelation } from "../to-one-relation.type";

/**
 * The properties of an entity that hold a to-one relation.
 */
export type TApiControllerGetListQueryRelationToOneKey<E> = {
	[K in keyof E & string]: [TApiControllerGetListQueryToOneRelation<E[K]>] extends [never] ? never : K;
}[keyof E & string];
