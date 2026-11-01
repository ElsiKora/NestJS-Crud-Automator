import type { ApiPropertyOptions } from "@nestjs/swagger";
import type { TApiEntityReference } from "@type/api-entity-reference.type";
import type { TApiPropertyBooleanProperties } from "@type/decorator/api/property";

import { EApiPropertyDataType } from "@enum/decorator/api";
import { EManualDtoPropertyMetadataDecorator } from "@enum/utility/manual-dto-property-metadata-decorator.enum";
import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiResponseProperty } from "@nestjs/swagger";
import { ApiPropertyGetArrayOptionsErrors } from "@utility/api/property-get-array-options-errors.utility";
import { ApplyAutoDtoResponseExposure } from "@utility/apply-auto-dto-response-exposure.utility";
import { ApplyAutoExpose } from "@utility/apply-auto-expose.utility";
import { ClassTransformerAutomatorTransform } from "@utility/class-transformer/automator-transform.utility";
import { RegisterManualDtoPropertyMetadata } from "@utility/dto/manual/property-metadata/register.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { WithResolvedPropertyEntity } from "@utility/with-resolved-property-entity.utility";
import { ArrayUniqueItemsValidator } from "@validator/array-unique-items.validator";
import { Exclude } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, ArrayNotEmpty, IsArray, IsBoolean, Validate, ValidateIf } from "class-validator";

/**
 * Creates a decorator that applies NestJS Swagger and class-validator/class-transformer decorators
 * for boolean properties in DTOs.
 *
 * This decorator handles boolean properties with support for:
 * - Single boolean values or arrays of booleans
 * - Response/Request specific decorators
 * - Intelligent type conversion from various input types to boolean
 * - Array validation with min/max items
 * - Nullable values
 *
 * The decorator provides smart type conversion that handles string values ('true'/'false', '1'/'0'),
 * number values (0/non-zero), and proper boolean values. This makes it robust when working with
 * form data and query parameters.
 * @param {TApiPropertyBooleanProperties} properties - Configuration options for the boolean property
 * @returns {PropertyDecorator} A decorator function that can be applied to a class property
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/api-reference/decorators/api-property/api-property-boolean | API Reference - ApiPropertyBoolean}
 * @example
 * ```typescript
 * // Simple boolean property
 * class UserDto {
 *   @ApiPropertyBoolean({
 *     entity: { name: 'User' },
 *     description: 'is active',
 *     isRequired: true
 *   })
 *   isActive: boolean;
 * }
 *
 * // Optional boolean property
 * class ProductDto {
 *   @ApiPropertyBoolean({
 *     entity: { name: 'Product' },
 *     description: 'is featured',
 *     isRequired: false
 *   })
 *   isFeatured?: boolean;
 * }
 *
 * // Array of boolean flags
 * class PermissionsDto {
 *   @ApiPropertyBoolean({
 *     entity: { name: 'Permission' },
 *     description: 'flags',
 *     isArray: true,
 *     minItems: 1,
 *     maxItems: 10,
 *     isUniqueItems: false
 *   })
 *   flags: boolean[];
 * }
 * ```
 */
