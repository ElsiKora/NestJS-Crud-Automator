import type { ApiPropertyOptions } from "@nestjs/swagger";
import type { TApiEntityReference } from "@type/api-entity-reference.type";
import type { TApiPropertyNumberProperties } from "@type/decorator/api/property";

import { NUMBER_CONSTANT } from "@constant/number.constant";
import { EApiPropertyDataType, EApiPropertyNumberType } from "@enum/decorator/api";
import { EManualDtoPropertyMetadataDecorator } from "@enum/utility/manual-dto-property-metadata-decorator.enum";
import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiResponseProperty } from "@nestjs/swagger";
import { ApiPropertyGetArrayOptionsErrors } from "@utility/api/property-get-array-options-errors.utility";
import { ApplyAutoDtoResponseExposure } from "@utility/apply-auto-dto-response-exposure.utility";
import { ApplyAutoExpose } from "@utility/apply-auto-expose.utility";
import { ClassTransformerAutomatorTransform } from "@utility/class-transformer/automator-transform.utility";
import { RegisterManualDtoPropertyMetadata } from "@utility/dto/manual/property-metadata/register.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { IsDecimalDivisibleBy } from "@utility/is/decimal-divisible-by.utility";
import { NumberDescribeUnsafeIntegerRange, NumberParseCanonicalDecimal, NumberParseCanonicalInteger } from "@utility/number";
import { WithResolvedPropertyEntity } from "@utility/with-resolved-property-entity.utility";
import { ArrayUniqueItemsValidator } from "@validator/array-unique-items.validator";
import { Exclude, Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, ArrayNotEmpty, buildMessage, IS_DIVISIBLE_BY, IsArray, IsInt, IsNumber, Max, Min, Validate, ValidateBy, ValidateIf } from "class-validator";
import random from "lodash/random.js";

/**
 * Creates a decorator that applies NestJS Swagger and class-validator/class-transformer decorators
 * for number properties in DTOs.
 *
 * This decorator handles number properties with support for:
 * - Integer and double/float formats
 * - Single numbers or arrays of numbers
 * - Response/Request specific decorators
 * - Min/max value constraints
 * - Multiple-of validation
 * - Strict transformation of request text to number: the value is checked exactly as the client sent it, whatever the `@Expose` name and host pipe options
 * - Range validation
 *
 * The decorator can automatically generate an example value within the specified range
 * if one is not provided, and applies appropriate validation rules based on the configuration.
 * @param {TApiPropertyNumberProperties} properties - Configuration options for the number property
 * @returns {PropertyDecorator} A decorator function that can be applied to a class property
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/api-reference/decorators/api-property/api-property-number | API Reference - ApiPropertyNumber}
 * @example
 * ```typescript
 * // Simple integer property
 * class ProductDto {
 *   @ApiPropertyNumber({
 *     entity: { name: 'Product' },
 *     description: 'quantity',
 *     format: EApiPropertyNumberType.INTEGER,
 *     isRequired: true,
 *     minimum: 1,
 *     maximum: 100,
 *     exampleValue: 10
 *   })
 *   quantity: number;
 * }
 *
 * // Float property with multiple-of validation
 * class PriceDto {
 *   @ApiPropertyNumber({
 *     entity: { name: 'Price' },
 *     description: 'amount',
 *     format: EApiPropertyNumberType.DOUBLE,
 *     isRequired: true,
 *     minimum: 0.01,
 *     maximum: 999999.99,
 *     multipleOf: 0.01,
 *     exampleValue: 29.99
 *   })
 *   amount: number;
 * }
 *
 * // Array of numbers
 * class PointsDto {
 *   @ApiPropertyNumber({
 *     entity: { name: 'Coordinate' },
 *     description: 'values',
 *     format: EApiPropertyNumberType.INTEGER,
 *     isArray: true,
 *     minItems: 2,
 *     maxItems: 3,
 *     isUniqueItems: true,
 *     minimum: -180,
 *     maximum: 180,
 *     exampleValue: [45, 90, 135]
 *   })
 *   coordinates: number[];
 * }
 * ```
 */
