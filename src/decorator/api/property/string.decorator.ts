import type { ApiPropertyOptions } from "@nestjs/swagger";
import type { TApiPropertyStringProperties } from "@type/decorator/api/property";

import { STRING_PROPERTY_API_INTERFACE_CONSTANT } from "@constant/interface/api";
import { EApiPropertyDataType, EApiPropertyStringType } from "@enum/decorator/api";
import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiResponseProperty } from "@nestjs/swagger";
import { IsRegularExpressionValidator } from "@validator/is-regular-expression.validator";
import { Exclude, Expose, Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, ArrayNotEmpty, IsArray, IsBase64, IsBtcAddress, IsDataURI, IsDate, IsEmail, IsEthereumAddress, IsFQDN, IsHash, IsHexColor, IsHSL, IsIBAN, IsIP, IsISBN, IsISO31661Alpha2, IsISO31661Alpha3, IsISO4217CurrencyCode, IsJWT, IsLocale, IsLowercase, IsMACAddress, IsMimeType, IsMongoId, IsOptional, IsPhoneNumber, IsPostalCode, IsRgbColor, IsSemVer, IsString, IsTimeZone, IsUppercase, IsUrl, IsUUID, Length, Matches, Validate } from "class-validator";

/**
 * Creates a decorator that applies NestJS Swagger and class-validator/class-transformer decorators
 * for string properties in DTOs.
 *
 * This decorator handles string properties with support for:
 * - Various string formats (email, URL, UUID, IP, date, etc.)
 * - Single strings or arrays of strings
 * - Response/Request specific decorators
 * - Pattern validation with regex
 * - Length validation
 * - Case sensitivity options (uppercase, lowercase)
 * - Transformation rules
 *
 * The decorator applies appropriate validation rules based on the format and configuration.
 * @param {TApiPropertyStringProperties} properties - Configuration options for the string property
 * @returns {Function} A decorator function that can be applied to a class property
 * @example
 * ```typescript
 * // Simple string property
 * class UserDto {
 *   @ApiPropertyString({
 *     entity: { name: 'User' },
 *     description: 'name',
 *     format: EApiPropertyStringType.STRING,
 *     isRequired: true,
 *     minLength: 2,
 *     maxLength: 100,
 *     pattern: '/^[a-zA-Z ]+$/',
 *     exampleValue: 'John Doe'
 *   })
 *   name: string;
 * }
 *
 * // Email format
 * class ContactDto {
 *   @ApiPropertyString({
 *     entity: { name: 'Contact' },
 *     description: 'email address',
 *     format: EApiPropertyStringType.EMAIL,
 *     isRequired: true,
 *     minLength: 5,
 *     maxLength: 255,
 *     pattern: '/^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$/',
 *     exampleValue: 'user@example.com'
 *   })
 *   email: string;
 * }
 *
 * // Array of URLs
 * class WebsitesDto {
 *   @ApiPropertyString({
 *     entity: { name: 'Website' },
 *     description: 'links',
 *     format: EApiPropertyStringType.URL,
 *     isArray: true,
 *     minItems: 1,
 *     maxItems: 5,
 *     isUniqueItems: true,
 *     minLength: 10,
 *     maxLength: 2000,
 *     pattern: '/^https?:\\/\\/[\\w\\-]+(\\.[\\w\\-]+)+[/#?]?.*$/',
 *     exampleValue: ['https://example.com', 'https://another-example.org']
 *   })
 *   websites: string[];
 * }
 * ```
 */
export function ApiPropertyString(properties: TApiPropertyStringProperties): PropertyDecorator {
	validateOptions(properties);

	const apiPropertyOptions: ApiPropertyOptions = buildApiPropertyOptions(properties);
	const decorators: Array<PropertyDecorator> = buildDecorators(properties, apiPropertyOptions);

	return applyDecorators(...decorators);
}

/**
 * Builds the API property options object from the provided property configuration.
 * Sets up string-specific properties including format, pattern, example value,
 * and length constraints.
 * @param {TApiPropertyStringProperties} properties - The property configuration
 * @returns {ApiPropertyOptions} The Swagger API property options object
 * @private
 */
