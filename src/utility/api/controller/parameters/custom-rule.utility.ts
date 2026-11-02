import type { IApiControllerParametersCustomRuleOptions } from "@interface/class/api/controller/parameters-custom-rule-options.interface";
import type { IApiControllerParametersRouteDtoExposure } from "@interface/class/api/controller/parameters-route-dto-exposure.interface";
import type { IApiControllerParametersRouteDtoProblem } from "@interface/class/api/controller/parameters-route-dto-problem.interface";
import type { IApiControllerParametersRule } from "@interface/class/api/controller/parameters-rule.interface";
import type { IApiControllerParametersSource } from "@interface/class/api/controller/parameters-source.interface";
import type { IApiEntityColumn } from "@interface/entity";
import type { Type } from "@nestjs/common";

import { EApiPropertyDescribeType } from "@enum/decorator/api";
import { AuthorizationSerializeValue } from "@utility/authorization/serialize-value.utility";
import { ClassTransformerReadLimits } from "@utility/class-transformer/read-limits.utility";
import { GetManualDtoPropertyMetadata } from "@utility/dto/manual/property-metadata/get.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { getMetadataStorage, ValidationTypes } from "class-validator";

import { ApiControllerParametersIsDecimalColumn } from "./column/numeric-type.utility";
import { ApiControllerParametersConvert } from "./convert.utility";
import { API_CONTROLLER_PARAMETERS_SOURCE_METADATA_KEY } from "./dto/metadata-key.constant";
import { ApiControllerParametersRouteDtoFindDropped, ApiControllerParametersRouteDtoReadExposure } from "./route-dto-startup.utility";
import { ApiControllerParametersRouteDtoCheckSample } from "./route-dto.utility";

type TValidationMetadata = ReturnType<ReturnType<typeof getMetadataStorage>["getTargetValidationMetadatas"]>[number];

// Texts a scalar `@Transform` can read, used at startup to see what the DTO makes of a path value.
const STARTUP_SAMPLES: Array<string> = ["1", "Aa"];
const BOOLEAN_SAMPLES: Array<string> = ["true", "false"];

/**
 * Rejects a path value held in a decimal column on a securable route: a database reads `1.5`, `1.50` and `01.5` as one key, while an IAM Deny and a HOOKS policy on `context.parameters` compare text, so no policy value can name it.
 * @param {IApiControllerParametersRule} rule - Path value rule of the route.
 * @param {string} route - Controller and method, for the error message.
 * @returns {void}
 * @throws {Error} When a path parameter holds a decimal column.
 */
export function ApiControllerParametersAssertComparableColumns(rule: IApiControllerParametersRule, route: string): void {
	for (const [parameter, column] of rule.columns ?? []) {
		if (ApiControllerParametersIsDecimalColumn(column.type)) {
			throw ErrorException(`${route} holds the path parameter "${parameter}" in the ${String(column.type)} column "${String(column.name)}", and a database reads many spellings of such a value as one key, so a policy that compares its text, an IAM Deny or a HOOKS condition on context.parameters, cannot name it: use an integer, UUID or text key on this route`);
		}
	}
}

/**
 * Rejects a path value held in a decimal column on a securable custom route that gets no path value rule: a HOOKS route, whose policy compares `context.parameters` as text.
 * Each path parameter is read from the DTO property exposed under its name, or from the property of that name.
 * @param {Type<unknown>} dto - PARAMETERS DTO of the route.
 * @param {ReadonlyArray<string>} pathParameters - Path parameter names of the controller and route paths.
 * @param {string} route - Controller and method, for the error message.
 * @returns {void}
 * @throws {Error} When a path parameter is copied from a decimal column.
 */
export function ApiControllerParametersAssertComparableCopies(dto: Type<unknown>, pathParameters: ReadonlyArray<string>, route: string): void {
	const exposure: IApiControllerParametersRouteDtoExposure = ApiControllerParametersRouteDtoReadExposure(dto);
	const properties: Map<string, string> = new Map<string, string>(pathParameters.map((parameter: string): [string, string] => [parameter, exposure.names.get(parameter) ?? parameter]));

	ApiControllerParametersAssertComparableColumns({ columns: readCopiedColumns(dto, properties), dto }, route);
}

/**
 * Builds the path value rule of a securable custom route: the guard runs the route's own PARAMETERS DTO on the path values, so IAM sees the values the DTO produces and a handler reads the same values.
 * Each check on a request also runs here on sample values, so a DTO that could only refuse requests fails at startup. A check on samples cannot see everything, so the limits a sample cannot show are read from the metadata, and the check on each request runs on every real value.
 * @param {IApiControllerParametersCustomRuleOptions} options - Route description: the controller class and the handler name for the error message, the PARAMETERS DTO, the path parameter names of the controller and route paths, and the IAM resource path of the controller.
 * @returns {IApiControllerParametersRule | undefined} The rule, or undefined when the route has no path parameter or no PARAMETERS DTO, so such a route costs nothing per request.
 * @throws {Error} When the DTO cannot give a handler the value IAM saw, or when a resource path placeholder is not copied from an entity column.
 */