export function ApiPropertyNumber(properties: TApiPropertyNumberProperties): PropertyDecorator {
	return (target: object, propertyKey: string | symbol): void => {
		WithResolvedPropertyEntity(properties.entity, "ApiPropertyNumber", (resolvedEntity: TApiEntityReference) => {
			const normalizedProperties: TApiPropertyNumberProperties = {
				...properties,
				entity: resolvedEntity,
			};

			normalizedProperties.exampleValue ??= random(normalizedProperties.minimum, normalizedProperties.maximum);

			validateOptions(normalizedProperties, target, propertyKey);
			RegisterManualDtoPropertyMetadata(target, propertyKey, {
				apply: ApiPropertyNumber(normalizedProperties),
				decorator: EManualDtoPropertyMetadataDecorator.NUMBER,
				properties: normalizedProperties,
			});

			const apiPropertyOptions: ApiPropertyOptions = buildApiPropertyOptions(normalizedProperties);
			const decorators: Array<PropertyDecorator> = buildDecorators(normalizedProperties, apiPropertyOptions);

			applyDecorators(...decorators)(target, propertyKey);
			ApplyAutoDtoResponseExposure(target, propertyKey, normalizedProperties);
		});
	};
}

/**
 * Builds the API property options object from the provided property configuration.
 * Sets up number-specific properties including format, min/max values, example value,
 * and multiple-of constraint.
 * @param {TApiPropertyNumberProperties} properties - The property configuration
 * @returns {ApiPropertyOptions} The Swagger API property options object
 * @private
 */
function buildApiPropertyOptions(properties: TApiPropertyNumberProperties): ApiPropertyOptions {
	const apiPropertyOptions: ApiPropertyOptions = {
		description: `${String(properties.entity.name)} ${properties.description ?? ""}`,
		format: getFormat(properties),
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		nullable: !!properties.isNullable,
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		required: properties.isRequired,
		type: properties.format === EApiPropertyNumberType.DOUBLE ? EApiPropertyDataType.NUMBER : EApiPropertyDataType.INTEGER,
	};

	if (properties.isArray) {
		apiPropertyOptions.isArray = true;
		apiPropertyOptions.minItems = properties.minItems;
		apiPropertyOptions.maxItems = properties.maxItems;
		apiPropertyOptions.uniqueItems = properties.isUniqueItems;
		apiPropertyOptions.example = Array.isArray(properties.exampleValue) ? properties.exampleValue : [properties.exampleValue];
	} else {
		apiPropertyOptions.example = properties.exampleValue;
	}

	apiPropertyOptions.minimum = properties.minimum;
	apiPropertyOptions.maximum = properties.maximum;

	if ((properties.isResponse === false || properties.isResponse === undefined) && properties.multipleOf != undefined) {
		apiPropertyOptions.multipleOf = properties.multipleOf;
	}

	return apiPropertyOptions;
}

/**
 * Builds all the necessary decorators for the number property based on the configuration.
 * Combines API property decorators, response decorators, request decorators, format decorators,
 * transform decorators, and number validation decorators.
 * @param {TApiPropertyNumberProperties} properties - The property configuration
 * @param {ApiPropertyOptions} apiPropertyOptions - The Swagger API property options
 * @returns {Array<PropertyDecorator>} An array of decorators to apply to the property
 * @private
 */
function buildDecorators(properties: TApiPropertyNumberProperties, apiPropertyOptions: ApiPropertyOptions): Array<PropertyDecorator> {
	return [ApiProperty(apiPropertyOptions), ...buildResponseDecorators(properties), ...buildRequestDecorators(properties), ...buildFormatDecorators(properties), ...buildTransformDecorators(properties), ...buildNumberValidationDecorators(properties)];
}

/**
 * Builds decorators for number format validation based on the specified format type.
 * Handles integer and double/float formats with appropriate validators.
 * @param {TApiPropertyNumberProperties} properties - The property configuration
 * @returns {Array<PropertyDecorator>} An array of format-specific validation decorators
 * @private
 */
function buildFormatDecorators(properties: TApiPropertyNumberProperties): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [];
	const isArray: boolean = properties.isArray ?? false;

	if (properties.isResponse === undefined || !properties.isResponse) {
		switch (properties.format) {
			case EApiPropertyNumberType.DOUBLE: {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				decorators.push(IsNumber({}, { each: isArray }));

				break;
			}

			case EApiPropertyNumberType.INTEGER: {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				decorators.push(IsInt({ each: isArray }));

				break;
			}

			default: {
				throw ErrorException(`ApiPropertyNumber error: Format is not valid for number property: ${String(properties.format)}`);
			}
		}

		// `Type(() => Object)` keeps the sent value: `Type(() => Number)` or `enableImplicitConversion` would turn "016" into 16 and `true` into 1 before the transformer could reject them.
		decorators.push(Type(() => Object));
	}

	return decorators;
}

/**
 * Builds decorators for number-specific validation including multiple-of constraint,
 * minimum value, and maximum value validation.
 * @param {TApiPropertyNumberProperties} properties - The property configuration
 * @returns {Array<PropertyDecorator>} An array of number validation decorators
 * @private
 */
