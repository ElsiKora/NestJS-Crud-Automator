import type { EApiRouteType } from "@enum/decorator/api";
import type { IApiControllerReadPlan, IApiControllerReadPlanParameter } from "@interface/class/api/controller/read";
import type { IApiControllerPropertiesRouteAutoDtoConfig } from "@interface/decorator/api";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { EApiDtoType, EApiRouteType as EApiRouteTypeValue } from "@enum/decorator/api";
import { DtoBuildDecorator } from "@utility/dto/build-decorator.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { Validate } from "class-validator";

const readParametersDtoCache: WeakMap<IApiControllerReadPlan, Map<Type<IAuthGuard> | undefined, Map<IApiControllerPropertiesRouteAutoDtoConfig | undefined, Type<unknown>>>> = new WeakMap<IApiControllerReadPlan, Map<Type<IAuthGuard> | undefined, Map<IApiControllerPropertiesRouteAutoDtoConfig | undefined, Type<unknown>>>>();

/**
 * Generates a cached PARAMETERS DTO for route-local inherited read scope.
 * @template E - Entity type owned by the generated route.
 * @param {IApiEntity<E>} entityMetadata - Entity metadata used for field decorators.
 * @param {EApiRouteType} method - Generated GET or GET_LIST route type.
 * @param {IApiControllerReadPlan} readPlan - Validated route-local read plan.
 * @param {IApiControllerPropertiesRouteAutoDtoConfig} [dtoConfig] - Optional auto DTO validators.
 * @param {Type<IAuthGuard>} [currentGuard] - Authentication guard used for field exposure metadata.
 * @returns {Type<unknown>} Cached generated parameters DTO class.
 */
export function DtoGenerateReadParameters<E>(entityMetadata: IApiEntity<E>, method: EApiRouteType, readPlan: IApiControllerReadPlan, dtoConfig?: IApiControllerPropertiesRouteAutoDtoConfig, currentGuard?: Type<IAuthGuard>): Type<unknown> {
	let guardCache: Map<Type<IAuthGuard> | undefined, Map<IApiControllerPropertiesRouteAutoDtoConfig | undefined, Type<unknown>>> | undefined = readParametersDtoCache.get(readPlan);

	if (!guardCache) {
		guardCache = new Map<Type<IAuthGuard> | undefined, Map<IApiControllerPropertiesRouteAutoDtoConfig | undefined, Type<unknown>>>();
		readParametersDtoCache.set(readPlan, guardCache);
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

	const parameters: Array<IApiControllerReadPlanParameter> = [];

	if (method === EApiRouteTypeValue.GET) {
		const primaryKey: IApiEntityColumn<E> | undefined = entityMetadata.primaryKey;

		if (!primaryKey) {
			throw ErrorException(`Primary key for entity ${String(entityMetadata.name)} not found in metadata storage`);
		}

		parameters.push({ field: String(primaryKey.name), parameter: String(primaryKey.name) });
	}

	parameters.push(...readPlan.parameters);

	class GeneratedReadParametersDTO {
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

	Object.defineProperty(GeneratedReadParametersDTO, "name", { value: readPlan.schemaName });

	for (const parameter of parameters) {
		const column: IApiEntityColumn<E> | undefined = entityMetadata.columns.find((candidate: IApiEntityColumn<E>): boolean => String(candidate.name) === parameter.field);
		const metadata: TApiPropertyDescribeProperties | undefined = column?.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] as TApiPropertyDescribeProperties | undefined;

		if (!column || !metadata) {
			throw ErrorException(`Metadata for generated read scope field ${parameter.field} not found`);
		}

		const decorators: Array<PropertyDecorator> | undefined = DtoBuildDecorator(method, metadata, entityMetadata, EApiDtoType.PARAMETERS, parameter.parameter, currentGuard);

		if (decorators) {
			for (const decorator of decorators) {
				decorator(GeneratedReadParametersDTO.prototype, parameter.parameter);
			}
		}
	}

	if (dtoConfig?.validators) {
		for (const validator of dtoConfig.validators) {
			Validate(validator.constraintClass, validator.options)(GeneratedReadParametersDTO.prototype, "object");
		}
	}

	dtoConfigCache.set(dtoConfig, GeneratedReadParametersDTO);

	return GeneratedReadParametersDTO;
}
