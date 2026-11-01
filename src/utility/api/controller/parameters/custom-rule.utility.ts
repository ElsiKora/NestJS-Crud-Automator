import type { IApiControllerParametersRule } from "@interface/class/api/controller";
import type { IApiEntity } from "@interface/entity";
import type { Type } from "@nestjs/common";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { EApiDtoType, EApiPropertyDescribeType, EApiRouteType } from "@enum/decorator/api";
import { DtoGenerateDecorator } from "@utility/dto/generate/decorator.utility";
import { DtoGetDecoratorConfig } from "@utility/dto/get/decorator-config.utility";
import { ErrorException } from "@utility/error/exception.utility";

import { API_CONTROLLER_PARAMETERS_SOURCE_METADATA_KEY } from "./dto/metadata-key.constant";

/**
 * Builds the path value rule of a securable custom route from the resource path placeholders that are path parameters of the route.
 * Each such placeholder must be a property of the route's PARAMETERS DTO copied from a described entity column with `ApiPropertyCopy`, so the guard converts it by the same column rule as a generated route.
 * @param {object} options - Route description.
 * @param {string} options.controllerName - Controller class name, used in the error message.
 * @param {Type<unknown> | undefined} options.dto - PARAMETERS DTO of the route.
 * @param {string} options.methodName - Handler name, used in the error message.
 * @param {ReadonlyArray<string>} options.pathParameters - Path parameter names of the controller and route paths.
 * @param {string} options.resourcePath - IAM resource path of the controller.
 * @returns {IApiControllerParametersRule | undefined} The rule, or undefined when no placeholder is a path parameter.
 * @throws {Error} When a placeholder that is a path parameter is not described by the PARAMETERS DTO.
 */
export function ApiControllerParametersBuildCustomRule(options: { controllerName: string; dto: Type<unknown> | undefined; methodName: string; pathParameters: ReadonlyArray<string>; resourcePath: string }): IApiControllerParametersRule | undefined {
	const placeholders: Array<string> = [...new Set([...options.resourcePath.matchAll(/\{([\w.-]+)\}/g)].map((match: RegExpExecArray): string => match[1] ?? ""))].filter((placeholder: string): boolean => options.pathParameters.includes(placeholder));

	if (placeholders.length === 0) {
		return undefined;
	}

	class CustomRoutePathValuesDTO {}

	for (const placeholder of placeholders) {
		const source: { entityMetadata: IApiEntity<unknown>; metadata: TApiPropertyDescribeProperties } | undefined = options.dto ? (Reflect.getMetadata(API_CONTROLLER_PARAMETERS_SOURCE_METADATA_KEY, options.dto.prototype as object, placeholder) as { entityMetadata: IApiEntity<unknown>; metadata: TApiPropertyDescribeProperties } | undefined) : undefined;

		if (!source || source.metadata.type === EApiPropertyDescribeType.OBJECT || source.metadata.type === EApiPropertyDescribeType.RELATION || (source.metadata as { isArray?: boolean }).isArray === true) {
			throw ErrorException(`Controller "${options.controllerName}" method "${options.methodName}" names the path parameter "${placeholder}" in its IAM resourcePath, but its PARAMETERS DTO does not describe it: copy the entity column with ApiPropertyCopy`);
		}

		const config: TApiPropertyDescribeDtoProperties = DtoGetDecoratorConfig(EApiRouteType.GET, source.metadata, EApiDtoType.PARAMETERS);
		DtoGenerateDecorator(source.metadata, source.entityMetadata, config, EApiRouteType.GET, EApiDtoType.PARAMETERS, placeholder)(CustomRoutePathValuesDTO.prototype, placeholder);
	}

	return { dto: CustomRoutePathValuesDTO };
}
