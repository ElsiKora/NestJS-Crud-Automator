import type { ApiPropertyOptions } from "@nestjs/swagger";
import type { TApiPropertyDateProperties } from "@type/decorator/api/property";

import { EApiPropertyDataType, EApiPropertyDateIdentifier, EApiPropertyDateType } from "@enum/decorator/api";
import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiResponseProperty } from "@nestjs/swagger";
import { Exclude, Expose, Transform } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, ArrayNotEmpty, IsArray, IsDate, IsOptional } from "class-validator";

/**
 * Creates a decorator that applies NestJS Swagger and class-validator/class-transformer decorators
 * for date properties in DTOs.
 *
 * This decorator handles date properties with support for:
 * - Various date formats (date, datetime, time)
 * - Predefined date types (createdAt, updatedAt, expiresIn, etc.)
 * - Single dates or arrays of dates
 * - Response/Request specific decorators
 * - Automatic transformation from string to Date objects
 * - Validation with appropriate patterns for each format
 *
 * The decorator provides appropriate examples and validation patterns based on the format,
 * and handles string-to-Date transformation for request DTOs.
 * @param {TApiPropertyDateProperties} properties - Configuration options for the date property
 * @returns {Function} A decorator function that can be applied to a class property
 * @example
 * ```typescript
 * // Simple date property (YYYY-MM-DD)
 * class EventDto {
 *   @ApiPropertyDate({
 *     entity: { name: 'Event' },
 *     identifier: EApiPropertyDateIdentifier.DATE,
 *     format: EApiPropertyDateType.DATE,
 *     isRequired: true
 *   })
 *   date: Date;
 * }
 *
 * // DateTime property for createdAt (ISO format)
 * class UserDto {
 *   @ApiPropertyDate({
 *     entity: { name: 'User' },
 *     identifier: EApiPropertyDateIdentifier.CREATED_AT,
 *     format: EApiPropertyDateType.DATE_TIME,
 *     isResponse: true
 *   })
 *   createdAt: Date;
 * }
 *
 * // Array of time values
 * class ScheduleDto {
 *   @ApiPropertyDate({
 *     entity: { name: 'Schedule' },
 *     identifier: EApiPropertyDateIdentifier.DATE,
 *     format: EApiPropertyDateType.TIME,
 *     isArray: true,
 *     minItems: 1,
 *     maxItems: 10,
 *     isUniqueItems: true
 *   })
 *   availableTimes: Date[];
 * }
 * ```
 */
export function ApiPropertyDate(properties: TApiPropertyDateProperties): PropertyDecorator {
	validateOptions(properties);

	const apiPropertyOptions: ApiPropertyOptions = buildApiPropertyOptions(properties);
	const decorators: Array<PropertyDecorator> = buildDecorators(properties, apiPropertyOptions);

	return applyDecorators(...decorators);
}

/**
 * Builds the API property options object from the provided date property configuration
 * @param {TApiPropertyDateProperties} properties - The date property configuration
 * @returns {ApiPropertyOptions} The Swagger API property options object
 * @private
 */
function buildApiPropertyOptions(properties: TApiPropertyDateProperties): ApiPropertyOptions {
	const example: string = getExample(properties.format);

	const apiPropertyOptions: ApiPropertyOptions = {
		description: `${String(properties.entity.name)} ${getDescription(properties.identifier)}`,
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		nullable: !!properties.isNullable,
		type: EApiPropertyDataType.STRING,
	};

	apiPropertyOptions.required = properties.isRequired;

	if (properties.isArray) {
		apiPropertyOptions.isArray = true;
		apiPropertyOptions.minItems = properties.minItems;
		apiPropertyOptions.maxItems = properties.maxItems;
		apiPropertyOptions.uniqueItems = properties.isUniqueItems;
		apiPropertyOptions.items = {
			maxLength: example.length,
			minLength: example.length,
		};
		apiPropertyOptions.example = [example];
	} else {
		apiPropertyOptions.minLength = example.length;
		apiPropertyOptions.maxLength = example.length;
		apiPropertyOptions.example = example;
	}

	apiPropertyOptions.pattern = getPattern(properties.format);
	apiPropertyOptions.format = properties.format;

	return apiPropertyOptions;
}

/**
 * Builds all the necessary decorators for the date property based on the configuration
 * @param {TApiPropertyDateProperties} properties - The date property configuration
 * @param {ApiPropertyOptions} apiPropertyOptions - The Swagger API property options
 * @returns {Array<PropertyDecorator>} An array of decorators to apply to the property
 * @private
 */
function buildDecorators(properties: TApiPropertyDateProperties, apiPropertyOptions: ApiPropertyOptions): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [ApiProperty(apiPropertyOptions)];

	decorators.push(...buildResponseDecorators(properties), ...buildRequestDecorators(properties), ...buildFormatDecorators(properties), ...buildTransformDecorators(properties));

	return decorators;
}

/**
 * Builds decorators for date format validation.
 * Applies IsDate validator with appropriate configuration for single values or arrays.
 * @param {TApiPropertyDateProperties} properties - The property configuration
 * @returns {Array<PropertyDecorator>} An array of date format validation decorators
 * @private
 */
function buildFormatDecorators(properties: TApiPropertyDateProperties): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [];
	const isArray: boolean = properties.isArray ?? false;

	if (!properties.isResponse) {
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		decorators.push(IsDate({ each: isArray }));
	}

	return decorators;
}

/**
 * Builds decorators for request validation including optional status,
 * array validation, and size constraints for date properties.
 * @param {TApiPropertyDateProperties} properties - The property configuration
 * @returns {Array<PropertyDecorator>} An array of request validation decorators
 * @private
 */
