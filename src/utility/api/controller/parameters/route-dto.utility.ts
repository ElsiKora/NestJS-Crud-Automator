import type { IApiControllerParametersRouteDtoAttempt } from "@interface/class/api/controller/parameters-route-dto-attempt.interface";
import type { IApiControllerParametersRouteDtoProblem } from "@interface/class/api/controller/parameters-route-dto-problem.interface";
import type { Type } from "@nestjs/common";
import type { ValidationError } from "class-validator";

import { ApiRequestValidationException } from "@class/api/request-validation-exception.class";
import { PATH_PARAMETER_FAILURE_CONSTANT } from "@constant/path-parameter-failure.constant";
import { AuthorizationSerializeValue } from "@utility/authorization/serialize-value.utility";
import { validate, validateSync } from "class-validator";

import { ApiControllerParametersConvert } from "./convert.utility";
import { ApiControllerParametersCreateFailure } from "./create-failure.utility";

const DISAGREEMENT_REASON: string = "its PARAMETERS DTO converts it differently with and without implicit conversion, so a handler could read another value than IAM saw. Implicit conversion runs before a @Transform: pin the type with @Type, or read the sent text from obj[key] in the @Transform";
const UNSTABLE_REASON: string = "its PARAMETERS DTO changes its own output, so a host pipe would convert the text IAM saw again: make its @Transform give the same result on its own output, or move the conversion into the handler";

/**
 * Checks one sample path value the way the guard checks a request, so a DTO that could only refuse requests fails at startup.
 * A mode that throws, rejects the sample, or gives no text says nothing about real values, so it is ignored here; the check on each request stays the guarantee.
 * @param {Type<unknown>} dto - PARAMETERS DTO of the route.
 * @param {ReadonlyMap<string, string>} properties - The DTO property that holds each path parameter.
 * @param {Record<string, string>} sample - Sample text of each path parameter.
 * @returns {IApiControllerParametersRouteDtoProblem | undefined} What is wrong with the DTO, if anything.
 */
export function ApiControllerParametersRouteDtoCheckSample(dto: Type<unknown>, properties: ReadonlyMap<string, string>, sample: Record<string, string>): IApiControllerParametersRouteDtoProblem | undefined {
	const attempts: Array<IApiControllerParametersRouteDtoAttempt> = [runSync(dto, properties, sample, true), runSync(dto, properties, sample, false)];

	for (const attempt of attempts) {
		for (const [parameter, value] of Object.entries(attempt.values)) {
			if (typeof value === "object" && value !== null && !(value instanceof Date)) {
				return { parameter, reason: "its PARAMETERS DTO makes it an object or a list, which IAM cannot compare as text: describe a scalar value" };
			}
		}
	}

	const accepted: Array<IApiControllerParametersRouteDtoAttempt> = attempts.filter((attempt: IApiControllerParametersRouteDtoAttempt): boolean => hasText(attempt));
	const [first]: Array<IApiControllerParametersRouteDtoAttempt> = accepted;

	if (!first) {
		return undefined;
	}

	const texts: Record<string, string | undefined> = readTexts(first.values);
	const parameter: string | undefined = findDifferentText(accepted, texts);

	if (parameter !== undefined) {
		return { parameter, reason: DISAGREEMENT_REASON };
	}

	const unstable: string | undefined = findDifferentText(
		[runSync(dto, properties, texts, true), runSync(dto, properties, texts, false)].filter((attempt: IApiControllerParametersRouteDtoAttempt): boolean => hasText(attempt)),
		texts,
	);

	return unstable === undefined ? undefined : { parameter: unstable, reason: UNSTABLE_REASON };
}