export function ApiControllerParametersBuildCustomRule(options: IApiControllerParametersCustomRuleOptions): IApiControllerParametersRule | undefined {
	const route: string = `Controller "${options.controller.name}" method "${options.methodName}"`;
	const parameters: Set<string> = new Set<string>(options.pathParameters);

	if (options.dto) {
		assertNoResponseProperty(options.dto, route);
	}

	const routeDtoProperties: ReadonlyMap<string, string> | undefined = options.dto && parameters.size > 0 ? resolveProperties(options.dto, parameters, route) : undefined;

	if (options.dto && routeDtoProperties) {
		assertRouteDto(options.dto, routeDtoProperties, route);
	}

	for (const placeholder of options.resourcePath.matchAll(/\{([\w.-]+)\}/g)) {
		const parameter: string = placeholder[1] ?? "";

		if (parameters.has(parameter) && !isColumnCopy(options.dto, routeDtoProperties?.get(parameter) ?? parameter)) {
			throw ErrorException(`${route} names the path parameter "${parameter}" in its IAM resourcePath, so its PARAMETERS DTO must copy that value from an entity column with ApiPropertyCopy, and it does not`);
		}
	}

	if (!options.dto || !routeDtoProperties) {
		return undefined;
	}

	const rule: IApiControllerParametersRule = { columns: readCopiedColumns(options.dto, routeDtoProperties), dto: options.dto, routeDtoProperties };
	ApiControllerParametersAssertComparableColumns(rule, route);

	return rule;
}

/**
 * Checks that a boolean path value keeps its text: `true` and `false` are its only canonical spellings, and a bare `@IsBoolean()` under implicit conversion or `@Type(() => Boolean)` turns `false` into `true`.
 * @param {Type<unknown>} dto - PARAMETERS DTO of the route.
 * @param {ReadonlyMap<string, string>} properties - The DTO property that holds each path parameter.
 * @param {string} parameter - Path parameter name.
 * @param {(parameter: string, reason: string) => Error} fail - Builds the startup error.
 * @returns {void}
 * @throws {Error} When the DTO gives one of the two texts another value.
 */
