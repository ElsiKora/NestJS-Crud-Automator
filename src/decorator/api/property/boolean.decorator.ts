import type { Type } from "@nestjs/common";
import type { ApiPropertyOptions } from "@nestjs/swagger";
import type { TApiPropertyBaseProperties } from "@type/decorator/api/property";
import type { IApiBaseEntity } from "index";

import { EApiPropertyDataType } from "@enum/decorator/api";
import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiResponseProperty } from "@nestjs/swagger";
import { WithResolvedPropertyEntity } from "@utility/with-resolved-property-entity.utility";
import { Exclude, Expose, Transform } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, ArrayNotEmpty, IsArray, IsBoolean, IsOptional } from "class-validator";

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
 * @param {TApiPropertyBaseProperties} properties - Configuration options for the boolean property
 * @returns {Function} A decorator function that can be applied to a class property
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
 *     maxItems: 10
 *   })
 *   flags: boolean[];
 * }
 * ```
 */
export function ApiPropertyBoolean(properties: TApiPropertyBaseProperties): PropertyDecorator {
	return (target: object, propertyKey: string | symbol): void => {
		WithResolvedPropertyEntity(properties.entity, "ApiPropertyBoolean", (resolvedEntity: IApiBaseEntity | Type<IApiBaseEntity>) => {
			const normalizedProperties: TApiPropertyBaseProperties = { ...properties, entity: resolvedEntity };

			validateOptions(normalizedProperties);

			const apiPropertyOptions: ApiPropertyOptions = buildApiPropertyOptions(normalizedProperties);
			const decorators: Array<PropertyDecorator> = buildDecorators(normalizedProperties, apiPropertyOptions);

			applyDecorators(...decorators)(target, propertyKey);
		});
	};
}

/**
 * Builds the API property options object from the provided property configuration
 * @param {TApiPropertyBaseProperties} properties - The property configuration
 * @returns {ApiPropertyOptions} The Swagger API property options object
 * @private
 */
function buildApiPropertyOptions(properties: TApiPropertyBaseProperties): ApiPropertyOptions {
	const apiPropertyOptions: ApiPropertyOptions = {
		description: `${String(properties.entity.name)} ${properties.description ?? ""}`,
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		nullable: !!properties.isNullable,
		type: EApiPropertyDataType.BOOLEAN,
	};

	apiPropertyOptions.required = properties.isRequired;

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
 * @param {TApiPropertyBaseProperties} properties - The property configuration
 * @param {ApiPropertyOptions} apiPropertyOptions - The Swagger API property options
 * @returns {Array<PropertyDecorator>} An array of decorators to apply to the property
 * @private
 */
function buildDecorators(properties: TApiPropertyBaseProperties, apiPropertyOptions: ApiPropertyOptions): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [ApiProperty(apiPropertyOptions)];

	decorators.push(...buildResponseDecorators(properties), ...buildRequestDecorators(properties), ...buildFormatDecorators(properties), ...buildTransformDecorators(properties));

	return decorators;
}

/**
 * Builds decorators for format validation
 * @param {TApiPropertyBaseProperties} properties - The property configuration
 * @returns {Array<PropertyDecorator>} An array of format validation decorators
 * @private
 */
function buildFormatDecorators(properties: TApiPropertyBaseProperties): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [];
	const isArray: boolean = properties.isArray ?? false;

	if (properties.isResponse === undefined || !properties.isResponse) {
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		decorators.push(IsBoolean({ each: isArray }));
	}

	return decorators;
}

/**
 * Builds decorators for request validation including optional status and array validation
 * @param {TApiPropertyBaseProperties} properties - The property configuration
 * @returns {Array<PropertyDecorator>} An array of request validation decorators
 * @private
 */
function buildRequestDecorators(properties: TApiPropertyBaseProperties): Array<PropertyDecorator> {
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
 * Builds decorators for response serialization including API response property and expose/exclude
 * @param {TApiPropertyBaseProperties} properties - The property configuration
 * @returns {Array<PropertyDecorator>} An array of response serialization decorators
 * @private
 */
function buildResponseDecorators(properties: TApiPropertyBaseProperties): Array<PropertyDecorator> {
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
 * Builds decorators for type transformation including handling various input types to boolean
 * @param {TApiPropertyBaseProperties} properties - The property configuration
 * @returns {Array<PropertyDecorator>} An array of type transformation decorators
 * @private
 */
function buildTransformDecorators(properties: TApiPropertyBaseProperties): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [];

	if (!properties.isResponse) {
		if (properties.isArray) {
			decorators.push(
				Transform(
					({ value }: { value: unknown }) => {
						if (value === null || value === undefined) {
							return [];
						}

						if (!Array.isArray(value)) {
							const singleValue: unknown = value;

							if (singleValue === undefined || singleValue === null) return [false];

							if (typeof singleValue === "boolean") return [singleValue];

							if (typeof singleValue === "number") return [singleValue !== 0];

							if (typeof singleValue === "string") {
								const normalized: string = singleValue.toLowerCase().trim();

								if (normalized === "true" || normalized === "1") return [true];

								if (normalized === "false" || normalized === "0") return [false];

								return [Boolean(normalized)];
							}

							return [false];
						}

						return value.map((_value: unknown) => {
							if (_value === undefined || _value === null) return false;

							if (typeof _value === "boolean") return _value;

							if (typeof _value === "number") return _value !== 0;

							if (typeof _value === "string") {
								const normalized: string = _value.toLowerCase().trim();

								if (normalized === "true" || normalized === "1") return true;

								if (normalized === "false" || normalized === "0") return false;

								return Boolean(normalized);
							}

							return false;
						});
					},
					{ toClassOnly: true },
				),
			);
		} else {
			decorators.push(
				Transform(
					({ value }: { value: unknown }) => {
						if (value === undefined || value === null) return false;

						if (typeof value === "boolean") return value;

						if (typeof value === "number") return value !== 0;

						if (typeof value === "string") {
							value = value.toLowerCase().trim();

							if (value === "true" || value === "1") return true;

							if (value === "false" || value === "0") return false;

							return Boolean(value);
						}

						return false;
					},
					{ toClassOnly: true },
				),
			);
		}
	}

	return decorators;
}

/**
 * Validates the configuration options for the API property
 * @param {TApiPropertyBaseProperties} properties - The property configuration to validate
 * @returns {void}
 * @throws {Error} If the configuration is invalid
 * @private
 */
function validateOptions(properties: TApiPropertyBaseProperties): void {
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
		throw new Error(`ApiPropertyBoolean error: ${errors.join("\n")}`);
	}
}