function buildApiPropertyOptions(properties: TApiPropertyStringProperties): ApiPropertyOptions {
	const apiPropertyOptions: ApiPropertyOptions & Record<string, unknown> = {
		description: `${String(properties.entity.name)} ${properties.description ?? ""}`,
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		nullable: !!properties.isNullable,
		type: EApiPropertyDataType.STRING,
	};

	apiPropertyOptions.required = properties.isRequired;

	if (properties.isArray === true) {
		apiPropertyOptions.isArray = true;
		apiPropertyOptions.minItems = properties.minItems;
		apiPropertyOptions.maxItems = properties.maxItems;
		apiPropertyOptions.uniqueItems = properties.isUniqueItems;
		apiPropertyOptions.items = {
			maxLength: properties.maxLength,
			minLength: properties.minLength,
		};
		apiPropertyOptions.example = Array.isArray(properties.exampleValue) ? properties.exampleValue : [properties.exampleValue];
	} else {
		apiPropertyOptions.maxLength = properties.maxLength;
		apiPropertyOptions.minLength = properties.minLength;
		apiPropertyOptions.example = properties.exampleValue;
	}

	apiPropertyOptions.format = properties.format;
	apiPropertyOptions.pattern = properties.pattern.slice(1, -1);

	return apiPropertyOptions;
}

/**
 * Builds all the necessary decorators for the string property based on the configuration.
 * Combines API property decorators, response decorators, request decorators, format decorators,
 * and string validation decorators.
 * @param {TApiPropertyStringProperties} properties - The property configuration
 * @param {ApiPropertyOptions} apiPropertyOptions - The Swagger API property options
 * @returns {Array<PropertyDecorator>} An array of decorators to apply to the property
 * @private
 */
function buildDecorators(properties: TApiPropertyStringProperties, apiPropertyOptions: ApiPropertyOptions): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [ApiProperty(apiPropertyOptions)];

	decorators.push(...buildResponseDecorators(properties), ...buildRequestDecorators(properties), ...buildFormatDecorators(properties), ...buildStringValidationDecorators(properties));

	return decorators;
}

/**
 * Builds decorators for string format validation based on the specified format type.
 * Handles various formats like email, URL, UUID, IP, date, regexp, and case-sensitive strings.
 * Applies appropriate validation decorators for each format type.
 * @param {TApiPropertyStringProperties} properties - The property configuration
 * @returns {Array<PropertyDecorator>} An array of format-specific validation decorators
 * @private
 */
