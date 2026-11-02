import type { IApiControllerParametersRouteDtoRead } from "@interface/class/api/controller/parameters-route-dto-read.interface";
import type { Type } from "@nestjs/common";
import type { ClassConstructor } from "class-transformer";
import type { ValidationError } from "class-validator";

import { BadRequestException } from "@nestjs/common";
import { ApiRouteValidationFlattenErrors } from "@utility/api/route/validation-flatten-errors.utility";
import { AuthorizationSerializeValue } from "@utility/authorization/serialize-value.utility";
import { instanceToPlain, plainToInstance } from "class-transformer";
import { validate } from "class-validator";

const EXPOSED_PROPERTIES: WeakMap<object, Map<string, string>> = new WeakMap<object, Map<string, string>>();

/**
 * Converts path values with a custom route's own PARAMETERS DTO and finds the property that holds each value.
 * @param {Type<unknown>} dto - PARAMETERS DTO of the route.
 * @param {Record<string, unknown>} parameters - Path values under their path parameter names.
 * @param {boolean} isImplicit - Whether to convert as a host pipe with implicit conversion does.
 * @returns {IApiControllerParametersRouteDtoRead} The DTO instance and the property of each path parameter.
 */
export function ApiControllerParametersRouteDtoRead(dto: Type<unknown>, parameters: Record<string, unknown>, isImplicit: boolean): IApiControllerParametersRouteDtoRead {
	const instance: Record<string, unknown> = plainToInstance(
		dto as ClassConstructor<Record<string, unknown>>,
		{ ...parameters },
		{
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			enableImplicitConversion: isImplicit,
		},
	);
	const properties: Map<string, string> = new Map<string, string>();

	for (const parameter of Object.keys(parameters)) {
		const property: string | undefined = resolveProperty(dto, instance, parameter);

		if (property !== undefined) {
			properties.set(parameter, property);
		}
	}

	return { instance, properties };
}

/**
 * Lists the path values whose canonical text can replace the sent text on the request.
 * A host pipe runs the DTO again on what the request holds, so text whose conversion gives different text, as a prefixing `@Transform` does, stays as sent: the pipe then produces exactly the value authorization saw.
 * @param {Type<unknown>} dto - PARAMETERS DTO of the route.
 * @param {Record<string, unknown>} parameters - Path values as the request holds them.
 * @param {Record<string, string>} texts - Canonical text of each path value.
 * @returns {Record<string, string>} The text to write back, or nothing when the request already holds it.
 */
export function ApiControllerParametersRouteDtoSelectStableText(dto: Type<unknown>, parameters: Record<string, unknown>, texts: Record<string, string>): Record<string, string> {
	const changed: Array<[string, string]> = Object.entries(texts).filter(([key, text]: [string, string]): boolean => parameters[key] !== text);

	if (changed.length === 0) {
		return {};
	}

	try {
		const { instance, properties }: IApiControllerParametersRouteDtoRead = ApiControllerParametersRouteDtoRead(dto, { ...parameters, ...texts }, true);

		return Object.fromEntries(changed.filter(([key, text]: [string, string]): boolean => AuthorizationSerializeValue(instance[properties.get(key) ?? key]) === text));
	} catch {
		// The DTO cannot convert its own output, so a host pipe must get the sent text.
		return {};
	}
}

/**
 * Runs a custom route's own PARAMETERS DTO on the path values, so authorization sees the values the DTO produces and not the text the client sent.
 * The guard cannot see the options of a host pipe, so the values are converted as a pipe with implicit conversion does, and, when the DTO rejects that result, as a pipe without it does.
 * Only the properties that hold a path value are checked: a host pipe still rejects a required property the path does not carry.
 * @param {Type<unknown>} dto - PARAMETERS DTO of the route.
 * @param {Record<string, unknown>} parameters - Path values as Nest passed them to the handler.
 * @returns {Promise<Record<string, unknown>>} The value the DTO produced for each path parameter.
 * @throws {BadRequestException} With the flattened class-validator messages when a path value fails the DTO or has no text form.
 */
