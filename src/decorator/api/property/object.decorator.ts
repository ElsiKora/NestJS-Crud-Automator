import type { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { Type as NestType } from "@nestjs/common";
import type { ApiPropertyOptions } from "@nestjs/swagger";
import type { TApiPropertyObjectProperties } from "@type/decorator/api/property";
import type { ClassConstructor } from "class-transformer";

import { EManualDtoPropertyMetadataDecorator } from "@enum/utility/dto/manual/property-metadata/decorator.enum";
import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiResponseProperty, getSchemaPath } from "@nestjs/swagger";
import { ApplyAutoDtoResponseExposure } from "@utility/apply-auto-dto-response-exposure.utility";
import { CamelCaseString } from "@utility/camel-case-string.utility";
import { DtoGenerateContextualManualDto } from "@utility/dto/generate/manual-child.utility";
import { RegisterManualDtoPropertyMetadata } from "@utility/dto/manual/property-metadata.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { GetAutoDtoContext } from "@utility/get/auto-dto-context.utility";
import { RegisterAutoDtoChild } from "@utility/register-auto-dto-child.utility";
import { WithResolvedPropertyEntity } from "@utility/with-resolved-property-entity.utility";
import { MustMatchOneOfSchemasValidator } from "@validator/must-match-one-of-schemas.validator";
import { Exclude, Expose, Transform, Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, ArrayNotEmpty, IsArray, IsOptional, ValidateNested } from "class-validator";

/**
 * Creates a decorator that applies NestJS Swagger and class-validator/class-transformer decorators
 * for object properties in DTOs.
 *
 * This decorator handles complex object properties with support for:
 * - Single type objects
 * - Polymorphic objects (with discriminator)
 * - Arrays of objects
 * - Response/Request specific decorators
 * - Validation rules
 * - Transformation rules
 * @param {TApiPropertyObjectProperties} options - Configuration options for the object property
 * @returns {Function} A decorator function that can be applied to a class property
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/api-reference/decorators/api-property/api-property-object | API Reference - ApiPropertyObject}
 * @example
 * ```typescript
 * class UserDto {
 *   @ApiPropertyObject({
 *     entity: { name: 'Address' },
 *     type: AddressDto,
 *     isRequired: true,
 *     shouldValidateNested: true
 *   })
 *   address: AddressDto;
 * }
 * ```
 */
export function ApiPropertyObject(options: TApiPropertyObjectProperties): PropertyDecorator {
	return (target: object, propertyKey: string | symbol): void => {
		WithResolvedPropertyEntity(options.entity, "ApiPropertyObject", (resolvedEntity: IApiBaseEntity | NestType<IApiBaseEntity>) => {
			const normalizedOptions: TApiPropertyObjectProperties = resolveContextualObjectOptions(target, propertyKey, { ...options, entity: resolvedEntity });

			RegisterAutoDtoChild(target, normalizedOptions.type);

			validateOptions(normalizedOptions);
			RegisterManualDtoPropertyMetadata(target, propertyKey, {
				apply: ApiPropertyObject(normalizedOptions),
				decorator: EManualDtoPropertyMetadataDecorator.OBJECT,
				properties: normalizedOptions,
			});

			const apiPropertyOptions: ApiPropertyOptions = buildApiPropertyOptions(normalizedOptions);
			const decorators: Array<PropertyDecorator> = buildDecorators(normalizedOptions, apiPropertyOptions);

			applyDecorators(...decorators)(target, propertyKey);
			ApplyAutoDtoResponseExposure(target, propertyKey, normalizedOptions);
		});
	};
}

/**
 * Builds the API property options object from the provided property configuration.
 * Handles different scenarios including single type, multiple types, dynamically generated types, and arrays.
 * @param {TApiPropertyObjectProperties} properties - The property configuration
 * @returns {ApiPropertyOptions} The Swagger API property options object
 * @private
 */
