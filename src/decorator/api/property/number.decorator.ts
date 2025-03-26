import type { ApiPropertyOptions } from "@nestjs/swagger";
import type { TApiPropertyNumberProperties } from "@type/decorator/api/property";

import { NUMBER_CONSTANT } from "@constant/number.constant";
import { EApiPropertyDataType, EApiPropertyNumberType } from "@enum/decorator/api";
import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiResponseProperty } from "@nestjs/swagger";
import { Exclude, Expose, Transform, Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, ArrayNotEmpty, IsArray, IsDivisibleBy, IsInt, isInt, IsNumber, IsOptional, Max, Min } from "class-validator";
import random from "lodash/random";

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
 * - Automatic transformation from string to number
 * - Range validation
 *
 * The decorator can automatically generate an example value within the specified range
 * if one is not provided, and applies appropriate validation rules based on the configuration.
 * @param {TApiPropertyNumberProperties} properties - Configuration options for the number property
 * @returns {Function} A decorator function that can be applied to a class property
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
export function ApiPropertyNumber(properties: TApiPropertyNumberProperties): <Y>(target: object, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void {
	if (properties.exampleValue === undefined) {
		properties.exampleValue = random(properties.minimum, properties.maximum);
	}

	validateOptions(properties);

	const apiPropertyOptions: ApiPropertyOptions = buildApiPropertyOptions(properties);
	const decorators: Array<PropertyDecorator> = buildDecorators(properties, apiPropertyOptions);

	return applyDecorators(...decorators);
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
		nullable: properties.isNullable,
		type: getType(properties),
	};

	apiPropertyOptions.required = properties.isResponse === false || properties.isResponse === undefined ? properties.isRequired : false;

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
	const decorators: Array<PropertyDecorator> = [ApiProperty(apiPropertyOptions)];

	decorators.push(...buildResponseDecorators(properties), ...buildRequestDecorators(properties), ...buildFormatDecorators(properties), ...buildTransformDecorators(properties), ...buildNumberValidationDecorators(properties));

	return decorators;
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
				throw new Error(`ApiPropertyNumber error: Format is not valid for number property: ${String(properties.format)}`);
			}
		}

		decorators.push(Type(() => Number));
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

	if ((properties.isResponse === false || properties.isResponse === undefined) && properties.multipleOf != undefined) {
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		decorators.push(IsDivisibleBy(properties.multipleOf, { each: isArray }), Min(properties.minimum, { each: isArray }), Max(properties.maximum, { each: isArray }));
	}

	return decorators;
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
		if (!properties.isRequired) {
			decorators.push(IsOptional());
		}

		if (properties.isArray === true) {
			decorators.push(IsArray(), ArrayMinSize(properties.minItems), ArrayMaxSize(properties.maxItems));

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

		if (properties.isExpose === undefined || properties.isExpose) {
			decorators.push(Expose());
		} else {
			decorators.push(Exclude());
		}
	}

	return decorators;
}

/**
 * Builds decorators for type transformation from string to number.
 * Handles both single values and arrays with appropriate transformers.
 * @param {TApiPropertyNumberProperties} properties - The property configuration
 * @returns {Array<PropertyDecorator>} An array of type transformation decorators
 * @private
 */
function buildTransformDecorators(properties: TApiPropertyNumberProperties): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [];

	if (!properties.isResponse) {
		if (properties.isArray) {
			decorators.push(Transform(({ value }: { value: Array<string> }) => value.map(Number), { toClassOnly: true }));
		} else {
			decorators.push(Transform(({ value }: { value: string }) => Number(value), { toClassOnly: true }));
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
			throw new Error("ApiPropertyNumber error: Format is not defined");
		}
	}
}

/**
 * Determines the appropriate Swagger data type for the number property.
 * Maps formatter types to the corresponding API property data types.
 * @param {TApiPropertyNumberProperties} properties - The property configuration
 * @returns {EApiPropertyDataType.INTEGER | EApiPropertyDataType.NUMBER} The Swagger data type
 * @private
 */
function getType(properties: TApiPropertyNumberProperties): EApiPropertyDataType.INTEGER | EApiPropertyDataType.NUMBER {
	switch (properties.format) {
		case EApiPropertyNumberType.DOUBLE: {
			return EApiPropertyDataType.NUMBER;
		}

		case EApiPropertyNumberType.INTEGER: {
			return EApiPropertyDataType.INTEGER;
		}
	}
}

/**
 * Validates the configuration options for the API property number.
 * Performs extensive validation including:
 * - Min/max values consistency
 * - Multiple-of constraints and example value compatibility
 * - Example values within min/max range
 * - Array options consistency (min/max items, unique items)
 * @param {TApiPropertyNumberProperties} properties - The property configuration to validate
 * @returns {void}
 * @throws {Error} If the configuration is invalid with detailed error messages
 * @private
 */
function validateOptions(properties: TApiPropertyNumberProperties): void {
	const errors: Array<string> = [];

	if (properties.minimum > properties.maximum) {
		errors.push("'minimum' is greater than maximum");
	}

	if (properties.multipleOf != undefined) {
		if (Array.isArray(properties.exampleValue)) {
			for (const example of properties.exampleValue) {
				if (!isInt(example / properties.multipleOf)) {
					errors.push("'exampleValue' is not a multiple of 'multipleOf' value: " + String(example));
				}
			}
		} else if (properties.exampleValue !== undefined && !isInt(properties.exampleValue / properties.multipleOf)) {
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

	if (properties.isArray === true) {
		if (properties.minItems > properties.maxItems) {
			errors.push("'minItems' is greater than 'maxItems'");
		}

		if (properties.minItems < 0) {
			errors.push("'minItems' is less than 0");
		}

		if (properties.maxItems < 0) {
			errors.push("'maxItems' is less than 0");
		}

		if (properties.isUniqueItems && properties.maxItems <= 1) {
			errors.push("'uniqueItems' is true but 'maxItems' is less than or equal to 1");
		}
	}

	if (errors.length > 0) {
		throw new Error(`ApiPropertyNumber error: ${errors.join("\n")}`);
	}
}
