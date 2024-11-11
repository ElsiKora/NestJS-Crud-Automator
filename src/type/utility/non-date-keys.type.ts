import type {PickKeysByType} from "typeorm/common/PickKeysByType";

export type TNonDateKeys<E> = Omit<E, keyof PickKeysByType<E, Date>>;