function buildRequestDecorators(properties: TApiPropertyDateProperties): Array<PropertyDecorator> {
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
 * expose, and exclude decorators for date properties.
 * @param {TApiPropertyDateProperties} properties - The property configuration
 * @returns {Array<PropertyDecorator>} An array of response serialization decorators
 * @private
 */
function buildResponseDecorators(properties: TApiPropertyDateProperties): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [];

	if (properties.isResponse) {
		decorators.push(ApiResponseProperty());

		if (!("isExpose" in properties) || properties.isExpose === undefined || ("isExpose" in properties && properties.isExpose)) {
			decorators.push(Expose());
		} else {
			decorators.push(Exclude());
		}
	}

	return decorators;
}

/**
 * Builds decorators for type transformation from string to Date objects.
 * Handles both single values and arrays with appropriate transformers,
 * including special handling for null/undefined values.
 * @param {TApiPropertyDateProperties} properties - The property configuration
 * @returns {Array<PropertyDecorator>} An array of type transformation decorators
 * @private
 */
function buildTransformDecorators(properties: TApiPropertyDateProperties): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [];

	if (!properties.isResponse) {
		if (properties.isArray) {
			decorators.push(
				Transform(
					({ value }: { value: unknown }) => {
						if (!Array.isArray(value)) {
							const singleValue: string = value as string;

							return singleValue ? [new Date(singleValue)] : [];
						}

						return value.map((dateString: string) => (dateString ? new Date(dateString) : undefined));
					},
					{ toClassOnly: true },
				),
			);
		} else {
			decorators.push(Transform(({ value }: { value: string }) => (value ? new Date(value) : undefined), { toClassOnly: true }));
		}
	}

	return decorators;
}

/**
 * Gets the appropriate description text based on the date property identifier.
 * Maps identifiers like CREATED_AT, UPDATED_AT, EXPIRES_IN to human-readable descriptions.
 * @param {EApiPropertyDateIdentifier} identifier - The date property identifier
 * @returns {string} The human-readable description for the date property
 * @private
 */
function getDescription(identifier: EApiPropertyDateIdentifier): string {
	switch (identifier) {
		case EApiPropertyDateIdentifier.CREATED_AT: {
			return "creation date";
		}

		case EApiPropertyDateIdentifier.CREATED_AT_FROM: {
			return "createdAt from";
		}

		case EApiPropertyDateIdentifier.CREATED_AT_TO: {
			return "createdAt to";
		}

		case EApiPropertyDateIdentifier.DATE: {
			return "date";
		}

		case EApiPropertyDateIdentifier.EXPIRES_IN: {
			return "expiration date";
		}

		case EApiPropertyDateIdentifier.RECEIVED_AT: {
			return "receivedAt date";
		}

		case EApiPropertyDateIdentifier.RECEIVED_AT_FROM: {
			return "receivedAt from";
		}

		case EApiPropertyDateIdentifier.RECEIVED_AT_TO: {
			return "receivedAt to";
		}

		case EApiPropertyDateIdentifier.REFRESH_IN: {
			return "refresh date";
		}

		case EApiPropertyDateIdentifier.UPDATED_AT: {
			return "last update date";
		}

		case EApiPropertyDateIdentifier.UPDATED_AT_FROM: {
			return "updatedAt from";
		}

		case EApiPropertyDateIdentifier.UPDATED_AT_TO: {
			return "updatedAt to";
		}
	}
}

/**
 * Generates an example date string based on the specified format.
 * Creates examples for DATE (YYYY-MM-DD), DATE_TIME (ISO), and TIME (HH:MM:SS) formats
 * using the start of the current year as a reference.
 * @param {EApiPropertyDateType} format - The date format type
 * @returns {string} An example date string in the specified format
 * @private
 */
function getExample(format: EApiPropertyDateType): string {
	const startOfYearUTCDate: Date = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1, 0, 0, 0, 0));

	switch (format) {
		case EApiPropertyDateType.DATE: {
			return startOfYearUTCDate.toISOString().split("T")[0] ?? "2025-01-01";
		}

		case EApiPropertyDateType.DATE_TIME: {
			return startOfYearUTCDate.toISOString();
		}

		case EApiPropertyDateType.TIME: {
			return startOfYearUTCDate.toISOString().split("T")[1]?.split(".")[0] ?? "00:00:00";
		}
	}
}

/**
 * Gets the appropriate regex pattern for validating a date string in the specified format.
 * Provides patterns for DATE (YYYY-MM-DD), DATE_TIME (ISO format), and TIME (HH:MM:SS) formats.
 * @param {EApiPropertyDateType} format - The date format type
 * @returns {string} A regex pattern string for validating the date format
 * @private
 */
function getPattern(format: EApiPropertyDateType): string {
	switch (format) {
		case EApiPropertyDateType.DATE: {
			return "^[0-9]{4}-[0-9]{2}-[0-9]{2}$";
		}

		case EApiPropertyDateType.DATE_TIME: {
			return "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z$";
		}

		case EApiPropertyDateType.TIME: {
			return "^[0-9]{2}:[0-9]{2}:[0-9]{2}$";
		}
	}
}

/**
 * Validates the configuration options for the API property date.
 * Checks for logical consistency in array options including min/max items,
 * unique items constraints, and other validation rules.
 * @param {TApiPropertyDateProperties} properties - The property configuration to validate
 * @returns {void}
 * @throws {Error} If the configuration is invalid with detailed error messages
 * @private
 */
function validateOptions(properties: TApiPropertyDateProperties): void {
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
		throw new Error(`ApiPropertyDate error: ${errors.join("\n")}`);
	}
}
