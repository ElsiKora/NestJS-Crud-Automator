import { HttpStatus, RequestMethod } from "@nestjs/common";

import { EApiAction, EApiDtoType, EApiRouteType } from "../../../enum";

import { DtoGenerate } from "../../dto";
import { ErrorException } from "../../error-exception.utility";

import type { IApiControllerProperties, IApiEntity } from "../../../interface";
import type { TApiControllerPropertiesRoute } from "../../../type";
import type { Type } from "@nestjs/common";
import {ApiMethod} from "../../../decorator";

export function ApiControllerApplyDecorators<E>(targetMethod: (properties: any, body: any, headers: any, ip: any, authenticationRequest: any) => any, entity: IApiEntity<E>, properties: IApiControllerProperties<E>, method: EApiRouteType, methodName: string, routeConfig: TApiControllerPropertiesRoute<E, typeof method>, decorators: Array<MethodDecorator> | Array<PropertyDecorator>): void {
	const responseDto: Type<unknown> | undefined = routeConfig.dto?.response || DtoGenerate(properties.entity, entity, method, EApiDtoType.RESPONSE, routeConfig.autoDto?.[EApiDtoType.RESPONSE], routeConfig.authentication?.guard);
	const customDecorators: Array<MethodDecorator> = [...decorators];

	switch (method) {
		case EApiRouteType.GET: {
			customDecorators.push(
				ApiMethod({
					action: EApiAction.FETCH,
					authentication: routeConfig.authentication,
					entity: properties.entity,
					httpCode: HttpStatus.OK,
					method: RequestMethod.GET,
					path: `:${entity.primaryKey!.name as string}`,
					responses: { internalServerError: true, notFound: true, unauthorized: true },
					responseType: responseDto,
				}),
			);

			break;
		}

		case EApiRouteType.GET_LIST: {
			customDecorators.push(
				ApiMethod({
					action: EApiAction.FETCH_LIST,
					authentication: routeConfig.authentication,
					entity: properties.entity,
					httpCode: HttpStatus.OK,
					method: RequestMethod.GET,
					path: "",
					responses: { internalServerError: true, notFound: true, unauthorized: true },
					responseType: responseDto,
				}),
			);

			break;
		}

		case EApiRouteType.CREATE: {
			customDecorators.push(ApiMethod({ action: EApiAction.CREATE, authentication: routeConfig.authentication, entity: properties.entity, httpCode: HttpStatus.CREATED, method: RequestMethod.POST, path: "", responses: { internalServerError: true, unauthorized: true }, responseType: responseDto }));

			break;
		}

		case EApiRouteType.UPDATE: {
			customDecorators.push(ApiMethod({ action: EApiAction.UPDATE, authentication: routeConfig.authentication, entity: properties.entity, httpCode: HttpStatus.OK, method: RequestMethod.PUT, path: `:${entity.primaryKey!.name as string}`, responses: { badRequest: true, internalServerError: true, notFound: true, unauthorized: true }, responseType: responseDto }));

			break;
		}

		case EApiRouteType.PARTIAL_UPDATE: {
			customDecorators.push(ApiMethod({ action: EApiAction.UPDATE, authentication: routeConfig.authentication, entity: properties.entity, httpCode: HttpStatus.OK, method: RequestMethod.PATCH, path: `:${entity.primaryKey!.name as string}`, responses: { badRequest: true, internalServerError: true, notFound: true, unauthorized: true }, responseType: responseDto }));

			break;
		}

		case EApiRouteType.DELETE: {
			customDecorators.push(ApiMethod({ action: EApiAction.DELETE, authentication: routeConfig.authentication, entity: properties.entity, httpCode: HttpStatus.NO_CONTENT, method: RequestMethod.DELETE, path: `:${entity.primaryKey!.name as string}`, responses: { internalServerError: true, notFound: true, unauthorized: true }, responseType: undefined }));

			break;
		}

		default: {
			throw ErrorException(`Method ${method as string} not implemented`);
		}
	}

	if (customDecorators.length > 0) {
		for (const decorator of customDecorators) {
			console.log("TARGET METHOD", targetMethod);
			console.log("METHOD NAME", methodName);
			const descriptor: TypedPropertyDescriptor<any> | undefined = Reflect.getOwnPropertyDescriptor(targetMethod, methodName);
			(decorator as MethodDecorator | PropertyDecorator)(targetMethod, methodName, descriptor ?? { value: targetMethod });
		}
	}
}