/**
 * Runs a custom route's own PARAMETERS DTO on the path values, so authorization sees the value the DTO produces and a handler reads the same value in every host pipe mode, or the request is refused.
 * The guard cannot see the options of a host pipe, so both conversions run, with and without implicit conversion. When both accept a value and give different text, or the DTO gives different text on its own output, a pipe could hand the handler another value than IAM saw, so the request is refused.
 * Only the properties that hold a path value are checked: a host pipe still rejects a required property the path does not carry.
 * @param {Type<unknown>} dto - PARAMETERS DTO of the route.
 * @param {ReadonlyMap<string, string>} properties - The DTO property that holds each path parameter.
 * @param {Record<string, unknown>} parameters - Path values as Nest passed them to the handler.
 * @returns {Promise<Record<string, unknown>>} The value the DTO produced for each path parameter.
 * @throws {ApiRequestValidationException} With the class-validator failures as they are when a path value fails the DTO, or one failure with a stable constraint per path value that has no text form or does not keep one text.
 */
export async function ApiControllerParametersRouteDtoValidate(dto: Type<unknown>, properties: ReadonlyMap<string, string>, parameters: Record<string, unknown>): Promise<Record<string, unknown>> {
	const attempts: Array<IApiControllerParametersRouteDtoAttempt> = [await run(dto, properties, parameters, true), await run(dto, properties, parameters, false)];
	const accepted: Array<IApiControllerParametersRouteDtoAttempt> = attempts.filter((attempt: IApiControllerParametersRouteDtoAttempt): boolean => attempt.isAccepted);
	const [first]: Array<IApiControllerParametersRouteDtoAttempt> = accepted;

	if (!first) {
		const rejected: IApiControllerParametersRouteDtoAttempt | undefined = attempts.find((attempt: IApiControllerParametersRouteDtoAttempt): boolean => attempt.errors.length > 0);

		if (rejected) {
			throw new ApiRequestValidationException(rejected.errors);
		}

		throw attempts[0]?.failure?.error;
	}

	const texts: Record<string, string | undefined> = readTexts(first.values);
	const noText: Array<string> = Object.keys(texts).filter((key: string): boolean => texts[key] === undefined);

	if (noText.length > 0) {
		throw new ApiRequestValidationException(noText.map((key: string): ValidationError => ApiControllerParametersCreateFailure(key, PATH_PARAMETER_FAILURE_CONSTANT.NO_TEXT_CONSTRAINT, `${key} has no text form`)));
	}

	const different: string | undefined = findDifferentText(accepted, texts);

	if (different !== undefined) {
		throw new ApiRequestValidationException([ApiControllerParametersCreateFailure(different, PATH_PARAMETER_FAILURE_CONSTANT.CONVERSION_MISMATCH_CONSTRAINT, `${different} converts differently with and without implicit conversion`)]);
	}

	// A pure DTO gives the same result on the same text, so only changed text needs another run.
	if (Object.keys(texts).every((key: string): boolean => texts[key] === parameters[key])) {
		return first.values;
	}

	const unstable: string | undefined = findDifferentText([await run(dto, properties, texts, true), await run(dto, properties, texts, false)], texts);

	if (unstable !== undefined) {
		throw new ApiRequestValidationException([ApiControllerParametersCreateFailure(unstable, PATH_PARAMETER_FAILURE_CONSTANT.UNSTABLE_CONSTRAINT, `${unstable} does not keep its value when its DTO runs on it again`)]);
	}

	return first.values;
}

/**
 * Finds the path parameter whose text in an accepting attempt differs from the given text.
 * @param {Array<IApiControllerParametersRouteDtoAttempt>} attempts - Attempts to compare.
 * @param {Record<string, string | undefined>} texts - Text of each path parameter.
 * @returns {string | undefined} The path parameter, or undefined when every accepting attempt agrees.
 */
function findDifferentText(attempts: Array<IApiControllerParametersRouteDtoAttempt>, texts: Record<string, string | undefined>): string | undefined {
	for (const attempt of attempts) {
		const attemptTexts: Record<string, string | undefined> = readTexts(attempt.values);
		const different: string | undefined = attempt.isAccepted ? Object.keys(texts).find((key: string): boolean => attemptTexts[key] !== texts[key]) : undefined;

		if (different !== undefined) {
			return different;
		}
	}

	return undefined;
}

/**
 * Tells whether an attempt accepted a sample and gave every path parameter a text. A sample that a conversion cannot read, such as letters under a number property, says nothing about real values.
 * @param {IApiControllerParametersRouteDtoAttempt} attempt - Attempt on a sample.
 * @returns {boolean} Whether the attempt says anything about real values.
 */