function buildNumberValidationDecorators(properties: TApiPropertyNumberProperties): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [];
	const isArray: boolean = properties.isArray ?? false;

	if (properties.isResponse === false || properties.isResponse === undefined) {
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		decorators.push(Min(properties.minimum, { each: isArray }), Max(properties.maximum, { each: isArray }));
	}

	if ((properties.isResponse === false || properties.isResponse === undefined) && properties.multipleOf != undefined) {
		const { multipleOf }: { multipleOf: number } = properties;

		decorators.push(
			ValidateBy(
				{
					constraints: [multipleOf],
					name: IS_DIVISIBLE_BY,
					validator: {
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						defaultMessage: buildMessage((eachPrefix: string): string => `${eachPrefix}$property must be divisible by $constraint1`, { each: isArray }),
						validate: (value: unknown): boolean => IsDecimalDivisibleBy(value, multipleOf),
					},
				},
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				{ each: isArray },
			),
		);
	}

	return decorators;
}

/**
 * Builds the presence validator for number request properties.
 * @param {TApiPropertyNumberProperties} properties - Property configuration that controls required and nullable semantics.
 * @returns {PropertyDecorator} A class-validator presence decorator.
 */
function buildPresenceDecorator(properties: TApiPropertyNumberProperties): PropertyDecorator {
	if (properties.isRequired && properties.isNullable) {
		return ValidateIf((_object: object, value: unknown): boolean => value !== null);
	}

	if (!properties.isRequired && properties.isNullable) {
		return ValidateIf((_object: object, value: unknown): boolean => value !== undefined && value !== null);
	}

	if (!properties.isRequired) {
		return ValidateIf((_object: object, value: unknown): boolean => value !== undefined);
	}

	return ValidateIf((): boolean => true);
}

/**
 * Builds decorators for request validation including optional status,
 * array validation, and size constraints for number properties.
 * @param {TApiPropertyNumberProperties} properties - The property configuration
 * @returns {Array<PropertyDecorator>} An array of request validation decorators
 * @private
 */
function buildRequestDecorators(properties: TApiPropertyNumberProperties): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [];

	if (properties.isResponse === false || properties.isResponse === undefined) {
		decorators.push(buildPresenceDecorator(properties));

		if (properties.isArray === true) {
			decorators.push(IsArray(), ArrayMinSize(properties.minItems), ArrayMaxSize(properties.maxItems));

			if (properties.isUniqueItems) {
				decorators.push(Validate(ArrayUniqueItemsValidator));
			}

			if (properties.minItems > 0) {
				decorators.push(ArrayNotEmpty());
			}
		}
	}

	return decorators;
}

/**
 * Builds decorators for response serialization including API response property,
 * expose, and exclude decorators for number properties.
 * @param {TApiPropertyNumberProperties} properties - The property configuration
 * @returns {Array<PropertyDecorator>} An array of response serialization decorators
 * @private
 */
function buildResponseDecorators(properties: TApiPropertyNumberProperties): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [];

	if (properties.isResponse) {
		decorators.push(ApiResponseProperty());

		if (!("isExpose" in properties) || properties.isExpose === undefined || ("isExpose" in properties && properties.isExpose)) {
			decorators.push(ApplyAutoExpose);
		} else {
			decorators.push(Exclude());
		}
	}

	return decorators;
}

/**
 * Builds decorators for type transformation from string to number.
 * The transformer receives the value the client sent, under any `@Expose` name and host pipe options, and converts only canonical number text.
 * @param {TApiPropertyNumberProperties} properties - The property configuration
 * @returns {Array<PropertyDecorator>} An array of type transformation decorators
 * @private
 */
function buildTransformDecorators(properties: TApiPropertyNumberProperties): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [];

	if (!properties.isResponse) {
		if (properties.isArray) {
			decorators.push(
				ClassTransformerAutomatorTransform(
					({ value }: { value: unknown }): unknown => {
						if (value === undefined || value === null) {
							return value;
						}

						// A lone value, such as `?counts=7`, is a one-item list, as for every list type; `?counts=1,2` is the single item `1,2`, which is rejected.
						return (Array.isArray(value) ? value : [value]).map((item: unknown): unknown => parseNumberValue(properties.format, item));
					},
					{ toClassOnly: true },
				),
			);
		} else {
			decorators.push(
				ClassTransformerAutomatorTransform(
					({ value }: { value: unknown }): unknown => {
						if (value === undefined || value === null) {
							return value;
						}

						// A single value given as a list, such as `{ n: ["007"] }` or `?n=1&n=2`, is kept as the list for the validator to reject.
						return Array.isArray(value) ? value : parseNumberValue(properties.format, value);
					},
					{ toClassOnly: true },
				),
			);
		}
	}

	return decorators;
}

