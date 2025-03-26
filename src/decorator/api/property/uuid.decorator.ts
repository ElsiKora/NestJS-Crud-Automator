import type { ApiPropertyOptions } from "@nestjs/swagger";
import type { TApiPropertyUuidProperties } from "@type/decorator/api/property";

import { randomUUID } from "node:crypto";

import { EApiPropertyDataType, EApiPropertyStringType } from "@enum/decorator/api";
import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiResponseProperty } from "@nestjs/swagger";
import { Exclude, Expose } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, ArrayNotEmpty, IsArray, IsOptional, IsUUID } from "class-validator";

/**
 * Creates a decorator that applies NestJS Swagger and class-validator/class-transformer decorators
 * for UUID properties in DTOs.
 *
 * This decorator handles UUID properties with support for:
 * - Single UUID strings
 * - Arrays of UUIDs
 * - Response/Request specific decorators
 * - UUID validation with regex pattern
 * - Transformation rules
 *
 * The decorator automatically generates a UUID example for Swagger documentation and
 * applies appropriate validation rules based on the configuration.
 * @param {TApiPropertyUuidProperties} properties - Configuration options for the UUID property
 * @returns {Function} A decorator function that can be applied to a class property
 * @example
 * ```typescript
 * // Single UUID property
 * class UserDto {
 *   @ApiPropertyUUID({
 *     entity: { name: 'User' },
 *     isRequired: true,
 *     description: 'identifier'
 *   })
 *   id: string;
 * }
 *
 * // Array of UUIDs
 * class UsersListDto {
 *   @ApiPropertyUUID({
 *     entity: { name: 'User' },
 *     isArray: true,
 *     minItems: 1,
 *     maxItems: 10,
 *     isUniqueItems: true,
 *     description: 'identifiers'
 *   })
 *   ids: string[];
 * }
 * ```
 */
export function ApiPropertyUUID(properties: TApiPropertyUuidProperties): <Y>(target: object, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void {
	const uuidExample: string = randomUUID();

	validateOptions(properties);

	const apiPropertyOptions: ApiPropertyOptions = buildApiPropertyOptions(uuidExample, properties);
	const decorators: Array<PropertyDecorator> = buildDecorators(properties, apiPropertyOptions);

	return applyDecorators(...decorators);
}

/**
 * Builds the API property options object from the provided property configuration.
 * Sets up UUID-specific properties including pattern validation, example value,
 * and proper length constraints.
 * @param {string} uuidExample - An example UUID generated for documentation
 * @param {TApiPropertyUuidProperties} properties - The property configuration
 * @returns {ApiPropertyOptions} The Swagger API property options object
 * @private
 */
function buildApiPropertyOptions(uuidExample: string, properties: TApiPropertyUuidProperties): ApiPropertyOptions {
	const apiPropertyOptions: ApiPropertyOptions = {
		description: `${String(properties.entity.name)} ${properties.description ?? "identifier"}`,
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		nullable: properties.isNullable,
		type: EApiPropertyDataType.STRING,
	};

	apiPropertyOptions.required = properties.isResponse === false || properties.isResponse === undefined ? properties.isRequired : false;

	if (properties.isArray) {
		apiPropertyOptions.isArray = true;
		apiPropertyOptions.minItems = properties.minItems;
		apiPropertyOptions.maxItems = properties.maxItems;
		apiPropertyOptions.uniqueItems = properties.isUniqueItems;
		apiPropertyOptions.items = {
			maxLength: uuidExample.length,
			minLength: uuidExample.length,
		};
		apiPropertyOptions.example = [uuidExample];
	} else {
		apiPropertyOptions.minLength = uuidExample.length;
		apiPropertyOptions.maxLength = uuidExample.length;
		apiPropertyOptions.example = uuidExample;
	}

	apiPropertyOptions.format = EApiPropertyStringType.UUID;

	apiPropertyOptions.pattern = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$";

	return apiPropertyOptions;
}

/**
 * Builds all the necessary decorators for the UUID property based on the configuration.
 * Combines API property decorators, response decorators, request decorators, and format decorators.
 * @param {TApiPropertyUuidProperties} properties - The property configuration
 * @param {ApiPropertyOptions} apiPropertyOptions - The Swagger API property options
 * @returns {Array<PropertyDecorator>} An array of decorators to apply to the property
 * @private
 */
function buildDecorators(properties: TApiPropertyUuidProperties, apiPropertyOptions: ApiPropertyOptions): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [ApiProperty(apiPropertyOptions)];

	decorators.push(...buildResponseDecorators(properties), ...buildRequestDecorators(properties), ...buildFormatDecorators(properties));

	return decorators;
}

/**
 * Builds decorators for UUID format validation.
 * Applies IsUUID validator with appropriate configuration for single values or arrays.
 * @param {TApiPropertyUuidProperties} properties - The property configuration
 * @returns {Array<PropertyDecorator>} An array of UUID format validation decorators
 * @private
 */
function buildFormatDecorators(properties: TApiPropertyUuidProperties): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [];
	const isArray: boolean = properties.isArray ?? false;

	// eslint-disable-next-line @elsikora/typescript/naming-convention
	decorators.push(IsUUID(undefined, { each: isArray }));

	return decorators;
}

/**
 * Builds decorators for request validation including optional status,
 * array validation, and size constraints for UUID properties.
 * @param {TApiPropertyUuidProperties} properties - The property configuration
 * @returns {Array<PropertyDecorator>} An array of request validation decorators
 * @private
 */
function buildRequestDecorators(properties: TApiPropertyUuidProperties): Array<PropertyDecorator> {
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
 * expose, and exclude decorators for UUID properties.
 * @param {TApiPropertyUuidProperties} properties - The property configuration
 * @returns {Array<PropertyDecorator>} An array of response serialization decorators
 * @private
 */
function buildResponseDecorators(properties: TApiPropertyUuidProperties): Array<PropertyDecorator> {
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
 * Validates the configuration options for the API property UUID.
 * Checks for logical consistency in array options including min/max items,
 * unique items constraints, and other validation rules.
 * @param {TApiPropertyUuidProperties} properties - The property configuration to validate
 * @returns {void}
 * @throws {Error} If the configuration is invalid
 * @private
 */
function validateOptions(properties: TApiPropertyUuidProperties): void {
	const errors: Array<string> = [];

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
		throw new Error(`ApiPropertyUUID error: ${errors.join("\n")}`);
	}
}
