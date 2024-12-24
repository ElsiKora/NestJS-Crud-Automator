import type { PickKeysByType } from "typeorm/common/PickKeysByType";

export type TDateKeys<E> = PickKeysByType<E, Date>;
