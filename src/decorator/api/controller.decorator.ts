import {applyDecorators, Controller, HttpStatus, Param, RequestMethod} from "@nestjs/common";
import {BaseEntity} from "typeorm";
import {ApiTags} from "@nestjs/swagger";
import {ApiMethod} from "./method.decorator";
import {EApiAction} from "../../enum";
import {PARAMTYPES_METADATA, PATH_METADATA} from "@nestjs/common/constants";

interface ApiControllerOptions<E extends BaseEntity> {
    entity: new () => E;
    dto: {
        request: any;
        response: any;
    };
}

export function ApiController<E extends BaseEntity>(options: ApiControllerOptions<E>) {
    const { entity } = options;
    return (target: any) => {
        applyDecorators(
            ApiTags(entity.name),
            Controller(entity.name.toLowerCase()),
        )(target);

        target.prototype.get = function (
            parameters: typeof options.dto.request,
            body: typeof options.dto.request
        ): Promise<E> {
            return this.service.get(parameters[entity.name.toLowerCase()], body);
        };

        applyDecorators(
            ApiMethod({
                action: EApiAction.FETCH,
                entity: options.entity,
                httpCode: HttpStatus.OK,
                method: RequestMethod.GET,
                path: `:bank`,
                responses: { internalServerError: true, notFound: true, unauthorized: true },
                responseType: options.dto.response
            }),
        )(target.prototype, 'get', Object.getOwnPropertyDescriptor(target.prototype, 'get'));



        Param()(target.prototype, 'get', 0);
        Reflect.defineMetadata(PARAMTYPES_METADATA, [options.dto.request], target.prototype, 'get');
        Reflect.defineMetadata(PATH_METADATA, ":bank", target.prototype, 'get');
    };
}
