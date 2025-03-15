import { HttpStatus, RequestMethod } from "@nestjs/common";
import { ApiMethod } from "../../../decorator/api/method.decorator";
import { EApiAction, EApiDtoType, EApiRouteType } from "../../../enum";
import { DtoGenerate } from "../../dto/generate.utility";
import { ErrorException } from "../../error-exception.utility";
export function ApiControllerApplyDecorators(targetMethod, entity, properties, method, methodName, routeConfig, decorators) {
    const responseDto = routeConfig.dto?.response ?? DtoGenerate(properties.entity, entity, method, EApiDtoType.RESPONSE, routeConfig.autoDto?.[EApiDtoType.RESPONSE], routeConfig.authentication?.guard);
    const customDecorators = [...decorators];
    switch (method) {
        case EApiRouteType.CREATE: {
            customDecorators.push(ApiMethod({ action: EApiAction.CREATE, authentication: routeConfig.authentication, entity: properties.entity, httpCode: HttpStatus.CREATED, method: RequestMethod.POST, path: "", responses: { hasInternalServerError: true, hasUnauthorized: true }, responseType: responseDto }));
            break;
        }
        case EApiRouteType.DELETE: {
            customDecorators.push(ApiMethod({ action: EApiAction.DELETE, authentication: routeConfig.authentication, entity: properties.entity, httpCode: HttpStatus.NO_CONTENT, method: RequestMethod.DELETE, path: `:${String(entity.primaryKey?.name)}`, responses: { hasInternalServerError: true, hasNotFound: true, hasUnauthorized: true }, responseType: undefined }));
            break;
        }
        case EApiRouteType.GET: {
            customDecorators.push(ApiMethod({
                action: EApiAction.FETCH,
                authentication: routeConfig.authentication,
                entity: properties.entity,
                httpCode: HttpStatus.OK,
                method: RequestMethod.GET,
                path: `:${String(entity.primaryKey?.name)}`,
                responses: { hasInternalServerError: true, hasNotFound: true, hasUnauthorized: true },
                responseType: responseDto,
            }));
            break;
        }
        case EApiRouteType.GET_LIST: {
            customDecorators.push(ApiMethod({
                action: EApiAction.FETCH_LIST,
                authentication: routeConfig.authentication,
                entity: properties.entity,
                httpCode: HttpStatus.OK,
                method: RequestMethod.GET,
                path: "",
                responses: { hasInternalServerError: true, hasNotFound: true, hasUnauthorized: true },
                responseType: responseDto,
            }));
            break;
        }
        case EApiRouteType.PARTIAL_UPDATE: {
            customDecorators.push(ApiMethod({ action: EApiAction.UPDATE, authentication: routeConfig.authentication, entity: properties.entity, httpCode: HttpStatus.OK, method: RequestMethod.PATCH, path: `:${String(entity.primaryKey?.name)}`, responses: { hasBadRequest: true, hasInternalServerError: true, hasNotFound: true, hasUnauthorized: true }, responseType: responseDto }));
            break;
        }
        case EApiRouteType.UPDATE: {
            customDecorators.push(ApiMethod({ action: EApiAction.UPDATE, authentication: routeConfig.authentication, entity: properties.entity, httpCode: HttpStatus.OK, method: RequestMethod.PUT, path: `:${String(entity.primaryKey?.name)}`, responses: { hasBadRequest: true, hasInternalServerError: true, hasNotFound: true, hasUnauthorized: true }, responseType: responseDto }));
            break;
        }
        default: {
            throw ErrorException(`Method ${method} not implemented`);
        }
    }
    if (customDecorators.length > 0) {
        for (const decorator of customDecorators) {
            const descriptor = Reflect.getOwnPropertyDescriptor(targetMethod, methodName);
            decorator(targetMethod, methodName, descriptor ?? { value: targetMethod });
        }
    }
}
//# sourceMappingURL=apply-decorators.utility.js.map