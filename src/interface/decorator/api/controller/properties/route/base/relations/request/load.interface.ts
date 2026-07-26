import type { FindOneOptions, FindOptionsRelations } from "typeorm";

export interface IApiControllerPropertiesRouteBaseRelationsRequestLoad<E> {
	include: FindOptionsRelations<E>;
	locks?: Partial<Record<keyof FindOptionsRelations<E>, NonNullable<FindOneOptions<E>["lock"]>>>;
	relationLoadStrategy?: FindOneOptions<E>["relationLoadStrategy"];
	services?: Partial<Record<keyof FindOptionsRelations<E>, string>>;
}