function buildApiPropertyOptions(properties: TApiPropertyObjectProperties): ApiPropertyOptions {
	const apiPropertyOptions: ApiPropertyOptions = {
		description: `${String(properties.entity.name)} ${properties.description ?? ""}`,
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		nullable: !!properties.isNullable,
	};

	if (Array.isArray(properties.type)) {
		// eslint-disable-next-line @elsikora/typescript/no-unsafe-function-type
		apiPropertyOptions.oneOf = properties.type.map((type: Function) => {
			return { $ref: getSchemaPath(type) };
		});

		if (properties.discriminator) {
			apiPropertyOptions.discriminator = {
				// eslint-disable-next-line @elsikora/typescript/no-unsafe-function-type
				mapping: Object.fromEntries(Object.keys(properties.discriminator.mapping).map((key: string) => [key, getSchemaPath(properties.discriminator?.mapping[key] as Function)])),
				propertyName: properties.discriminator.propertyName,
			};
		}

		apiPropertyOptions.type = "object" as never;
	} else if ("isDynamicallyGenerated" in properties && properties.isDynamicallyGenerated) {
		// eslint-disable-next-line @elsikora/typescript/no-unsafe-function-type
		apiPropertyOptions.oneOf = Object.entries(properties.generatedDTOs).map(([_key, value]: [string, Function]) => {
			return { $ref: getSchemaPath(value) };
		});

		if (properties.discriminator) {
			apiPropertyOptions.discriminator = {
				// eslint-disable-next-line @elsikora/typescript/no-unsafe-function-type
				mapping: Object.fromEntries(Object.keys(properties.discriminator.mapping).map((key: string) => [key, getSchemaPath(properties.generatedDTOs[key] as Function)])),
				propertyName: properties.discriminator.propertyName,
			};
		}

		apiPropertyOptions.type = "object" as never;
	} else {
		apiPropertyOptions.type = properties.type;
	}

	apiPropertyOptions.required = properties.isRequired;

	if (properties.additionalProperties) {
		apiPropertyOptions.additionalProperties = properties.additionalProperties;
	}

	if (properties.isArray) {
		apiPropertyOptions.isArray = true;
		apiPropertyOptions.minItems = properties.minItems;
		apiPropertyOptions.maxItems = properties.maxItems;
		apiPropertyOptions.uniqueItems = properties.isUniqueItems;
		apiPropertyOptions.description = `Array of ${String(properties.entity.name)} ${properties.description ?? ""}`;
	}

	return apiPropertyOptions;
}

/**
 * Builds all the necessary decorators for the property based on the configuration.
 * Combines API property decorators, response decorators, request decorators, transform decorators,
 * and validation decorators.
 * @param {TApiPropertyObjectProperties} properties - The property configuration
 * @param {ApiPropertyOptions} apiPropertyOptions - The Swagger API property options
 * @returns {Array<PropertyDecorator>} An array of decorators to apply to the property
 * @private
 */
function buildDecorators(properties: TApiPropertyObjectProperties, apiPropertyOptions: ApiPropertyOptions): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [ApiProperty(apiPropertyOptions)];

	decorators.push(...buildResponseDecorators(properties), ...buildRequestDecorators(properties), ...buildTransformDecorators(properties), ...buildObjectValidationDecorators(properties));

	return decorators;
}

/**
 * Builds decorators for validation of nested objects.
 * @param {TApiPropertyObjectProperties} properties - The property configuration
 * @returns {Array<PropertyDecorator>} An array of object validation decorators
 * @private
 */
function buildObjectValidationDecorators(properties: TApiPropertyObjectProperties): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [];
	const isArray: boolean = properties.isArray ?? false;

	if (!properties.isResponse && properties.shouldValidateNested) {
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		decorators.push(ValidateNested({ each: isArray }));
	}

	return decorators;
}

/**
 * Builds decorators for request validation including optional status,
 * array validation, and size constraints.
 * @param {TApiPropertyObjectProperties} properties - The property configuration
 * @returns {Array<PropertyDecorator>} An array of request validation decorators
 * @private
 */
