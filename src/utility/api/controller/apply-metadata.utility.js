import { assignMetadata } from "@nestjs/common";
import { PARAMTYPES_METADATA, ROUTE_ARGS_METADATA } from "@nestjs/common/constants";
import { RouteParamtypes } from "@nestjs/common/enums/route-paramtypes.enum";
import { EApiDtoType } from "../../../enum";
import { DtoGenerate } from "../../dto";
export function ApiControllerApplyMetadata(target, targetPrototype, entity, properties, method, methodName, routeConfig) {
    let parameterIndex = 0;
    let routeArgumentsMetadata = {};
    const parameterTypes = [];
    const requestDto = routeConfig.dto?.request ?? DtoGenerate(properties.entity, entity, method, EApiDtoType.REQUEST, routeConfig.autoDto?.[EApiDtoType.REQUEST], routeConfig.authentication?.guard);
    const queryDto = routeConfig.dto?.query ?? DtoGenerate(properties.entity, entity, method, EApiDtoType.QUERY, routeConfig.autoDto?.[EApiDtoType.QUERY], routeConfig.authentication?.guard);
    const bodyDto = routeConfig.dto?.body ?? DtoGenerate(properties.entity, entity, method, EApiDtoType.BODY, routeConfig.autoDto?.[EApiDtoType.BODY], routeConfig.authentication?.guard);
    if (requestDto) {
        routeArgumentsMetadata = assignMetadata(routeArgumentsMetadata, RouteParamtypes.PARAM, parameterIndex);
        parameterTypes.push(requestDto);
        parameterIndex++;
    }
    if (queryDto) {
        routeArgumentsMetadata = assignMetadata(routeArgumentsMetadata, RouteParamtypes.QUERY, parameterIndex);
        parameterTypes.push(queryDto);
        parameterIndex++;
    }
    if (bodyDto) {
        routeArgumentsMetadata = assignMetadata(routeArgumentsMetadata, RouteParamtypes.BODY, parameterIndex);
        parameterTypes.push(bodyDto);
        parameterIndex++;
    }
    routeArgumentsMetadata = assignMetadata(routeArgumentsMetadata, RouteParamtypes.HEADERS, parameterIndex);
    parameterTypes.push(Object);
    parameterIndex++;
    routeArgumentsMetadata = assignMetadata(routeArgumentsMetadata, RouteParamtypes.IP, parameterIndex);
    parameterTypes.push(Object);
    parameterIndex++;
    if (routeConfig.authentication) {
        routeArgumentsMetadata = assignMetadata(routeArgumentsMetadata, RouteParamtypes.REQUEST, parameterIndex);
        parameterTypes.push(Object);
        parameterIndex++;
    }
    Reflect.defineMetadata(ROUTE_ARGS_METADATA, routeArgumentsMetadata, target, methodName);
    Reflect.defineMetadata(PARAMTYPES_METADATA, parameterTypes, targetPrototype, methodName);
}
//# sourceMappingURL=apply-metadata.utility.js.map