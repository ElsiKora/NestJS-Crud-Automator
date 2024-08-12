
import type { NestInterceptor, Type } from '@nestjs/common';
import type {FindOptionsRelations, ObjectLiteral} from 'typeorm';
import {EApiRouteType} from "../../../enum/decorator/api/controller/type.enum";

interface RouteBaseOption {
    decorators?: Array<PropertyDecorator | MethodDecorator>;
    interceptors?: Array<Type<NestInterceptor>>;
    swagger?: {
        hide?: boolean;
        response?: Type<unknown>;
        body?: Type<unknown>;
    };
    exclude?: string[];
}

export interface IApiControllerProperties<E> {
    entity: ObjectLiteral;
    routes?: {
        [EApiRouteType.GET]?: {
            /**
             * Array of path parameters to use for the route
             *
             * @example
             * ```ts
             * params: ['id', 'subId']
             * ```
             * It will generate the route `/:id/:subId`
             */
            params?: string[];
            /**
             * If set to true, soft-deleted entity could be included in the result.
             * @default false
             */
            softDelete?: boolean;
            /**
             * @default false
             */
            relations?: FindOptionsRelations<E>;
        } & RouteBaseOption;
    };
    only?: Array<EApiRouteType | `${EApiRouteType}`>;
}