export function ApiPropertyBoolean(properties: TApiPropertyBooleanProperties): PropertyDecorator {
	return (target: object, propertyKey: string | symbol): void => {
		WithResolvedPropertyEntity(properties.entity, "ApiPropertyBoolean", (resolvedEntity: TApiEntityReference) => {
			const normalizedProperties: TApiPropertyBooleanProperties = { ...properties, entity: resolvedEntity };

			validateOptions(normalizedProperties, target, propertyKey);
			RegisterManualDtoPropertyMetadata(target, propertyKey, {
				apply: ApiPropertyBoolean(normalizedProperties),
				decorator: EManualDtoPropertyMetadataDecorator.BOOLEAN,
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
 * Builds the API property options object from the provided property configuration
 * @param {TApiPropertyBooleanProperties} properties - The property configuration
 * @returns {ApiPropertyOptions} The Swagger API property options object
 * @private
 */
function buildApiPropertyOptions(properties: TApiPropertyBooleanProperties): ApiPropertyOptions {
	const apiPropertyOptions: ApiPropertyOptions = {
		description: `${String(properties.entity.name)} ${properties.description ?? ""}`,
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		nullable: !!properties.isNullable,
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		required: properties.isRequired,
		type: EApiPropertyDataType.BOOLEAN,
	};

	if (properties.isArray) {
		apiPropertyOptions.isArray = true;
		apiPropertyOptions.minItems = properties.minItems;
		apiPropertyOptions.maxItems = properties.maxItems;
		apiPropertyOptions.uniqueItems = properties.isUniqueItems;
		apiPropertyOptions.example = [true];
	} else {
		apiPropertyOptions.example = true;
	}

	return apiPropertyOptions;
}

/**
 * Builds all the necessary decorators for the property based on the configuration
 * @param {TApiPropertyBooleanProperties} properties - The property configuration
 * @param {ApiPropertyOptions} apiPropertyOptions - The Swagger API property options
 * @returns {Array<PropertyDecorator>} An array of decorators to apply to the property
 * @private
 */
function buildDecorators(properties: TApiPropertyBooleanProperties, apiPropertyOptions: ApiPropertyOptions): Array<PropertyDecorator> {
	return [ApiProperty(apiPropertyOptions), ...buildResponseDecorators(properties), ...buildRequestDecorators(properties), ...buildFormatDecorators(properties), ...buildTransformDecorators(properties)];
}

/**
 * Builds decorators for format validation
 * @param {TApiPropertyBooleanProperties} properties - The property configuration
 * @returns {Array<PropertyDecorator>} An array of format validation decorators
 * @private
 */
function buildFormatDecorators(properties: TApiPropertyBooleanProperties): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [];
	const isArray: boolean = properties.isArray ?? false;

	if (properties.isResponse === undefined || !properties.isResponse) {
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		decorators.push(IsBoolean({ each: isArray }));
	}

	return decorators;
}

/**
 * Builds the presence validator for boolean request properties.
 * @param {TApiPropertyBooleanProperties} properties - Property configuration that controls required and nullable semantics.
 * @returns {PropertyDecorator} A class-validator presence decorator.
 */
function buildPresenceDecorator(properties: TApiPropertyBooleanProperties): PropertyDecorator {
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
 * Builds decorators for request validation including optional status and array validation
 * @param {TApiPropertyBooleanProperties} properties - The property configuration
 * @returns {Array<PropertyDecorator>} An array of request validation decorators
 * @private
 */
function buildRequestDecorators(properties: TApiPropertyBooleanProperties): Array<PropertyDecorator> {
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
 * Builds decorators for response serialization including API response property and expose/exclude
 * @param {TApiPropertyBooleanProperties} properties - The property configuration
 * @returns {Array<PropertyDecorator>} An array of response serialization decorators
 * @private
 */
function buildResponseDecorators(properties: TApiPropertyBooleanProperties): Array<PropertyDecorator> {
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
 * Builds decorators for type transformation from request text to boolean.
 * Only `true` and `false`, as booleans or as that exact text, are converted; any other value is kept for `IsBoolean` to reject, so `1`, `no`, and `TRUE` return `400`.
 * @param {TApiPropertyBooleanProperties} properties - The property configuration
 * @returns {Array<PropertyDecorator>} An array of type transformation decorators
 * @private
 */
function buildTransformDecorators(properties: TApiPropertyBooleanProperties): Array<PropertyDecorator> {
	if (properties.isResponse) {
		return [];
	}

	if (properties.isArray) {
		return [
			ClassTransformerAutomatorTransform(
				({ value }: { value: unknown }): unknown => {
					if (value === null || value === undefined) {
						return value;
					}

					return Array.isArray(value) ? value.map((item: unknown): unknown => parseBooleanValue(item)) : [parseBooleanValue(value)];
				},
				{ toClassOnly: true },
			),
		];
	}

	return [ClassTransformerAutomatorTransform(({ value }: { value: unknown }): unknown => parseBooleanValue(value), { toClassOnly: true })];
}

/**
 * Converts one request value to a boolean when it is `true` or `false`, as a boolean or as that exact text.
 * @param {unknown} value - Raw request value.
 * @returns {unknown} The boolean, or the value itself for the validator to reject.
 * @private
 */
function parseBooleanValue(value: unknown): unknown {
	if (value === "true") {
		return true;
	}

	if (value === "false") {
		return false;
	}

	return value;
}

/**
 * Validates the configuration options for the API property
 * @param {TApiPropertyBooleanProperties} properties - The property configuration to validate
 * @param {object} target - Decorated DTO prototype, or the class of a static property, named in the error.
 * @param {string | symbol} propertyKey - Decorated property key, named in the error.
 * @returns {void}
 * @throws {Error} If the configuration is invalid
 * @private
 */
function validateOptions(properties: TApiPropertyBooleanProperties, target: object, propertyKey: string | symbol): void {
	const errors: Array<string> = ApiPropertyGetArrayOptionsErrors(properties, target, propertyKey);

	if (errors.length > 0) {
		throw ErrorException(`ApiPropertyBoolean error: ${errors.join("\n")}`);
	}
}