/**
 * Determines the appropriate Swagger format for the number property.
 * Maps integer types to int32/int64 based on value range, and handles double format.
 * @param {TApiPropertyNumberProperties} properties - The property configuration
 * @returns {string} The Swagger format string
 * @private
 */
function getFormat(properties: TApiPropertyNumberProperties): string {
	switch (properties.format) {
		case EApiPropertyNumberType.DOUBLE: {
			return EApiPropertyNumberType.DOUBLE;
		}

		case EApiPropertyNumberType.INTEGER: {
			return properties.maximum <= NUMBER_CONSTANT.MAX_INTEGER && properties.maximum >= NUMBER_CONSTANT.MIN_INTEGER ? "int32" : "int64";
		}

		default: {
			throw ErrorException("ApiPropertyNumber error: Format is not defined");
		}
	}
}

/**
 * Converts one request value to a number. Integer text is accepted only in canonical decimal form, so `016`, `0x10`, `16.0` and `1e3` become `NaN` and fail `IsInt`; DOUBLE text only as decimal text with an optional fraction and exponent, so ``, ` 16 `, `0x10` and `.5` fail `IsNumber`.
 * @param {EApiPropertyNumberType} format - Described number format.
 * @param {unknown} value - Raw request value.
 * @returns {unknown} The converted number, or the value itself when it is not a string, so a boolean or an object fails the number validators.
 * @private
 */
function parseNumberValue(format: EApiPropertyNumberType, value: unknown): unknown {
	if (typeof value !== "string") {
		return value;
	}

	return format === EApiPropertyNumberType.INTEGER ? NumberParseCanonicalInteger(value) : NumberParseCanonicalDecimal(value);
}

/**
 * Validates the configuration options for the API property number.
 * Performs extensive validation including:
 * - Min/max values consistency
 * - Multiple-of constraints and example value compatibility
 * - Example values within min/max range
 * - Array options consistency (min/max items, unique items)
 * @param {TApiPropertyNumberProperties} properties - The property configuration to validate
 * @param {object} target - Decorated DTO prototype, or the class of a static property, named in the error.
 * @param {string | symbol} propertyKey - Decorated property key, named in the error.
 * @returns {void}
 * @throws {Error} If the configuration is invalid with detailed error messages
 * @private
 */
function validateOptions(properties: TApiPropertyNumberProperties, target: object, propertyKey: string | symbol): void {
	const errors: Array<string> = [];

	if (properties.minimum > properties.maximum) {
		errors.push("'minimum' is greater than maximum");
	}

	const unsafeIntegerRangeError: string | undefined = NumberDescribeUnsafeIntegerRange(properties);

	if (unsafeIntegerRangeError) {
		errors.push(unsafeIntegerRangeError);
	}

	if (properties.multipleOf != undefined) {
		if (Array.isArray(properties.exampleValue)) {
			for (const example of properties.exampleValue) {
				if (!IsDecimalDivisibleBy(example, properties.multipleOf)) {
					errors.push("'exampleValue' is not a multiple of 'multipleOf' value: " + String(example));
				}
			}
		} else if (properties.exampleValue !== undefined && !IsDecimalDivisibleBy(properties.exampleValue, properties.multipleOf)) {
			errors.push("'exampleValue' is not a multiple of 'multipleOf' value: " + String(properties.exampleValue));
		}
	}

	if (Array.isArray(properties.exampleValue)) {
		for (const example of properties.exampleValue) {
			if (example < properties.minimum) {
				errors.push("'exampleValue' is less than 'minimum': " + String(example));
			}
		}
	} else if (properties.exampleValue !== undefined && properties.exampleValue < properties.minimum) {
		errors.push("'exampleValue' is less than 'minimum': " + String(properties.exampleValue));
	}

	if (Array.isArray(properties.exampleValue)) {
		for (const example of properties.exampleValue) {
			if (example > properties.maximum) {
				errors.push("'exampleValue' is greater than 'maximum': " + String(example));
			}
		}
	} else if (properties.exampleValue !== undefined && properties.exampleValue > properties.maximum) {
		errors.push("'exampleValue' is greater than 'maximum': " + String(properties.exampleValue));
	}

	errors.push(...ApiPropertyGetArrayOptionsErrors(properties, target, propertyKey));

	if (errors.length > 0) {
		throw ErrorException(`ApiPropertyNumber error: ${errors.join("\n")}`);
	}
}
