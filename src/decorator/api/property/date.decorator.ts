import type { ApiPropertyOptions } from "@nestjs/swagger";
import type { TApiEntityReference } from "@type/api-entity-reference.type";
import type { TApiPropertyDateProperties } from "@type/decorator/api/property";
import type { ValidationOptions } from "class-validator";

import { PROPERTY_DATE_DECORATOR_API_CONSTANT } from "@constant/decorator/api/property-date.constant";
import { EApiPropertyDataType, EApiPropertyDateIdentifier, EApiPropertyDateType } from "@enum/decorator/api";
import { EManualDtoPropertyMetadataDecorator } from "@enum/utility/manual-dto-property-metadata-decorator.enum";
import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiResponseProperty } from "@nestjs/swagger";
import { ApiPropertyGetArrayOptionsErrors } from "@utility/api/property-get-array-options-errors.utility";
import { ApplyAutoDtoResponseExposure } from "@utility/apply-auto-dto-response-exposure.utility";
import { ApplyAutoExpose } from "@utility/apply-auto-expose.utility";
import { RegisterManualDtoPropertyMetadata } from "@utility/dto/manual/property-metadata/register.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { IsDateFormatValue } from "@utility/is/date-format-value.utility";
import { WithResolvedPropertyEntity } from "@utility/with-resolved-property-entity.utility";
import { ArrayUniqueItemsValidator } from "@validator/array-unique-items.validator";
import { Exclude, Transform } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, ArrayNotEmpty, buildMessage, IsArray, Validate, ValidateBy, ValidateIf } from "class-validator";

/**
 * Creates a decorator that applies NestJS Swagger and class-validator/class-transformer decorators
 * for date properties in DTOs.
 *
 * This decorator handles date properties with support for:
 * - Various date formats (date, datetime, time)
 * - Predefined date types (createdAt, updatedAt, expiresIn, etc.)
 * - Single dates or arrays of dates
 * - Response/Request specific decorators
 * - Request values held to the published text form of the format: `DATE` and `TIME` stay text, a `DATE_TIME` UTC instant becomes a Date
 * - A request body is checked only where a host ValidationPipe validates it; GET_LIST filter values are checked by the route itself
 *
 * The decorator provides appropriate examples and validation patterns based on the format,
 * and holds request values to that pattern.
 * @param {TApiPropertyDateProperties} properties - Configuration options for the date property
 * @returns {PropertyDecorator} A decorator function that can be applied to a class property
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/api-reference/decorators/api-property/api-property-date | API Reference - ApiPropertyDate}
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
 *   date: string;
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
 *   availableTimes: string[];
 * }
 * ```
 */