function hasText(attempt: IApiControllerParametersRouteDtoAttempt): boolean {
	return attempt.isAccepted && Object.values(readTexts(attempt.values)).every((text: string | undefined): boolean => text !== undefined);
}

/**
 * Renders each value as its canonical text.
 * @param {Record<string, unknown>} values - Value of each path parameter.
 * @returns {Record<string, string | undefined>} Text of each path parameter.
 */
function readTexts(values: Record<string, unknown>): Record<string, string | undefined> {
	return Object.fromEntries(Object.entries(values).map(([key, value]: [string, unknown]): [string, string | undefined] => [key, AuthorizationSerializeValue(value)]));
}

/**
 * Converts and validates path values once.
 * @param {Type<unknown>} dto - PARAMETERS DTO of the route.
 * @param {ReadonlyMap<string, string>} properties - The DTO property that holds each path parameter.
 * @param {Record<string, unknown>} parameters - Path values under their path parameter names.
 * @param {boolean} isImplicit - Whether to convert as a host pipe with implicit conversion does.
 * @returns {Promise<IApiControllerParametersRouteDtoAttempt>} What this conversion made of the values.
 */
async function run(dto: Type<unknown>, properties: ReadonlyMap<string, string>, parameters: Record<string, unknown>, isImplicit: boolean): Promise<IApiControllerParametersRouteDtoAttempt> {
	try {
		const instance: object = ApiControllerParametersConvert(dto, parameters, {
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			enableImplicitConversion: isImplicit,
		});

		const errors: Array<ValidationError> = await validate(instance, {
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			forbidUnknownValues: false,
		});

		return settle(instance, errors, properties, parameters);
	} catch (error) {
		return { errors: [], failure: { error }, isAccepted: false, values: {} };
	}
}

/**
 * Converts and validates a sample at startup, where a guard check cannot wait for asynchronous validators.
 * @param {Type<unknown>} dto - PARAMETERS DTO of the route.
 * @param {ReadonlyMap<string, string>} properties - The DTO property that holds each path parameter.
 * @param {Record<string, unknown>} parameters - Path values under their path parameter names.
 * @param {boolean} isImplicit - Whether to convert as a host pipe with implicit conversion does.
 * @returns {IApiControllerParametersRouteDtoAttempt} What this conversion made of the values.
 */
function runSync(dto: Type<unknown>, properties: ReadonlyMap<string, string>, parameters: Record<string, unknown>, isImplicit: boolean): IApiControllerParametersRouteDtoAttempt {
	try {
		const instance: object = ApiControllerParametersConvert(dto, parameters, {
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			enableImplicitConversion: isImplicit,
		});

		const errors: Array<ValidationError> = validateSync(instance, {
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			forbidUnknownValues: false,
		});

		return settle(instance, errors, properties, parameters);
	} catch (error) {
		return { errors: [], failure: { error }, isAccepted: false, values: {} };
	}
}

/**
 * Reads the outcome of one conversion: the errors of the properties that hold a path value, and the value of each path parameter.
 * @param {object} instance - Converted DTO instance.
 * @param {Array<ValidationError>} errors - Validation errors of the instance.
 * @param {ReadonlyMap<string, string>} properties - The DTO property that holds each path parameter.
 * @param {Record<string, unknown>} parameters - Path values under their path parameter names.
 * @returns {IApiControllerParametersRouteDtoAttempt} What this conversion made of the values.
 */
function settle(instance: object, errors: Array<ValidationError>, properties: ReadonlyMap<string, string>, parameters: Record<string, unknown>): IApiControllerParametersRouteDtoAttempt {
	const pathProperties: Set<string> = new Set<string>(properties.values());
	const pathErrors: Array<ValidationError> = errors.filter((error: ValidationError): boolean => pathProperties.has(error.property));
	const values: Record<string, unknown> = Object.fromEntries(Object.keys(parameters).map((parameter: string): [string, unknown] => [parameter, Reflect.get(instance, properties.get(parameter) ?? parameter)]));

	return { errors: pathErrors, isAccepted: pathErrors.length === 0, values };
}