function buildFormatDecorators(properties: TApiPropertyStringProperties): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [];
	const isArray: boolean = properties.isArray ?? false;

	if (properties.isResponse === undefined || !properties.isResponse) {
		// eslint-disable-next-line @elsikora/sonar/max-switch-cases
		switch (properties.format) {
			case EApiPropertyStringType.API_KEY:
			// falls through

			case EApiPropertyStringType.COORDINATES:
			// falls through

			case EApiPropertyStringType.CRON:
			// falls through

			case EApiPropertyStringType.FILE_PATH:
			// falls through

			case EApiPropertyStringType.GIT_COMMIT_SHA:
			// falls through

			case EApiPropertyStringType.HSLA_COLOR:
			// falls through

			case EApiPropertyStringType.LANGUAGE_CODE_ISO639:
			// falls through

			case EApiPropertyStringType.NANOID:
			// falls through

			case EApiPropertyStringType.OAUTH2_SCOPE:
			// falls through

			case EApiPropertyStringType.RGBA_COLOR:
			// falls through

			case EApiPropertyStringType.SLUG:
			// falls through

			case EApiPropertyStringType.STRING:
			// falls through

			case EApiPropertyStringType.ULID:
			// falls through

			case EApiPropertyStringType.URL_PATH:
			// falls through

			case EApiPropertyStringType.USERNAME: {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				decorators.push(IsString({ each: isArray }));

				break;
			}

			case EApiPropertyStringType.BASE64: {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				decorators.push(IsBase64({ each: isArray }));

				break;
			}

			case EApiPropertyStringType.BCRYPT: {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				decorators.push(IsHash("bcrypt", { each: isArray }));

				break;
			}

			case EApiPropertyStringType.BITCOIN_ADDRESS: {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				decorators.push(IsBtcAddress({ each: isArray }));

				break;
			}

			case EApiPropertyStringType.COUNTRY_CODE_ALPHA2: {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				decorators.push(IsISO31661Alpha2({ each: isArray }));

				break;
			}

			case EApiPropertyStringType.COUNTRY_CODE_ALPHA3: {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				decorators.push(IsISO31661Alpha3({ each: isArray }));

				break;
			}

			case EApiPropertyStringType.CURRENCY_CODE: {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				decorators.push(IsISO4217CurrencyCode({ each: isArray }));

				break;
			}

			case EApiPropertyStringType.DATA_URI: {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				decorators.push(IsDataURI({ each: isArray }));

				break;
			}

			case EApiPropertyStringType.DATE: {
				decorators.push(
					// eslint-disable-next-line @elsikora/typescript/naming-convention
					IsDate({ each: isArray }),
					Type(() => Date),
				);

				break;
			}

			case EApiPropertyStringType.DOMAIN: {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				decorators.push(IsFQDN({ each: isArray }));

				break;
			}

			case EApiPropertyStringType.EMAIL: {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				decorators.push(IsEmail({}, { each: isArray }));

				break;
			}

			case EApiPropertyStringType.ETHEREUM_ADDRESS: {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				decorators.push(IsEthereumAddress({ each: isArray }));

				break;
			}

			case EApiPropertyStringType.HASH_MD5: {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				decorators.push(IsHash("md5", { each: isArray }));

				break;
			}

			case EApiPropertyStringType.HASH_SHA256: {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				decorators.push(IsHash("sha256", { each: isArray }));

				break;
			}

			case EApiPropertyStringType.HEX_COLOR: {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				decorators.push(IsHexColor({ each: isArray }));

				break;
			}

			case EApiPropertyStringType.HSL_COLOR: {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				decorators.push(IsHSL({ each: isArray }));

				break;
			}

			case EApiPropertyStringType.IBAN: {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				decorators.push(IsIBAN({ each: isArray }));

				break;
			}

			case EApiPropertyStringType.IPV4: {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				decorators.push(IsIP(STRING_PROPERTY_API_INTERFACE_CONSTANT.IP_VERSION, { each: isArray }));

				break;
			}

			case EApiPropertyStringType.IPV6: {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				decorators.push(IsIP(STRING_PROPERTY_API_INTERFACE_CONSTANT.IP_VERSION_6, { each: isArray }));

				break;
			}

			case EApiPropertyStringType.ISBN: {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				decorators.push(IsISBN(undefined, { each: isArray }));

				break;
			}

			case EApiPropertyStringType.JWT: {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				decorators.push(IsJWT({ each: isArray }));

				break;
			}

			case EApiPropertyStringType.LOCALE: {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				decorators.push(IsLocale({ each: isArray }));

				break;
			}

			case EApiPropertyStringType.LOWERCASE_STRING: {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				decorators.push(IsString({ each: isArray }), IsLowercase({ each: isArray }));

				break;
			}

			case EApiPropertyStringType.MAC_ADDRESS: {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				decorators.push(IsMACAddress({ each: isArray }));

				break;
			}

			case EApiPropertyStringType.MIME_TYPE: {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				decorators.push(IsMimeType({ each: isArray }));

				break;
			}

			case EApiPropertyStringType.MONGODB_OBJECT_ID: {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				decorators.push(IsMongoId({ each: isArray }));

				break;
			}

			case EApiPropertyStringType.PHONE_NUMBER: {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				decorators.push(IsPhoneNumber(undefined, { each: isArray }));

				break;
			}

			case EApiPropertyStringType.POSTAL_CODE: {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				decorators.push(IsPostalCode("any", { each: isArray }));

				break;
			}

			case EApiPropertyStringType.REGEXP: {
				decorators.push(
					Validate(IsRegularExpressionValidator, {
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						each: isArray,
						message: `${String(properties.description)} must be valid regular expression string`,
					}),

					// eslint-disable-next-line @elsikora/typescript/naming-convention
					Matches(new RegExp(properties.pattern.slice(1, -1)), { each: isArray }),
					Type(() => RegExp),
				);

				break;
			}

			case EApiPropertyStringType.RGB_COLOR: {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				decorators.push(IsRgbColor(false, { each: isArray }));

				break;
			}

			case EApiPropertyStringType.SEMVER: {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				decorators.push(IsSemVer({ each: isArray }));

				break;
			}

			case EApiPropertyStringType.TIMEZONE: {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				decorators.push(IsTimeZone({ each: isArray }));

				break;
			}

			case EApiPropertyStringType.UPPERCASE_STRING: {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				decorators.push(IsString({ each: isArray }), IsUppercase({ each: isArray }));

				break;
			}

			case EApiPropertyStringType.URL: {
				decorators.push(
					IsUrl(
						{
							protocols: ["https", "http"],
							// eslint-disable-next-line @elsikora/typescript/naming-convention
							require_host: true,
							// eslint-disable-next-line @elsikora/typescript/naming-convention
							require_protocol: true,
						},
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						{ each: isArray },
					),
				);

				break;
			}

			case EApiPropertyStringType.UUID: {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				decorators.push(IsUUID("all", { each: isArray }));

				break;
			}

			default: {
				throw new Error(`ApiPropertyString error: Format is not valid for string property: ${String(properties.format)}`);
			}
		}
	}

	return decorators;
}

