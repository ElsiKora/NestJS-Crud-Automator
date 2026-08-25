import type { IApiControllerIdentityPlan } from "@interface/class/api/controller/identity-plan.interface";
import type { IApiControllerReadPlan, IApiControllerReadPlanParameter } from "@interface/class/api/controller/read";
import type { IApiControllerPropertiesRouteAutoDtoConfig } from "@interface/decorator/api";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { createHash } from "node:crypto";

import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import { DtoBuildDecorator } from "@utility/dto/build-decorator.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { Validate } from "class-validator";

const NO_READ_PLAN: object = Object.freeze({});
const identityParametersDtoCache: WeakMap<IApiControllerIdentityPlan, WeakMap<object, Map<Type<IAuthGuard> | undefined, Map<IApiControllerPropertiesRouteAutoDtoConfig | undefined, Type<unknown>>>>> = new WeakMap<IApiControllerIdentityPlan, WeakMap<object, Map<Type<IAuthGuard> | undefined, Map<IApiControllerPropertiesRouteAutoDtoConfig | undefined, Type<unknown>>>>>();

/**
 * Generates a PARAMETERS DTO for a GET identity alias and optional inherited read scope.
 * @param {IApiEntity<E>} entityMetadata - Entity metadata supplying field decorators.
 * @param {IApiControllerIdentityPlan} identityPlan - Compiled identity alias plan.
 * @param {IApiControllerReadPlan} [readPlan] - Optional compiled owner-scope plan.
 * @param {IApiControllerPropertiesRouteAutoDtoConfig} [dtoConfig] - Auto DTO validators.
 * @param {Type<IAuthGuard>} [currentGuard] - Route authentication guard.
 * @returns {Type<unknown>} Generated PARAMETERS DTO.
 * @template E - Entity type.
 */
export function DtoGenerateIdentityReadParameters<E>(entityMetadata: IApiEntity<E>, identityPlan: IApiControllerIdentityPlan, readPlan?: IApiControllerReadPlan, dtoConfig?: IApiControllerPropertiesRouteAutoDtoConfig, currentGuard?: Type<IAuthGuard>): Type<unknown> {
	let readPlanCache: undefined | WeakMap<object, Map<Type<IAuthGuard> | undefined, Map<IApiControllerPropertiesRouteAutoDtoConfig | undefined, Type<unknown>>>> = identityParametersDtoCache.get(identityPlan);

	if (!readPlanCache) {
		readPlanCache = new WeakMap<object, Map<Type<IAuthGuard> | undefined, Map<IApiControllerPropertiesRouteAutoDtoConfig | undefined, Type<unknown>>>>();
		identityParametersDtoCache.set(identityPlan, readPlanCache);
	}

	const readPlanKey: object = readPlan ?? NO_READ_PLAN;
	let guardCache: Map<Type<IAuthGuard> | undefined, Map<IApiControllerPropertiesRouteAutoDtoConfig | undefined, Type<unknown>>> | undefined = readPlanCache.get(readPlanKey);

	if (!guardCache) {
		guardCache = new Map<Type<IAuthGuard> | undefined, Map<IApiControllerPropertiesRouteAutoDtoConfig | undefined, Type<unknown>>>();
		readPlanCache.set(readPlanKey, guardCache);
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

	const parameters: Array<IApiControllerReadPlanParameter> = [{ field: identityPlan.field, parameter: identityPlan.parameter }, ...(readPlan?.parameters ?? [])];

	class GeneratedIdentityReadParametersDTO {
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

	const combinedSignature: string | undefined = readPlan ? createHash("sha256").update(identityPlan.signature).update(":").update(readPlan.signature).digest("hex") : undefined;
	const schemaName: string = readPlan ? `${identityPlan.controllerName}${entityMetadata.name ?? "UnknownResource"}GetParameters${combinedSignature}DTO` : identityPlan.schemaName;

	Object.defineProperty(GeneratedIdentityReadParametersDTO, "name", { value: schemaName });

	for (const parameter of parameters) {
		const column: IApiEntityColumn<E> | undefined = entityMetadata.columns.find((candidate: IApiEntityColumn<E>): boolean => String(candidate.name) === parameter.field);
		const metadata: TApiPropertyDescribeProperties | undefined = column?.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] as TApiPropertyDescribeProperties | undefined;

		if (!column || !metadata || metadata.isAutoDtoEnabled === false) {
			throw ErrorException(`Metadata for generated identity/read field ${parameter.field} not found`);
		}

		const decorators: Array<PropertyDecorator> | undefined = DtoBuildDecorator(EApiRouteType.GET, metadata, entityMetadata, EApiDtoType.PARAMETERS, parameter.parameter, currentGuard);

		if (decorators) {
			for (const decorator of decorators) {
				decorator(GeneratedIdentityReadParametersDTO.prototype, parameter.parameter);
			}
		}
	}

	if (dtoConfig?.validators) {
		for (const validator of dtoConfig.validators) {
			Validate(validator.constraintClass, validator.options)(GeneratedIdentityReadParametersDTO.prototype, "object");
		}
	}

	dtoConfigCache.set(dtoConfig, GeneratedIdentityReadParametersDTO);

	return GeneratedIdentityReadParametersDTO;
}
