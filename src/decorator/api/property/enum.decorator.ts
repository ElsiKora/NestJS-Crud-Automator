import type { ApiPropertyOptions } from "@nestjs/swagger";
import type { TApiPropertyEnumProperties } from "@type/decorator/api/property/enum-properties.type";

import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiResponseProperty } from "@nestjs/swagger";
import { Exclude, Expose } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, ArrayNotEmpty, IsArray, IsEnum, IsOptional } from "class-validator";

/**
 * Creates a decorator that applies NestJS Swagger and class-validator/class-transformer decorators
 * for enum properties in DTOs.
 *
 * This decorator handles enum properties with support for:
 * - TypeScript enums (both string and numeric)
 * - Single enum values or arrays of enum values
 * - Response/Request specific decorators
 * - Validation to ensure values match enum options
 * - Array validation with min/max items
 * - Automatic generation of example values from enum
 * - Swagger/OpenAPI documentation for enum values
 *
 * The decorator provides proper validation and documentation of enum values, ensuring
 * that only valid options are accepted in requests and properly documented in the API.
 * @param {TApiPropertyEnumProperties} properties - Configuration options for the enum property
 * @returns {Function} A decorator function that can be applied to a class property
 * @example
 * ```typescript
 * // String enum example
 * enum UserRole {
 *   ADMIN = 'admin',
 *   USER = 'user',
 *   GUEST = 'guest'
 * }
 *
 * class UserDto {
 *   @ApiPropertyEnum({
 *     entity: { name: 'User' },
 *     description: 'user role',
 *     enum: UserRole,
 *     enumName: 'UserRole',
 *     isRequired: true,
 *     exampleValue: UserRole.USER
 *   })
 *   role: UserRole;
 * }
 *
 * // Numeric enum example
 * enum Status {
 *   ACTIVE = 1,
 *   INACTIVE = 0,
 *   PENDING = 2
 * }
 *
 * class ProductDto {
 *   @ApiPropertyEnum({
 *     entity: { name: 'Product' },
 *     description: 'status',
 *     enum: Status,
 *     enumName: 'Status',
 *     isRequired: true,
 *     exampleValue: Status.ACTIVE
 *   })
 *   status: Status;
 * }
 *
 * // Array of enum values
 * class PermissionsDto {
 *   @ApiPropertyEnum({
 *     entity: { name: 'Permission' },
 *     description: 'user roles',
 *     enum: UserRole,
 *     enumName: 'UserRole',
 *     isArray: true,
 *     minItems: 1,
 *     maxItems: 3,
 *     isUniqueItems: true,
 *     exampleValue: [UserRole.USER, UserRole.ADMIN]
 *   })
 *   roles: UserRole[];
 * }
 * ```
 */
export function ApiPropertyEnum(properties: TApiPropertyEnumProperties): <Y>(target: object, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void {
	validateOptions(properties);

	const apiPropertyOptions: ApiPropertyOptions = buildApiPropertyOptions(properties);
	const decorators: Array<PropertyDecorator> = buildDecorators(properties, apiPropertyOptions);

	return applyDecorators(...decorators);
}

/**
 * Builds the API property options object from the provided enum property configuration
 * @param {TApiPropertyEnumProperties} properties - The enum property configuration
 * @returns {ApiPropertyOptions} The Swagger API property options object
 * @private
 */
function buildApiPropertyOptions(properties: TApiPropertyEnumProperties): ApiPropertyOptions {
	const apiPropertyOptions: ApiPropertyOptions & Record<string, any> = {
		description: `${String(properties.entity.name)} ${properties.description ?? ""}`,
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		nullable: properties.isNullable,
	};

	apiPropertyOptions.required = properties.isResponse === false || properties.isResponse === undefined ? properties.isRequired : false;

	if (properties.isArray === true) {
		apiPropertyOptions.isArray = true;
		apiPropertyOptions.minItems = properties.minItems;
		apiPropertyOptions.maxItems = properties.maxItems;
		apiPropertyOptions.uniqueItems = properties.isUniqueItems;

		if (properties.exampleValue) {
			apiPropertyOptions.example = Array.isArray(properties.exampleValue) ? properties.exampleValue : [properties.exampleValue];
		} else {
			apiPropertyOptions.example = [Object.values(properties.enum)[0]];
		}
	} else if (properties.exampleValue) {
		apiPropertyOptions.example = properties.exampleValue;
	} else {
		apiPropertyOptions.example = Object.values(properties.enum)[0];
	}

	apiPropertyOptions.enum = properties.enum;

	return apiPropertyOptions;
}

/**
 * Builds all the necessary decorators for the enum property based on the configuration
 * @param {TApiPropertyEnumProperties} properties - The enum property configuration
 * @param {ApiPropertyOptions} apiPropertyOptions - The Swagger API property options
 * @returns {Array<PropertyDecorator>} An array of decorators to apply to the property
 * @private
 */
function buildDecorators(properties: TApiPropertyEnumProperties, apiPropertyOptions: ApiPropertyOptions): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [ApiProperty(apiPropertyOptions)];

	decorators.push(...buildResponseDecorators(properties), ...buildRequestDecorators(properties), ...buildFormatDecorators(properties));

	return decorators;
}

/**
 * Builds decorators for enum validation
 * @param {TApiPropertyEnumProperties} properties - The enum property configuration
 * @returns {Array<PropertyDecorator>} An array of enum validation decorators
 * @private
 */
function buildFormatDecorators(properties: TApiPropertyEnumProperties): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [];
	const isArray: boolean = properties.isArray ?? false;

	// eslint-disable-next-line @elsikora/typescript/naming-convention
	decorators.push(IsEnum(properties.enum, { each: isArray }));

	return decorators;
}

/**
 * Builds decorators for request validation including optional status and array validation
 * @param {TApiPropertyEnumProperties} properties - The enum property configuration
 * @returns {Array<PropertyDecorator>} An array of request validation decorators
 * @private
 */
function buildRequestDecorators(properties: TApiPropertyEnumProperties): Array<PropertyDecorator> {
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
 * @param {TApiPropertyEnumProperties} properties - The enum property configuration
 * @returns {Array<PropertyDecorator>} An array of response serialization decorators
 * @private
 */
function buildResponseDecorators(properties: TApiPropertyEnumProperties): Array<PropertyDecorator> {
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
 * Validates the configuration options for the API property enum
 * @param {TApiPropertyEnumProperties} properties - The property configuration to validate
 * @returns {void}
 * @throws {Error} If the configuration is invalid
 * @private
 */
function validateOptions(properties: TApiPropertyEnumProperties): void {
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

	if (properties.exampleValue && !Object.values(properties.enum).includes(properties.exampleValue)) {
		errors.push("'exampleValue' is not in 'enum'");
	}

	if (errors.length > 0) {
		throw new Error(`ApiPropertyEnum error: ${errors.join("\n")}`);
	}
}