/**
 * Builds decorators for request validation including optional status,
 * array validation, and size constraints for string properties.
 * @param {TApiPropertyStringProperties} properties - The property configuration
 * @returns {Array<PropertyDecorator>} An array of request validation decorators
 * @private
 */
function buildRequestDecorators(properties: TApiPropertyStringProperties): Array<PropertyDecorator> {
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
 * expose, and exclude decorators for string properties.
 * @param {TApiPropertyStringProperties} properties - The property configuration
 * @returns {Array<PropertyDecorator>} An array of response serialization decorators
 * @private
 */
function buildResponseDecorators(properties: TApiPropertyStringProperties): Array<PropertyDecorator> {
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
 * Builds decorators for string-specific validation including pattern matching and length validation.
 * Applies appropriate validation rules for both single string values and arrays of strings.
 * @param {TApiPropertyStringProperties} properties - The property configuration
 * @returns {Array<PropertyDecorator>} An array of string validation decorators
 * @private
 */
function buildStringValidationDecorators(properties: TApiPropertyStringProperties): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [];
	const isArray: boolean = properties.isArray ?? false;

	if (properties.isResponse === false || properties.isResponse === undefined) {
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		Matches(new RegExp(properties.pattern.slice(1, -1)), { each: isArray });

		// eslint-disable-next-line @elsikora/typescript/naming-convention
		Length(properties.minLength, properties.maxLength, { each: isArray });
	}

	return decorators;
}

/**
 * Validates the configuration options for the API property string.
 * Performs extensive validation including:
 * - Pattern and example value consistency
 * - Length constraints (min/max length)
 * - Array options consistency (min/max items, unique items)
 * - Example value length validation against min/max constraints
 * - Regular expression pattern validity
 * @param {TApiPropertyStringProperties} properties - The property configuration to validate
 * @returns {void}
 * @throws {Error} If the configuration is invalid with detailed error messages
 * @private
 */
function validateOptions(properties: TApiPropertyStringProperties): void {
	const errors: Array<string> = [];

	if ((!properties.isResponse && (!properties.exampleValue || !properties.pattern)) || (properties.exampleValue && properties.pattern)) {
		const matches: null | RegExpMatchArray = /^\/(.*?)\/([gimuy]*)$/.exec(properties.pattern);

		if (matches) {
			const pattern: string = matches[STRING_PROPERTY_API_INTERFACE_CONSTANT.REGEX_PATTERN_INDEX] ?? "";
			const flags: string = matches[STRING_PROPERTY_API_INTERFACE_CONSTANT.REGEX_FLAGS_INDEX] ?? "";

			const regex: RegExp = new RegExp(pattern, flags);

			if (Array.isArray(properties.exampleValue)) {
				for (const example of properties.exampleValue) {
					if (!regex.test(example)) {
						errors.push("RegExp 'pattern' does not match example string: " + example);
					}
				}
			} else if (!regex.test(properties.exampleValue)) {
				errors.push("RegExp 'pattern' does not match 'example' string: " + properties.exampleValue);
			}
		} else {
			errors.push("Invalid RegExp 'pattern' format: " + properties.pattern);
		}
	}

	if (properties.minLength > properties.maxLength) {
		errors.push("'minLength' is greater than 'maxLength'");
	}

	if (properties.minLength < 0) {
		errors.push("'minLength' is less than 0");
	}

	if (properties.maxLength < 0) {
		errors.push("'maxLength' is less than 0");
	}

	if (Array.isArray(properties.exampleValue)) {
		for (const example of properties.exampleValue) {
			if (example.length < properties.minLength) {
				errors.push("Example length is less than 'minLength': " + example);
			}
		}
	} else if (properties.exampleValue.length < properties.minLength) {
		errors.push("Example length is less than 'minLength': " + properties.exampleValue);
	}

	if (Array.isArray(properties.exampleValue)) {
		for (const example of properties.exampleValue) {
			if (example.length > properties.maxLength) {
				errors.push("Example length is greater than 'maxLength': " + example);
			}
		}
	} else if (properties.exampleValue.length > properties.maxLength) {
		errors.push("Example length is greater than 'maxLength': " + properties.exampleValue);
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
		throw new Error(`ApiPropertyString error: ${errors.join("\n")}`);
	}
}