function assertBooleanKeepsItsText(dto: Type<unknown>, properties: ReadonlyMap<string, string>, parameter: string, fail: (parameter: string, reason: string) => Error): void {
	const property: string = properties.get(parameter) ?? parameter;

	for (const text of BOOLEAN_SAMPLES) {
		const sample: Record<string, string> = Object.fromEntries([...properties.keys()].map((key: string): [string, string] => [key, key === parameter ? text : (STARTUP_SAMPLES[0] ?? "")]));
		const problem: IApiControllerParametersRouteDtoProblem | undefined = ApiControllerParametersRouteDtoCheckSample(dto, properties, sample);

		if (problem) {
			throw fail(problem.parameter, problem.reason);
		}

		for (const isImplicit of [true, false]) {
			if (readSampleText(dto, sample, property, isImplicit) === (text === "true" ? "false" : "true")) {
				throw fail(parameter, `its PARAMETERS DTO turns "${text}" into the other boolean value: use ApiPropertyBoolean, or a @Transform that keeps both values`);
			}
		}
	}
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
 * Runs the checks of a request on sample values.
 * @param {Type<unknown>} dto - PARAMETERS DTO of the route.
 * @param {ReadonlyMap<string, string>} properties - The DTO property that holds each path parameter.
 * @param {string} route - Controller and method, for the error message.
 * @returns {void}
 * @throws {Error} When the DTO cannot give a handler the value IAM saw.
 */
function assertRouteDto(dto: Type<unknown>, properties: ReadonlyMap<string, string>, route: string): void {
	const validationMetadata: Array<TValidationMetadata> = getMetadataStorage().getTargetValidationMetadatas(dto, "", false, false);
	const fail = (parameter: string, reason: string): Error => ErrorException(`${route} property "${properties.get(parameter) ?? parameter}" of PARAMETERS DTO "${dto.name}" holds the path parameter "${parameter}", but ${reason}`);

	assertRouteDtoLimits(dto, properties, validationMetadata, fail);

	for (const [parameter, property] of properties) {
		if (validationMetadata.some((metadata: TValidationMetadata): boolean => metadata.propertyName === property && (metadata.type === ValidationTypes.NESTED_VALIDATION || metadata.name === "isObject" || metadata.name === "isArray"))) {
			throw fail(parameter, "its PARAMETERS DTO makes it an object or a list, which IAM cannot compare as text: describe a scalar value");
		}
	}

	for (const text of STARTUP_SAMPLES) {
		const problem: IApiControllerParametersRouteDtoProblem | undefined = ApiControllerParametersRouteDtoCheckSample(dto, properties, Object.fromEntries([...properties.keys()].map((parameter: string): [string, string] => [parameter, text])));

		if (problem) {
			throw fail(problem.parameter, problem.reason);
		}
	}

	for (const [parameter, property] of properties) {
		if (isBooleanProperty(dto, validationMetadata, property)) {
			assertBooleanKeepsItsText(dto, properties, parameter, fail);
		}
	}
}

/**
 * Rejects a property whose conversion depends on groups or versions: the guard runs with neither, so a host pipe with one would read the text IAM saw differently, and a sample cannot show that.
 * @param {Type<unknown>} dto - PARAMETERS DTO of the route.
 * @param {ReadonlyMap<string, string>} properties - The DTO property that holds each path parameter.
 * @param {Array<TValidationMetadata>} validationMetadata - Validators of the DTO.
 * @param {(parameter: string, reason: string) => Error} fail - Builds the startup error.
 * @returns {void}
 * @throws {Error} When a `@Transform`, an `@Expose` or a validator of a path value is limited.
 */
function assertRouteDtoLimits(dto: Type<unknown>, properties: ReadonlyMap<string, string>, validationMetadata: Array<TValidationMetadata>, fail: (parameter: string, reason: string) => Error): void {
	for (const [parameter, property] of properties) {
		const { isExposeLimited, isTransformLimited }: { isExposeLimited: boolean; isTransformLimited: boolean } = ClassTransformerReadLimits(dto, property);

		if (isTransformLimited) {
			throw fail(parameter, "a @Transform of it is limited to class-transformer groups or versions, which the guard cannot know, so a host pipe with one of them would change the text IAM saw: remove the limit");
		}

		if (isExposeLimited) {
			throw fail(parameter, "its @Expose is limited to class-transformer versions, which the guard cannot know, so a host pipe of another version would drop the value IAM saw: remove the limit");
		}

		if (validationMetadata.some((metadata: TValidationMetadata): boolean => metadata.propertyName === property && (metadata.groups?.length ?? 0) > 0)) {
			throw fail(parameter, "a validator of it is limited to class-validator groups: the guard runs every validator, while a host pipe with groups runs only those of its groups, so the two would check the value differently: remove the groups");
		}
	}
}

/**
 * Tells whether a DTO property holds a boolean.
 * @param {{ prototype: object }} dto - PARAMETERS DTO of the route.
 * @param {object} dto.prototype - Prototype of the DTO class.
 * @param {Array<TValidationMetadata>} validationMetadata - Validators of the DTO.
 * @param {string} property - Property name.
 * @returns {boolean} Whether the property is declared or validated as a boolean.
 */
function isBooleanProperty(dto: { prototype: object }, validationMetadata: Array<TValidationMetadata>, property: string): boolean {
	const declaredType: unknown = Reflect.getMetadata("design:type", dto.prototype, property);

	return declaredType === Boolean || validationMetadata.some((metadata: TValidationMetadata): boolean => metadata.propertyName === property && metadata.name === "isBoolean");
}

/**
 * Tells whether a DTO property copies a scalar entity column.
 * @param {{ prototype: object } | undefined} dto - PARAMETERS DTO of the route.
 * @param {string} property - Property name.
 * @returns {boolean} Whether the property was declared with `ApiPropertyCopy` from a scalar column.
 */
function isColumnCopy(dto: { prototype: object } | undefined, property: string): boolean {
	const source: IApiControllerParametersSource | undefined = dto ? (Reflect.getMetadata(API_CONTROLLER_PARAMETERS_SOURCE_METADATA_KEY, dto.prototype, property) as IApiControllerParametersSource | undefined) : undefined;

	return source !== undefined && source.metadata.type !== EApiPropertyDescribeType.OBJECT && source.metadata.type !== EApiPropertyDescribeType.RELATION && !("isArray" in source.metadata && source.metadata.isArray === true);
}

/**
 * Lists the entity column that each path parameter copies.
 * @param {{ prototype: object }} dto - PARAMETERS DTO of the route.
 * @param {object} dto.prototype - Prototype of the DTO class.
 * @param {ReadonlyMap<string, string>} properties - The DTO property that holds each path parameter.
 * @returns {Map<string, IApiEntityColumn<unknown>>} The column of each path parameter copied with `ApiPropertyCopy`.
 */
function readCopiedColumns(dto: { prototype: object }, properties: ReadonlyMap<string, string>): Map<string, IApiEntityColumn<unknown>> {
	const columns: Map<string, IApiEntityColumn<unknown>> = new Map<string, IApiEntityColumn<unknown>>();

	for (const [parameter, property] of properties) {
		const source: IApiControllerParametersSource | undefined = Reflect.getMetadata(API_CONTROLLER_PARAMETERS_SOURCE_METADATA_KEY, dto.prototype, property) as IApiControllerParametersSource | undefined;

		if (source) {
			columns.set(parameter, source.column);
		}
	}

	return columns;
}

/**
 * Reads the text the DTO gives one property of a sample.
 * @param {Type<unknown>} dto - PARAMETERS DTO of the route.
 * @param {Record<string, string>} sample - Sample text of each path parameter.
 * @param {string} property - Property name.
 * @param {boolean} isImplicit - Whether to convert as a host pipe with implicit conversion does.
 * @returns {string | undefined} The text, or undefined when a `@Transform` rejects the sample.
 */
function readSampleText(dto: Type<unknown>, sample: Record<string, string>, property: string, isImplicit: boolean): string | undefined {
	try {
		return AuthorizationSerializeValue(
			Reflect.get(
				ApiControllerParametersConvert(dto, sample, {
					// eslint-disable-next-line @elsikora/typescript/naming-convention
					enableImplicitConversion: isImplicit,
				}),
				property,
			),
		);
	} catch {
		return undefined;
	}
}

/**
 * Finds the DTO property that holds each path parameter. A path parameter the DTO has no property for holds its own name, so it reaches IAM as sent.
 * @param {Type<unknown>} dto - PARAMETERS DTO of the route.
 * @param {ReadonlySet<string>} parameters - Path parameter names.
 * @param {string} route - Controller and method, for the error message.
 * @returns {Map<string, string>} The property of each path parameter.
 * @throws {Error} When the DTO drops a path parameter, two properties expose its name, or a `@Transform` hides which property holds it, by throwing or by writing a constant under several keys.
 */
function resolveProperties(dto: Type<unknown>, parameters: ReadonlySet<string>, route: string): Map<string, string> {
	const exposure: IApiControllerParametersRouteDtoExposure = ApiControllerParametersRouteDtoReadExposure(dto);
	const [dropped]: Array<string> = ApiControllerParametersRouteDtoFindDropped(dto, parameters);
	const properties: Map<string, string> = new Map<string, string>();

	if (dropped !== undefined) {
		throw ErrorException(`${route} reads the path parameter "${dropped}" through PARAMETERS DTO "${dto.name}", which drops it, so IAM could not see its value: remove the exclusion that hides it, or rename the path parameter`);
	}

	for (const parameter of parameters) {
		const shadowed: Array<string> | undefined = exposure.shadowedProperties.get(parameter);
		const holder: string | undefined = exposure.names.get(parameter);

		if (shadowed) {
			throw ErrorException(`${route} reads the path parameter "${parameter}" through PARAMETERS DTO "${dto.name}", where the properties "${shadowed.join('" and "')}" both expose that name, so one overwrites the other: expose it from one property`);
		}

		const ambiguous: [string, Array<string>] | undefined = holder === undefined ? [...exposure.ambiguousProperties].find(([property, keys]: [string, Array<string>]): boolean => property !== parameter && keys.includes(parameter)) : undefined;

		if (ambiguous) {
			throw ErrorException(`${route} reads the path parameter "${parameter}" through PARAMETERS DTO "${dto.name}", where the property "${ambiguous[0]}" writes the same value under "${ambiguous[1].join('" and "')}" whatever the sample, so the guard cannot tell which property holds it: remove the constant @Transform, or add { toClassOnly: true } to it`);
		}

		if (holder === undefined && exposure.properties.has(parameter) && !exposure.failedProperties.has(parameter) && [...exposure.names.values()].includes(parameter)) {
			throw ErrorException(`${route} reads the path parameter "${parameter}" through PARAMETERS DTO "${dto.name}", whose property of that name is exposed under another name, so it never gets the value: expose it as "${parameter}"`);
		}

		if (holder === undefined && !exposure.properties.has(parameter) && exposure.failedProperties.size > 0) {
			throw ErrorException(`${route} reads the path parameter "${parameter}" through PARAMETERS DTO "${dto.name}", but a @Transform of the DTO throws when the property "${[...exposure.failedProperties].join('", "')}" is written back, whatever the sample, so the guard cannot tell which property holds it: let it accept any value, or add { toClassOnly: true } to that @Transform`);
		}

		properties.set(parameter, holder ?? parameter);
	}

	return properties;
}
