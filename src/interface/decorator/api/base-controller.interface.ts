    import {TApiFunctionGetProperties} from "../../../type";
    import {BaseApiService} from "../../../class";
    import {BaseEntity} from "typeorm";


    export interface BaseApiController<E extends BaseEntity> {
        service: BaseApiService<E>;
        get?(parameters: TApiFunctionGetProperties<E>): Promise<E>;
    }
