import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerProperties, IApiRouteMetadata } from "@interface/decorator/api";

import { METHOD_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { CONTROLLER_API_DECORATOR_CONSTANT } from "@constant/decorator/api/controller.constant";
import { EApiRouteType } from "@enum/decorator/api";
import { HttpStatus } from "@nestjs/common";
import { ApiForbiddenResponse } from "@nestjs/swagger";
import { ApiControllerGetMethodName } from "@utility/api/controller/get/method-name.utility";
import { DtoGenerateException } from "@utility/dto/generate/exception.utility";

/**
 * Declares `403` on the generated routes of a securable controller with an authorization block.
 * The authorization guard refuses them, and the handler refuses CREATE and UPDATE scope violations.
 * `@ApiController` and `@ApiControllerSecurable` both call it, so the result does not depend on the decorator order.
 * @param {object} target - Controller class.
 * @returns {void}
 */
export function ApiControllerApplyForbiddenResponse(target: object): void {
	const isSecurable: boolean = Boolean(Reflect.getMetadata(CONTROLLER_API_DECORATOR_CONSTANT.SECURABLE_METADATA_KEY, target));
	const properties: IApiControllerProperties<IApiBaseEntity> | undefined = Reflect.getMetadata(CONTROLLER_API_DECORATOR_CONSTANT.PROPERTIES_METADATA_KEY, target) as IApiControllerProperties<IApiBaseEntity> | undefined;

	if (!isSecurable || !properties?.authorization || typeof target !== "function") {
		return;
	}

	const decorator: MethodDecorator = ApiForbiddenResponse({ description: "Forbidden", type: DtoGenerateException(HttpStatus.FORBIDDEN) });

	for (const routeType of Object.values(EApiRouteType)) {
		const routeConfig: { generation?: { isEnabled?: boolean; shouldWriteToController?: boolean } } | undefined = properties.routes[routeType];

		if (routeConfig?.generation?.isEnabled === false || routeConfig?.generation?.shouldWriteToController === false) {
			continue;
		}

		const methodName: string = ApiControllerGetMethodName(routeType);
		const descriptor: PropertyDescriptor | undefined = findMethodDescriptor(target.prototype as object, methodName);

		if (typeof descriptor?.value !== "function") {
			continue;
		}

		const routeMetadata: IApiRouteMetadata<IApiBaseEntity> | undefined = Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, descriptor.value as object) as IApiRouteMetadata<IApiBaseEntity> | undefined;

		// Swagger joins the descriptions of a status declared twice, so declare it once
		if (!routeMetadata?.response || routeMetadata.response.errors?.hasForbidden) {
			continue;
		}

		decorator(target.prototype as object, methodName, descriptor);
		routeMetadata.response.errors = { ...routeMetadata.response.errors, hasForbidden: true };
	}
}

/**
 * Finds a method descriptor on a prototype or on one of its ancestors.
 * @param {object} prototype - Prototype to start from.
 * @param {string} methodName - Method name.
 * @returns {PropertyDescriptor | undefined} The first descriptor found.
 */
function findMethodDescriptor(prototype: object, methodName: string): PropertyDescriptor | undefined {
	for (let current: null | object = prototype; current && current !== Object.prototype; current = Object.getPrototypeOf(current) as null | object) {
		const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(current, methodName);

		if (descriptor) {
			return descriptor;
		}
	}

	return undefined;
}
