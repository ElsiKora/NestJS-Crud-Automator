import { IApiGetListResponseResult } from "../../interface";
import { BaseEntity } from "typeorm";
import {TApiFunctionGetListProperties} from "../../type";
import {TApiFunctionGetProperties} from "../../type/api/function/get-properties.type";

export class BaseApiService<E extends BaseEntity> {
    getList(_properties: TApiFunctionGetListProperties<E>): Promise<IApiGetListResponseResult<E>> {
        return null as any;
    }

    get(_id: string, _properties?: TApiFunctionGetProperties<E>): Promise<E> {
        return null as any;
    }
}
