import type { EApiRouteType } from "@enum/decorator/api";
import type { IApiControllerPathPlan, IApiControllerPathPlanParameter } from "@interface/class/api/controller/path";
import type { IApiControllerPropertiesRouteAutoDtoConfig } from "@interface/decorator/api";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { CanActivate, Type } from "@nestjs/common";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { EApiDtoType } from "@enum/decorator/api";
import { CamelCaseString } from "@utility/camel-case-string.utility";
import { DtoBuildDecorator } from "@utility/dto/build-decorator.utility";
import { DtoSchemaNameGetRouteOrigin } from "@utility/dto/schema-name/route-origin.utility";
import { DtoSetGeneratedName } from "@utility/dto/set-generated-name.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { Validate } from "class-validator";

const pathParametersDtoCache: WeakMap<IApiControllerPathPlan, Map<EApiRouteType, Map<Type<CanActivate> | undefined, Map<IApiControllerPropertiesRouteAutoDtoConfig | undefined, Type<unknown>>>>> = new WeakMap<IApiControllerPathPlan, Map<EApiRouteType, Map<Type<CanActivate> | undefined, Map<IApiControllerPropertiesRouteAutoDtoConfig | undefined, Type<unknown>>>>>();

/**
 * Generates the PARAMETERS DTO of a generated route whose path differs from the entity's primary key in declaration order.
 * @template E - Entity type owned by the generated route.
 * @param {IApiEntity<E>} entityMetadata - Entity metadata supplying field decorators.
 * @param {EApiRouteType} method - Generated route type.
 * @param {IApiControllerPathPlan} pathPlan - Compiled controller path plan, which owns the cached DTOs.
 * @param {ReadonlyArray<IApiControllerPathPlanParameter>} parameters - Path parameters of the route, in path order.
 * @param {string} schemaPrefix - Schema prefix of the controller that owns the route, from `ApiControllerGetSchemaPrefix`; it starts the DTO name.
 * @param {IApiControllerPropertiesRouteAutoDtoConfig} [dtoConfig] - Auto DTO validators.
 * @param {Type<CanActivate>} [currentGuard] - Route authentication guard.
 * @param {string} [schemaName] - DTO name, when it differs from the route's PARAMETERS DTO name.
 * @returns {Type<unknown>} Generated PARAMETERS DTO.
 */
export function DtoGeneratePathParameters<E>(entityMetadata: IApiEntity<E>, method: EApiRouteType, pathPlan: IApiControllerPathPlan, parameters: ReadonlyArray<IApiControllerPathPlanParameter>, schemaPrefix: string, dtoConfig?: IApiControllerPropertiesRouteAutoDtoConfig, currentGuard?: Type<CanActivate>, schemaName?: string): Type<unknown> {
	let routeCache: Map<EApiRouteType, Map<Type<CanActivate> | undefined, Map<IApiControllerPropertiesRouteAutoDtoConfig | undefined, Type<unknown>>>> | undefined = pathParametersDtoCache.get(pathPlan);

	if (!routeCache) {
		routeCache = new Map<EApiRouteType, Map<Type<CanActivate> | undefined, Map<IApiControllerPropertiesRouteAutoDtoConfig | undefined, Type<unknown>>>>();
		pathParametersDtoCache.set(pathPlan, routeCache);
	}

	let guardCache: Map<Type<CanActivate> | undefined, Map<IApiControllerPropertiesRouteAutoDtoConfig | undefined, Type<unknown>>> | undefined = routeCache.get(method);

	if (!guardCache) {
		guardCache = new Map<Type<CanActivate> | undefined, Map<IApiControllerPropertiesRouteAutoDtoConfig | undefined, Type<unknown>>>();
		routeCache.set(method, guardCache);
	}

	let dtoConfigCache: Map<IApiControllerPropertiesRouteAutoDtoConfig | undefined, Type<unknown>> | undefined = guardCache.get(currentGuard);

	if (!dtoConfigCache) {
		dtoConfigCache = new Map<IApiControllerPropertiesRouteAutoDtoConfig | undefined, Type<unknown>>();
		guardCache.set(currentGuard, dtoConfigCache);
	}

	const cached: Type<unknown> | undefined = dtoConfigCache.get(dtoConfig);

	if (cached) {
		return cached;
	}

	class GeneratedPathParametersDTO {
		constructor() {
			for (const parameter of parameters) {
				Object.defineProperty(this, parameter.parameter, {
					// eslint-disable-next-line @elsikora/typescript/naming-convention
					configurable: true,
					// eslint-disable-next-line @elsikora/typescript/naming-convention
					enumerable: true,
					value: undefined,
					// eslint-disable-next-line @elsikora/typescript/naming-convention
					writable: true,
				});
			}
		}
	}

	DtoSetGeneratedName(GeneratedPathParametersDTO, schemaName ?? `${schemaPrefix}${CamelCaseString(method)}ParametersDTO`, DtoSchemaNameGetRouteOrigin(schemaPrefix, method, EApiDtoType.PARAMETERS));

	for (const parameter of parameters) {
		const column: IApiEntityColumn<E> | undefined = entityMetadata.columns.find((candidate: IApiEntityColumn<E>): boolean => String(candidate.name) === parameter.field);
		const metadata: TApiPropertyDescribeProperties | undefined = column?.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] as TApiPropertyDescribeProperties | undefined;

		if (!column || !metadata || metadata.isAutoDtoEnabled === false) {
			throw ErrorException(`Metadata for generated path field ${parameter.field} not found`);
		}

		const decorators: Array<PropertyDecorator> | undefined = DtoBuildDecorator(method, metadata, entityMetadata, EApiDtoType.PARAMETERS, parameter.parameter, currentGuard);

		if (decorators) {
			for (const decorator of decorators) {
				decorator(GeneratedPathParametersDTO.prototype, parameter.parameter);
			}
		}
	}

	if (dtoConfig?.validators) {
		for (const validator of dtoConfig.validators) {
			Validate(validator.constraintClass, validator.options)(GeneratedPathParametersDTO.prototype, "object");
		}
	}

	dtoConfigCache.set(dtoConfig, GeneratedPathParametersDTO);

	return GeneratedPathParametersDTO;
}
