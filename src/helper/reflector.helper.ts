import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
import {
    CUSTOM_ROUTE_ARGS_METADATA,
    INTERCEPTORS_METADATA,
    METHOD_METADATA,
    PARAMTYPES_METADATA,
    PATH_METADATA,
    ROUTE_ARGS_METADATA,
} from '@nestjs/common/constants';
import { ArgumentsHost } from '@nestjs/common';
const PARSED_CRUD_REQUEST_KEY = 'parsedCrudRequest';
import {EApiRouteType} from "../enum/decorator/api/controller/type.enum";

export class R {
    static set(metadataKey: any, metadataValue: any, target: any, propertyKey?: string | symbol) {
        if (propertyKey) {
            Reflect.defineMetadata(metadataKey, metadataValue, target, propertyKey);
        } else {
            Reflect.defineMetadata(metadataKey, metadataValue, target);
        }
    }

    static get<T extends any>(metadataKey: any, target: any, propertyKey?: string | symbol): T {
        return propertyKey
            ? Reflect.getMetadata(metadataKey, target, propertyKey)
            : Reflect.getMetadata(metadataKey, target);
    }

    static setParsedRequestArg(index: number) {
        return R.createCustomRouteArg(PARSED_CRUD_REQUEST_KEY, index);
    }

    static createCustomRouteArg(
        paramtype: string,
        index: number,
        pipes: any[] = [],
        data = undefined,
    ): any {
        return {
					[`${paramtype}${CUSTOM_ROUTE_ARGS_METADATA}:${index}`]: {
						index,
						factory: (_: any, ctx: ArgumentsHost) => R.getContextRequest(ctx)[paramtype],
						data,
						pipes,
					},
				};
    }

    static createRouteArg(
        paramtype: RouteParamtypes,
        index: number,
        pipes: any[] = [],
        data?: string | undefined,
    ): any {
        return {
            [`${paramtype}:${index}`]: {
                index,
                pipes,
                data,
            },
        };
    }

    static setDecorators(decorators: (PropertyDecorator | MethodDecorator)[], target: any, name: string) {
        // this makes metadata decorator works
        const decoratedDescriptor = Reflect.decorate(
            decorators,
            target,
            name,
            Reflect.getOwnPropertyDescriptor(target, name),
        );

        // this makes proxy decorator works
        Reflect.defineProperty(target, name, decoratedDescriptor);
    }

    static setBodyArg(index: number, /* istanbul ignore next */ pipes: any[] = []) {
        return R.createRouteArg(RouteParamtypes.BODY, index, pipes);
    }


    static setRoute(route: EApiRouteType, method: string, func: unknown) {
        R.set(PATH_METADATA, route, func);
        R.set(METHOD_METADATA, method, func);
    }

    static setInterceptors(interceptors: any[], func: unknown) {
        R.set(INTERCEPTORS_METADATA, interceptors, func);
    }

    static setRouteArgs(metadata: any, target: any, name: string) {
        R.set(ROUTE_ARGS_METADATA, metadata, target, name);
    }

    static setRouteArgsTypes(metadata: any, target: any, name: string) {
        R.set(PARAMTYPES_METADATA, metadata, target, name);
    }

    static getInterceptors(func: unknown): any[] {
        return R.get(INTERCEPTORS_METADATA, func) || [];
    }

    static getRouteArgs(target: any, name: string): any {
        return R.get(ROUTE_ARGS_METADATA, target, name);
    }

    static getRouteArgsTypes(target: any, name: string): any[] {
        return R.get(PARAMTYPES_METADATA, target, name) || /* istanbul ignore next */ [];
    }

    static getContextRequest(ctx: ArgumentsHost): any {
        return typeof ctx.switchToHttp === "function" ? ctx.switchToHttp().getRequest() : ctx;
    }
}