export function ApiPropertyDate(properties: TApiPropertyDateProperties): PropertyDecorator {
	return (target: object, propertyKey: string | symbol): void => {
		WithResolvedPropertyEntity(properties.entity, "ApiPropertyDate", (resolvedEntity: TApiEntityReference) => {
			const normalizedProperties: TApiPropertyDateProperties = { ...properties, entity: resolvedEntity };

			validateOptions(normalizedProperties, target, propertyKey);
			RegisterManualDtoPropertyMetadata(target, propertyKey, {
				apply: ApiPropertyDate(normalizedProperties),
				decorator: EManualDtoPropertyMetadataDecorator.DATE,
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
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		required: properties.isRequired,
		type: EApiPropertyDataType.STRING,
	};

	if (properties.isArray) {
		apiPropertyOptions.isArray = true;
		apiPropertyOptions.minItems = properties.minItems;
		apiPropertyOptions.maxItems = properties.maxItems;
		apiPropertyOptions.uniqueItems = properties.isUniqueItems;
		apiPropertyOptions.items = {
			maxLength: example.length,
			minLength: example.length,
			type: EApiPropertyDataType.STRING,
		};
		apiPropertyOptions.example = [example];
	} else {
		apiPropertyOptions.minLength = example.length;
		apiPropertyOptions.maxLength = example.length;
		apiPropertyOptions.example = example;
	}

	apiPropertyOptions.pattern = PROPERTY_DATE_DECORATOR_API_CONSTANT.PATTERN[properties.format];
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
	return [ApiProperty(apiPropertyOptions), ...buildResponseDecorators(properties), ...buildRequestDecorators(properties), ...buildFormatDecorators(properties), ...buildTransformDecorators(properties)];
}

/**
 * Builds the validator that holds a request value to the published text form of its format.
 * `DATE` is calendar text `YYYY-MM-DD` for an existing day and `TIME` is `HH:mm:ss` text within one day; both stay text.
 * `DATE_TIME` is the UTC instant `YYYY-MM-DDTHH:mm:ss.sssZ`, which the request transform turns into a Date; a valid Date is a server-side value and passes as it is.
 * @param {TApiPropertyDateProperties} properties - The property configuration
 * @returns {Array<PropertyDecorator>} The format validator, or none for a response property
 * @private
 */
function buildFormatDecorators(properties: TApiPropertyDateProperties): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [];

	if (!properties.isResponse) {
		const format: EApiPropertyDateType = properties.format;
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		const validationOptions: ValidationOptions = { each: properties.isArray ?? false };

		decorators.push(
			ValidateBy(
				{
					constraints: [format],
					name: "isDateFormatValue",
					validator: {
						defaultMessage: buildMessage((eachPrefix: string): string => `${eachPrefix}$property must be in ${PROPERTY_DATE_DECORATOR_API_CONSTANT.TEMPLATE[format]} format`, validationOptions),
						validate: (value: unknown): boolean => isPublishedValue(value, format),
					},
				},
				validationOptions,
			),
		);
	}

	return decorators;
}

/**
 * Builds the presence validator for date request properties.
 * @param {TApiPropertyDateProperties} properties - Property configuration that controls required and nullable semantics.
 * @returns {PropertyDecorator} A class-validator presence decorator.
 */
function buildPresenceDecorator(properties: TApiPropertyDateProperties): PropertyDecorator {
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
 * array validation, and size constraints for date properties.
 * @param {TApiPropertyDateProperties} properties - The property configuration
 * @returns {Array<PropertyDecorator>} An array of request validation decorators
 * @private
 */
function buildRequestDecorators(properties: TApiPropertyDateProperties): Array<PropertyDecorator> {
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
			decorators.push(ApplyAutoExpose);
		} else {
			decorators.push(Exclude());
		}
	}

	return decorators;
}

/**
 * Builds the request transform. Only a `DATE_TIME` value in its published form becomes a Date; every other value stays as sent, so the validator names the published form.
 * A `DATE` or `TIME` value is never converted, so the stored text does not depend on the process time zone. An array property wraps a single value.
 * @param {TApiPropertyDateProperties} properties - The property configuration
 * @returns {Array<PropertyDecorator>} The request transform, or none for a response property
 * @private
 */
function buildTransformDecorators(properties: TApiPropertyDateProperties): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [];

	if (!properties.isResponse) {
		const format: EApiPropertyDateType = properties.format;

		if (properties.isArray) {
			decorators.push(
				Transform(
					({ value }: { value: unknown }): unknown => {
						if (value === undefined || value === null) {
							return value;
						}

						return (Array.isArray(value) ? value : [value]).map((item: unknown): unknown => toRequestValue(item, format));
					},
					{ toClassOnly: true },
				),
			);
		} else {
			decorators.push(Transform(({ value }: { value: unknown }): unknown => toRequestValue(value, format), { toClassOnly: true }));
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
 * Checks a request value after the transform against the published form of its format.
 * @param {unknown} value - One request value, or one item of an array property.
 * @param {EApiPropertyDateType} format - Date property format whose published pattern applies.
 * @returns {boolean} True for text in the published form, or a valid Date on a `DATE_TIME` property.
 * @private
 */
function isPublishedValue(value: unknown, format: EApiPropertyDateType): boolean {
	if (value instanceof Date) {
		return format === EApiPropertyDateType.DATE_TIME && !Number.isNaN(value.getTime());
	}

	return IsDateFormatValue(value, format);
}

/**
 * Turns a `DATE_TIME` value in its published form into the instant it names and returns every other value as sent.
 * @param {unknown} value - One request value, or one item of an array property.
 * @param {EApiPropertyDateType} format - Date property format whose published pattern applies.
 * @returns {unknown} A Date for a published instant, otherwise the value as sent.
 * @private
 */
function toRequestValue(value: unknown, format: EApiPropertyDateType): unknown {
	return format === EApiPropertyDateType.DATE_TIME && IsDateFormatValue(value, format) ? new Date(value) : value;
}

/**
 * Validates the configuration options for the API property date.
 * Checks for logical consistency in array options including min/max items,
 * unique items constraints, and other validation rules.
 * @param {TApiPropertyDateProperties} properties - The property configuration to validate
 * @param {object} target - Decorated DTO prototype, or the class of a static property, named in the error.
 * @param {string | symbol} propertyKey - Decorated property key, named in the error.
 * @returns {void}
 * @throws {Error} If the configuration is invalid with detailed error messages
 * @private
 */
function validateOptions(properties: TApiPropertyDateProperties, target: object, propertyKey: string | symbol): void {
	const errors: Array<string> = ApiPropertyGetArrayOptionsErrors(properties, target, propertyKey);

	if (errors.length > 0) {
		throw ErrorException(`ApiPropertyDate error: ${errors.join("\n")}`);
	}
}
