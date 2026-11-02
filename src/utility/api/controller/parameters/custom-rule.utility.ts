import type { IApiControllerParametersCustomRuleOptions } from "@interface/class/api/controller/parameters-custom-rule-options.interface";
import type { IApiControllerParametersRule } from "@interface/class/api/controller/parameters-rule.interface";
import type { IApiControllerParametersSource } from "@interface/class/api/controller/parameters-source.interface";
import type { TApiPropertyDescribeDtoProperties } from "@type/decorator/api/property";
import type { TManualDtoPropertyMetadata } from "@type/utility/dto/manual-property-metadata.type";

import { EApiDtoType, EApiPropertyDescribeType, EApiRouteType } from "@enum/decorator/api";
import { EManualDtoPropertyMetadataDecorator } from "@enum/utility/manual-dto-property-metadata-decorator.enum";
import { DtoGenerateDecorator } from "@utility/dto/generate/decorator.utility";
import { DtoGetDecoratorConfig } from "@utility/dto/get/decorator-config.utility";
import { GetManualDtoPropertyMetadata } from "@utility/dto/manual/property-metadata/get.utility";
import { ErrorException } from "@utility/error/exception.utility";

import { API_CONTROLLER_PARAMETERS_SOURCE_METADATA_KEY } from "./dto/metadata-key.constant";

const CUSTOM_RULES: WeakMap<object, Map<string, IApiControllerParametersRule | undefined>> = new WeakMap<object, Map<string, IApiControllerParametersRule | undefined>>();

/**
 * Builds the path value rule of a securable custom route from its path parameters that the route's PARAMETERS DTO describes or the IAM resource path names.
 * A property copied from a described entity column with `ApiPropertyCopy` is converted by the column rule, as on a generated route; a property described with a scalar `ApiProperty*` decorator is converted by that decorator's own rule. Either way the resource string and `request.parameters` conditions see its canonical text.
 * The rule is built once for each controller class and method, so repeated application starts do not add validation metadata.
 * @param {IApiControllerParametersCustomRuleOptions} options - Route description: the controller class, the handler name for the error message, the PARAMETERS DTO, the path parameter names of the controller and route paths, and the IAM resource path of the controller.
 * @returns {IApiControllerParametersRule | undefined} The rule, or undefined when no path parameter is described or named.
 * @throws {Error} When a placeholder that is a path parameter is not described by the PARAMETERS DTO.
 */
export function ApiControllerParametersBuildCustomRule(options: IApiControllerParametersCustomRuleOptions): IApiControllerParametersRule | undefined {
	const controllerRules: Map<string, IApiControllerParametersRule | undefined> = CUSTOM_RULES.get(options.controller) ?? new Map<string, IApiControllerParametersRule | undefined>();

	if (controllerRules.has(options.methodName)) {
		return controllerRules.get(options.methodName);
	}

	const rule: IApiControllerParametersRule | undefined = buildCustomRule(options);
	controllerRules.set(options.methodName, rule);
	CUSTOM_RULES.set(options.controller, controllerRules);

	return rule;
}

/**
 * Builds the path value rule of a custom route without the per-controller cache.
 * @param {IApiControllerParametersCustomRuleOptions} options - Route description.
 * @returns {IApiControllerParametersRule | undefined} The rule, or undefined when no path parameter is described or named.
 * @throws {Error} When a placeholder that is a path parameter is not copied from a column by the PARAMETERS DTO.
 */
function buildCustomRule(options: IApiControllerParametersCustomRuleOptions): IApiControllerParametersRule | undefined {
	const placeholders: Set<string> = new Set<string>([...options.resourcePath.matchAll(/\{([\w.-]+)\}/g)].map((match: RegExpExecArray): string => match[1] ?? "").filter((placeholder: string): boolean => options.pathParameters.includes(placeholder)));
	const sources: Map<string, IApiControllerParametersSource> = new Map<string, IApiControllerParametersSource>();
	const describedProperties: Map<string | symbol, TManualDtoPropertyMetadata> = options.dto ? GetManualDtoPropertyMetadata(options.dto.prototype as object) : new Map<string | symbol, TManualDtoPropertyMetadata>();
	const described: Map<string, TManualDtoPropertyMetadata> = new Map<string, TManualDtoPropertyMetadata>();

	for (const parameter of new Set<string>(options.pathParameters)) {
		const source: IApiControllerParametersSource | undefined = options.dto ? (Reflect.getMetadata(API_CONTROLLER_PARAMETERS_SOURCE_METADATA_KEY, options.dto.prototype as object, parameter) as IApiControllerParametersSource | undefined) : undefined;
		const isScalar: boolean = source !== undefined && source.metadata.type !== EApiPropertyDescribeType.OBJECT && source.metadata.type !== EApiPropertyDescribeType.RELATION && (source.metadata as { isArray?: boolean }).isArray !== true;

		const describedProperty: TManualDtoPropertyMetadata | undefined = describedProperties.get(parameter);

		if (source && isScalar) {
			sources.set(parameter, source);
		} else if (placeholders.has(parameter)) {
			throw ErrorException(`Controller "${options.controller.name}" method "${options.methodName}" names the path parameter "${parameter}" in its IAM resourcePath, but its PARAMETERS DTO does not describe it: copy the entity column with ApiPropertyCopy`);
		} else if (describedProperty && describedProperty.decorator !== EManualDtoPropertyMetadataDecorator.OBJECT && describedProperty.properties.isArray !== true) {
			described.set(parameter, describedProperty);
		}
	}

	if (sources.size === 0 && described.size === 0) {
		return undefined;
	}

	class CustomRoutePathValuesDTO {}

	for (const [parameter, source] of sources) {
		const config: TApiPropertyDescribeDtoProperties = DtoGetDecoratorConfig(EApiRouteType.GET, source.metadata, EApiDtoType.PARAMETERS);
		DtoGenerateDecorator(source.metadata, source.entityMetadata, config, EApiRouteType.GET, EApiDtoType.PARAMETERS, parameter)(CustomRoutePathValuesDTO.prototype, parameter);
	}

	// The described decorator is replayed as declared, so the value is validated and converted exactly as the DTO describes it.
	for (const [parameter, describedProperty] of described) {
		describedProperty.apply(CustomRoutePathValuesDTO.prototype, parameter);
	}

	return { dto: CustomRoutePathValuesDTO };
}
