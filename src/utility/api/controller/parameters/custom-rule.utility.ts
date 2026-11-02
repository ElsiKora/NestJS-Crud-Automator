import type { IApiControllerParametersCustomRuleOptions } from "@interface/class/api/controller/parameters-custom-rule-options.interface";
import type { IApiControllerParametersRouteDtoRead } from "@interface/class/api/controller/parameters-route-dto-read.interface";
import type { IApiControllerParametersRule } from "@interface/class/api/controller/parameters-rule.interface";
import type { IApiControllerParametersSource } from "@interface/class/api/controller/parameters-source.interface";
import type { Type } from "@nestjs/common";

import { EApiPropertyDescribeType } from "@enum/decorator/api";
import { GetManualDtoPropertyMetadata } from "@utility/dto/manual/property-metadata/get.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { getMetadataStorage, ValidationTypes } from "class-validator";

import { API_CONTROLLER_PARAMETERS_SOURCE_METADATA_KEY } from "./dto/metadata-key.constant";
import { ApiControllerParametersRouteDtoRead } from "./route-dto.utility";

type TValidationMetadata = ReturnType<ReturnType<typeof getMetadataStorage>["getTargetValidationMetadatas"]>[number];

// Text that any scalar `@Transform` can read, used once at startup to see what the DTO makes of a path value.
const STARTUP_SAMPLE: string = "1";

/**
 * Builds the path value rule of a securable custom route: the guard runs the route's own PARAMETERS DTO on the path values, so IAM sees the values the DTO produces.
 * @param {IApiControllerParametersCustomRuleOptions} options - Route description: the controller class and the handler name for the error message, the PARAMETERS DTO, the path parameter names of the controller and route paths, and the IAM resource path of the controller.
 * @returns {IApiControllerParametersRule | undefined} The rule, or undefined when the route has no path parameter or no PARAMETERS DTO, so such a route costs nothing per request.
 * @throws {Error} When the DTO has a response property, when a path value has no text form or is dropped, or when a resource path placeholder is not copied from an entity column.
 */
export function ApiControllerParametersBuildCustomRule(options: IApiControllerParametersCustomRuleOptions): IApiControllerParametersRule | undefined {
	const route: string = `Controller "${options.controller.name}" method "${options.methodName}"`;

	if (options.dto) {
		assertNoResponseProperty(options.dto, route);
	}

	const parameters: Set<string> = new Set<string>(options.pathParameters);
	const read: IApiControllerParametersRouteDtoRead | undefined = options.dto && parameters.size > 0 ? readStartupSample(options.dto, parameters) : undefined;

	if (options.dto && read) {
		assertTextValues(options.dto, read, parameters, route);
	}

	for (const placeholder of options.resourcePath.matchAll(/\{([\w.-]+)\}/g)) {
		const parameter: string = placeholder[1] ?? "";

		if (parameters.has(parameter) && !isColumnCopy(options.dto, read?.properties.get(parameter) ?? parameter)) {
			throw ErrorException(`${route} names the path parameter "${parameter}" in its IAM resourcePath, so its PARAMETERS DTO must copy that value from an entity column with ApiPropertyCopy, and it does not`);
		}
	}

	return options.dto && parameters.size > 0 ? { dto: options.dto, isRouteDto: true } : undefined;
}

/**
 * Rejects a property declared as a response property: it has no request rule, so it cannot describe a path value.
 * @param {{ prototype: object }} dto - PARAMETERS DTO of the route.
 * @param {object} dto.prototype - Prototype of the DTO class.
 * @param {string} route - Controller and method, for the error message.
 * @returns {void}
 * @throws {Error} When a property sets `isResponse`.
 */
function assertNoResponseProperty(dto: { prototype: object }, route: string): void {
	for (const [property, metadata] of GetManualDtoPropertyMetadata(dto.prototype)) {
		if (metadata.properties.isResponse === true) {
			throw ErrorException(`${route} property "${String(property)}" sets isResponse in its PARAMETERS DTO: a response property has no request rule, so remove isResponse`);
		}
	}
}

/**
 * Rejects a path value authorization cannot read as text.
 * @param {Type<unknown>} dto - PARAMETERS DTO of the route.
 * @param {IApiControllerParametersRouteDtoRead} read - What the DTO made of the startup sample.
 * @param {Set<string>} parameters - Path parameter names.
 * @param {string} route - Controller and method, for the error message.
 * @returns {void}
 * @throws {Error} When the DTO drops a path value, turns it into an object or a list, or validates it as one.
 */
function assertTextValues(dto: Type<unknown>, read: IApiControllerParametersRouteDtoRead, parameters: Set<string>, route: string): void {
	const validationMetadata: Array<TValidationMetadata> = getMetadataStorage().getTargetValidationMetadatas(dto, "", false, false);

	for (const parameter of parameters) {
		const property: string | undefined = read.properties.get(parameter);

		if (property === undefined) {
			throw ErrorException(`${route} reads the path parameter "${parameter}" through a PARAMETERS DTO that drops it, so IAM could not see its value: remove the exclusion or the exposed name that hides it`);
		}

		const value: unknown = read.instance[property];
		const isObjectResult: boolean = typeof value === "object" && value !== null && !(value instanceof Date);
		const isObjectRule: boolean = validationMetadata.some((metadata: TValidationMetadata): boolean => metadata.propertyName === property && (metadata.type === ValidationTypes.NESTED_VALIDATION || metadata.name === "isObject" || metadata.name === "isArray"));

		if (isObjectResult || isObjectRule) {
			throw ErrorException(`${route} property "${property}" holds the path parameter "${parameter}" but its PARAMETERS DTO makes it an object or a list, which IAM cannot compare as text: describe a scalar value`);
		}
	}
}

/**
 * Tells whether a DTO property copies a scalar entity column.
 * @param {{ prototype: object } | undefined} dto - PARAMETERS DTO of the route.
 * @param {string} property - Property name.
 * @returns {boolean} Whether the property was declared with `ApiPropertyCopy` from a scalar column.
 */
function isColumnCopy(dto: { prototype: object } | undefined, property: string): boolean {
	const source: IApiControllerParametersSource | undefined = dto ? (Reflect.getMetadata(API_CONTROLLER_PARAMETERS_SOURCE_METADATA_KEY, dto.prototype, property) as IApiControllerParametersSource | undefined) : undefined;

	return source !== undefined && source.metadata.type !== EApiPropertyDescribeType.OBJECT && source.metadata.type !== EApiPropertyDescribeType.RELATION && (source.metadata as { isArray?: boolean }).isArray !== true;
}

/**
 * Runs the DTO once on sample text, to see which property holds each path value and what kind of value it makes.
 * @param {Type<unknown>} dto - PARAMETERS DTO of the route.
 * @param {Set<string>} parameters - Path parameter names.
 * @returns {IApiControllerParametersRouteDtoRead | undefined} What the DTO made of the sample, or undefined when a `@Transform` rejects it, which says nothing about real values.
 */
function readStartupSample(dto: Type<unknown>, parameters: Set<string>): IApiControllerParametersRouteDtoRead | undefined {
	try {
		return ApiControllerParametersRouteDtoRead(dto, Object.fromEntries([...parameters].map((parameter: string): [string, string] => [parameter, STARTUP_SAMPLE])), true);
	} catch {
		return undefined;
	}
}