function buildRequestDecorators(properties: TApiPropertyObjectProperties): Array<PropertyDecorator> {
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
 * expose, and exclude decorators.
 * @param {TApiPropertyObjectProperties} properties - The property configuration
 * @returns {Array<PropertyDecorator>} An array of response serialization decorators
 * @private
 */
function buildResponseDecorators(properties: TApiPropertyObjectProperties): Array<PropertyDecorator> {
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
 * Builds decorators for type transformation including handling of discriminator-based
 * polymorphic objects.
 * @param {TApiPropertyObjectProperties} properties - The property configuration
 * @returns {Array<PropertyDecorator>} An array of type transformation decorators
 * @private
 */
function buildTransformDecorators(properties: TApiPropertyObjectProperties): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [];

	if (Array.isArray(properties.type) && properties.discriminator) {
		decorators.push(
			MustMatchOneOfSchemasValidator({
				discriminator: properties.discriminator,
				schemas: properties.type,
			}),
			Type(() => Object, {
				discriminator: {
					property: properties.discriminator.propertyName,
					subTypes: Object.entries(properties.discriminator.mapping).map(([key, value]: [string, ClassConstructor<unknown>]) => {
						return { name: key, value };
					}),
				},
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				keepDiscriminatorProperty: properties.discriminator.shouldKeepDiscriminatorProperty,
			}),
		);
	} else if ("isDynamicallyGenerated" in properties && properties.isDynamicallyGenerated) {
		decorators.push(
			MustMatchOneOfSchemasValidator({
				discriminator: properties.discriminator,
				schemas: properties.generatedDTOs,
			}),
			Type(() => Object, {
				discriminator: {
					property: properties.discriminator.propertyName,
					subTypes: Object.entries(properties.discriminator.mapping).map(([key, value]: [string, string]) => {
						return { name: key, value: properties.generatedDTOs[value] as ClassConstructor<unknown> };
					}),
				},
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				keepDiscriminatorProperty: properties.discriminator.shouldKeepDiscriminatorProperty,
			}),
		);
	} else {
		if (properties.type === Object) {
			decorators.push(
				Transform(
					({ key, obj }: { key: string; obj: Record<string, unknown> }) => {
						return obj[key];
					},
					{ toClassOnly: true },
				),
			);
		} else if (properties.type !== undefined) {
			decorators.push(Type(() => properties.type as () => unknown));
		}
	}

	return decorators;
}

/**
 * Replaces manual nested DTO references with context-specific generated wrappers when the property
 * is applied inside an auto-generated DTO scope.
 * @param {object} target - Decorated DTO prototype.
 * @param {string | symbol} propertyKey - Decorated property key.
 * @param {TApiPropertyObjectProperties} properties - Normalized object property options.
 * @returns {TApiPropertyObjectProperties} Contextualized object property options.
 */
function resolveContextualObjectOptions(target: object, propertyKey: string | symbol, properties: TApiPropertyObjectProperties): TApiPropertyObjectProperties {
	const context: { dtoType: EApiDtoType; method: EApiRouteType } | undefined = GetAutoDtoContext(target);
	const parentDtoName: string | undefined = (target as { constructor?: { name?: string } }).constructor?.name;

	if (!context || !parentDtoName || ("isDynamicallyGenerated" in properties && properties.isDynamicallyGenerated)) {
		return properties;
	}

	if (Array.isArray(properties.type)) {
		const resolvedTypes: Array<NestType<unknown>> = (properties.type as Array<NestType<unknown>>).map((type: NestType<unknown>): NestType<unknown> => {
			const variantName: string | undefined = properties.discriminator ? Object.entries(properties.discriminator.mapping).find(([, value]: [string, ClassConstructor<unknown>]) => value === type)?.[0] : undefined;

			return resolveContextualObjectType(type, context.method, context.dtoType, parentDtoName, propertyKey, variantName);
		});

		if (!properties.discriminator) {
			return {
				...properties,
				type: resolvedTypes,
			} as TApiPropertyObjectProperties;
		}

		const resolvedMapping: Record<string, ClassConstructor<unknown>> = Object.fromEntries(
			Object.entries(properties.discriminator.mapping).map(([key, value]: [string, ClassConstructor<unknown>]) => {
				return [key, resolveContextualObjectType(value, context.method, context.dtoType, parentDtoName, propertyKey, key) as ClassConstructor<unknown>];
			}),
		) as Record<string, ClassConstructor<unknown>>;

		return {
			...properties,
			discriminator: {
				...properties.discriminator,
				mapping: resolvedMapping,
			},
			type: resolvedTypes,
		} as TApiPropertyObjectProperties;
	}

	const resolvedType: NestType<unknown> | undefined = properties.type ? resolveContextualObjectType(properties.type as NestType<unknown>, context.method, context.dtoType, parentDtoName, propertyKey) : properties.type;

	return {
		...properties,
		type: resolvedType,
	} as TApiPropertyObjectProperties;
}

/**
 * Generates a contextual wrapper for a nested manual DTO type when possible.
 * @param {Type<unknown>} type - Original nested DTO type.
 * @param {string} method - Auto DTO route method.
 * @param {string} dtoType - Auto DTO type.
 * @param {string} parentDtoName - Parent generated DTO class name.
 * @param {string | symbol} propertyKey - Current property key.
 * @param {string} [variantName] - Optional discriminator variant suffix.
 * @returns {Type<unknown>} Contextualized nested DTO type.
 */
function resolveContextualObjectType(type: NestType<unknown>, method: EApiRouteType, dtoType: EApiDtoType, parentDtoName: string, propertyKey: string | symbol, variantName?: string): NestType<unknown> {
	if (type === (Object as unknown as NestType<unknown>)) {
		return type;
	}

	const propertyPathSegment: string = variantName ? `${String(propertyKey)}${CamelCaseString(variantName)}` : String(propertyKey);

	return DtoGenerateContextualManualDto(type, method, dtoType, parentDtoName, propertyPathSegment);
}

/**
 * Validates the configuration options for the API property object.
 * Throws an error if the configuration is invalid.
 * @param {TApiPropertyObjectProperties} properties - The property configuration to validate
 * @returns {void}
 * @throws {Error} If the configuration is invalid
 * @private
 */
function validateOptions(properties: TApiPropertyObjectProperties): void {
	const errors: Array<string> = [];

	if (properties.isArray && !properties.shouldValidateNested && !properties.isResponse) {
		errors.push("Array property must be 'shouldValidateNested'");
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
		throw ErrorException(`ApiPropertyObject error: ${errors.join("\n")}`);
	}
}
