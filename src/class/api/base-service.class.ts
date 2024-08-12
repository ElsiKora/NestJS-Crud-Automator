import { IApiGetListResponseResult } from "../../interface";
import {BaseEntity, type FindOptionsRelations} from "typeorm";
import {TApiFunctionCreateProperties, TApiFunctionGetListProperties, TApiFunctionUpdateProperties} from "../../type";
import {TApiFunctionGetProperties} from "../../type/api/function/get-properties.type";

export class BaseApiService<E extends BaseEntity> {
    getList(_properties: TApiFunctionGetListProperties<E>, _relations?: FindOptionsRelations<E>): Promise<IApiGetListResponseResult<E>> {
        return null as any;
    }

    get(_id: string, _properties?: TApiFunctionGetProperties<E>, _relations?: FindOptionsRelations<E>): Promise<E> {
        return null as any;
    }

    create(_properties: TApiFunctionCreateProperties<E>): Promise<E> {
        return null as any;
    }

    update(_id: string, _properties: TApiFunctionUpdateProperties<E>): Promise<E> {
        return null as any;
    }

    delete(_id: string): Promise<void> {
        return null as any;
    }
}
