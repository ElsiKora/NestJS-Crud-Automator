import {BaseEntity} from "typeorm";
import {TApiFilterExctractedAllowedTypes} from "./extracted-allowed-types.type";

export type IApiFilterOrderBy<E extends BaseEntity> = {
    [K in Uppercase<string & keyof E> as TApiFilterExctractedAllowedTypes<E[Lowercase<K> & keyof E]> extends never ? never : K]: E[Lowercase<K> & keyof E];
};