export async function ApiControllerParametersRouteDtoValidate(dto: Type<unknown>, parameters: Record<string, unknown>): Promise<Record<string, unknown>> {
	let messages: Array<string> | undefined;
	let failure: { error: unknown } | undefined;

	for (const isImplicit of [true, false]) {
		try {
			const result: { messages: Array<string>; values: Record<string, unknown> } = await runDto(dto, parameters, isImplicit);

			if (result.messages.length === 0) {
				return result.values;
			}

			messages ??= result.messages;
		} catch (error) {
			failure ??= { error };
		}
	}

	if (messages) {
		throw new BadRequestException(messages);
	}

	throw failure?.error;
}

/**
 * Writes one property of a DTO back to a plain object and lists the keys that come out.
 * @param {{ prototype: object }} dto - PARAMETERS DTO of the route.
 * @param {object} dto.prototype - Prototype of the DTO class.
 * @param {string} property - Property name.
 * @param {unknown} value - Converted value of the property.
 * @returns {Array<string>} The keys of the plain object, empty when a `@Transform` without a direction rejects the value.
 */
function readExposedNames(dto: { prototype: object }, property: string, value: unknown): Array<string> {
	const probe: Record<string, unknown> = Object.create(dto.prototype) as Record<string, unknown>;
	// An unset value would come out as no key at all.
	probe[property] = value ?? "";

	try {
		return Object.keys(
			instanceToPlain(probe, {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				exposeUnsetFields: false,
			}),
		);
	} catch {
		return [];
	}
}

/**
 * Finds the DTO property that holds a path parameter.
 * Each property is written back alone, so its exposed name is the one key that comes out. The value read is the one from the conversion, so a `@Transform` without a direction cannot change it a second time. The result is kept for each DTO, because exposed names do not change.
 * @param {Type<unknown>} dto - PARAMETERS DTO of the route.
 * @param {Record<string, unknown>} instance - Converted DTO instance.
 * @param {string} parameter - Path parameter name.
 * @returns {string | undefined} The property name, or undefined when the DTO drops the value.
 */
function resolveProperty(dto: Type<unknown>, instance: Record<string, unknown>, parameter: string): string | undefined {
	const exposedProperties: Map<string, string> = EXPOSED_PROPERTIES.get(dto) ?? new Map<string, string>();

	if (!exposedProperties.has(parameter)) {
		for (const property of Object.keys(instance)) {
			const exposedNames: Array<string> = readExposedNames(dto, property, instance[property]);

			if (exposedNames.length === 1 && exposedNames[0] !== undefined) {
				exposedProperties.set(exposedNames[0], property);
			}
		}

		EXPOSED_PROPERTIES.set(dto, exposedProperties);
	}

	// A property with no exposed name, as with an exclusion for the plain direction, still holds a value under its own name.
	return exposedProperties.get(parameter) ?? (instance[parameter] === undefined ? undefined : parameter);
}

/**
 * Converts and validates path values once.
 * @param {Type<unknown>} dto - PARAMETERS DTO of the route.
 * @param {Record<string, unknown>} parameters - Path values under their path parameter names.
 * @param {boolean} isImplicit - Whether to convert as a host pipe with implicit conversion does.
 * @returns {Promise<{ messages: Array<string>; values: Record<string, unknown> }>} The messages of the failed path values and the value of each path parameter.
 */
async function runDto(dto: Type<unknown>, parameters: Record<string, unknown>, isImplicit: boolean): Promise<{ messages: Array<string>; values: Record<string, unknown> }> {
	const { instance, properties }: IApiControllerParametersRouteDtoRead = ApiControllerParametersRouteDtoRead(dto, parameters, isImplicit);
	const pathProperties: Set<string> = new Set<string>(properties.values());

	const allErrors: Array<ValidationError> = await validate(instance, {
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		forbidUnknownValues: false,
	});
	const errors: Array<ValidationError> = allErrors.filter((error: ValidationError): boolean => pathProperties.has(error.property));
	const messages: Array<string> = ApiRouteValidationFlattenErrors(errors);
	const values: Record<string, unknown> = {};

	if (errors.length === 0) {
		for (const parameter of Object.keys(parameters)) {
			const value: unknown = instance[properties.get(parameter) ?? parameter];

			if (AuthorizationSerializeValue(value) === undefined) {
				messages.push(`${parameter} has no text form`);
			}

			Object.defineProperty(values, parameter, {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				configurable: true,
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				enumerable: true,
				value,
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				writable: true,
			});
		}
	}

	return { messages, values };
}
