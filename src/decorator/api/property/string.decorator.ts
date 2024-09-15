import { applyDecorators } from "@nestjs/common";

import { ApiProperty, ApiResponseProperty } from "@nestjs/swagger";

import { Exclude, Expose, Type } from "class-transformer";

import { ArrayMaxSize, ArrayMinSize, ArrayNotEmpty, IsArray, IsDate, IsEmail, IsEnum, IsIP, IsLowercase, IsOptional, IsString, IsUppercase, IsUrl, IsUUID, Length, Matches, Validate } from "class-validator";

import { STRING_PROPERTY_API_INTERFACE_CONSTANT } from "../../../constant";
import { EApiPropertyDataType, EApiPropertyDataTypeString } from "../../../enum";
import { IsRegularExpression } from "../../../validator";

import type { IApiBaseEntity, IApiPropertyStringProperties } from "../../../interface";
import type { ApiPropertyOptions } from "@nestjs/swagger";

export function ApiPropertyString<T extends IApiBaseEntity>(properties: IApiPropertyStringProperties<T>): <TFunction extends Function, Y>(target: object | TFunction, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void {
	if (properties.enum) {
		properties = { ...properties, ...buildOptionsFromEnum(properties) };
	}
	validateOptions<T>(properties);

	const apiPropertyOptions: ApiPropertyOptions = buildApiPropertyOptions<T>(properties);
	const decorators: Array<PropertyDecorator> = buildDecorators<T>(properties, apiPropertyOptions);

	if (properties.description === "message amount pattern") {
		console.log("PODSOS", apiPropertyOptions);
	}

	return applyDecorators(...decorators);
}

function buildOptionsFromEnum<T extends IApiBaseEntity>(properties: IApiPropertyStringProperties<T>): IApiPropertyStringProperties<T> {
	const minLength: number = Number.POSITIVE_INFINITY;
	const maxLength: number = 0;
	const returnProperties: IApiPropertyStringProperties<T> = { ...properties, maxLength, minLength };

	if (properties.enum && returnProperties.minLength !== undefined && returnProperties.maxLength !== undefined) {
		const enumValues: Array<string> = Object.values(properties.enum) as Array<string>;

		for (const value of enumValues) {
			const length: number = value.length;
			returnProperties.minLength = Math.min(returnProperties.minLength, length);
			returnProperties.maxLength = Math.max(returnProperties.maxLength, length);
		}

		returnProperties.example = enumValues[0];
		returnProperties.pattern = `/^(${enumValues.join("|")})$/`;
	}

	return returnProperties;
}

function validateOptions<T extends IApiBaseEntity>(properties: IApiPropertyStringProperties<T>): void {
	const errors: Array<string> = [];

	if (!properties.response && typeof properties.required !== "boolean") {
		errors.push("Required is not defined");
	}

	if (properties.response && properties.required) {
		errors.push("Required is defined for response");
	}

	if ((!properties.response && (!properties.example || !properties.pattern)) || (properties.example && properties.pattern)) {
		const matches: null | RegExpMatchArray = properties.pattern.match(/^\/(.*?)\/([gimuy]*)$/);

		if (matches) {
			const pattern: string = matches[STRING_PROPERTY_API_INTERFACE_CONSTANT.REGEX_PATTERN_INDEX];
			const flags: string = matches[STRING_PROPERTY_API_INTERFACE_CONSTANT.REGEX_FLAGS_INDEX];

			const regex: RegExp = new RegExp(pattern, flags);

			if (Array.isArray(properties.example)) {
				for (const example of properties.example) {
					if (!regex.test(example)) {
						errors.push("RegExp pattern does not match example string: " + example);
					}
				}
			} else if (!regex.test(properties.example)) {
				errors.push("RegExp pattern does not match example string: " + properties.example);
			}
		} else {
			errors.push("Invalid RegExp format: " + properties.pattern);
		}
	}

	if (!EApiPropertyDataTypeString.has(properties.type)) {
		errors.push("Type is not valid for string property: " + properties.type);
	}

	if (properties.minLength !== undefined && properties.maxLength !== undefined && properties.minLength > properties.maxLength) {
		errors.push("Min length is greater than max length");
	}

	if (properties.minLength !== undefined && properties.minLength < 0) {
		errors.push("Min length is less than 0");
	}

	if (properties.maxLength !== undefined && properties.maxLength < 0) {
		errors.push("Max length is less than 0");
	}

	if (properties.example && properties.minLength && properties.example.length < properties.minLength && !Array.isArray(properties.example)) {
		errors.push("Example length is less than min length");
	} else if (properties.example && properties.minLength && Array.isArray(properties.example)) {
		for (const example of properties.example) {
			if (example.length < properties.minLength) {
				errors.push("Example length is less than min length");
			}
		}
	}

	if (properties.example && properties.maxLength && properties.example.length > properties.maxLength && !Array.isArray(properties.example)) {
		errors.push("Example length is greater than max length");
	} else if (properties.example && properties.maxLength && Array.isArray(properties.example)) {
		for (const example of properties.example) {
			if (example.length > properties.maxLength) {
				errors.push("Example length is greater than max length");
			}
		}
	}

	if (properties.isArray) {
		if (properties.minItems !== undefined && properties.maxItems !== undefined && properties.minItems > properties.maxItems) {
			errors.push("Min items is greater than max items");
		}

		if (properties.minItems !== undefined && properties.minItems < 0) {
			errors.push("Min items is less than 0");
		}

		if (properties.maxItems !== undefined && properties.maxItems < 0) {
			errors.push("Max items is less than 0");
		}

		if (properties.uniqueItems === undefined) {
			errors.push("Unique items is not defined");
		}

		if (properties.uniqueItems && properties.maxItems !== undefined && properties.maxItems <= 1) {
			errors.push("Unique items is true but max items is less than or equal to 1");
		}
	}

	if (errors.length > 0) {
		throw new Error(`ApiPropertyString error: ${errors.join("\n")}`);
	}
}

function buildApiPropertyOptions<T extends IApiBaseEntity>(properties: IApiPropertyStringProperties<T>): ApiPropertyOptions {
	const apiPropertyOptions: ApiPropertyOptions & Record<string, any> = {
		description: `${properties.entity.name} ${properties.description || ""}`,
		example: properties.example,
		expose: properties.expose,
		format: properties.format,
		maxLength: properties.maxLength,
		minLength: properties.minLength,
		nullable: properties.nullable,
		pattern: properties.pattern.slice(1, -1),
		required: !properties.response && properties.required,
		type: EApiPropertyDataType.STRING,
	};

	if (properties.enum) {
		apiPropertyOptions.enum = properties.enum;
	}

	if (properties.isArray) {
		apiPropertyOptions.isArray = true;
		apiPropertyOptions.minItems = properties.minItems;
		apiPropertyOptions.maxItems = properties.maxItems;
		apiPropertyOptions.uniqueItems = properties.uniqueItems;
	}

	if (properties.isArray && properties.enum) {
		delete apiPropertyOptions.type;
	} else if (properties.isArray) {
		apiPropertyOptions.type = [EApiPropertyDataType.STRING];
	}

	return apiPropertyOptions;
}

function buildDecorators<T extends IApiBaseEntity>(properties: IApiPropertyStringProperties<T>, apiPropertyOptions: ApiPropertyOptions): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [ApiProperty(apiPropertyOptions)];

	if (properties.response) {
		decorators.push(ApiResponseProperty());

		if (properties.expose === undefined || properties.expose) {
			decorators.push(Expose());
		} else {
			decorators.push(Exclude());
		}
	} else if (properties.isArray) {
		if (!properties.required) {
			decorators.push(IsOptional());
		}

		decorators.push(IsArray(), ArrayNotEmpty());

		if (properties.minItems) {
			decorators.push(ArrayMinSize(properties.minItems));
		}

		if (properties.maxItems) {
			decorators.push(ArrayMaxSize(properties.maxItems));
		}

		if (properties.enum) {
			decorators.push(IsEnum(properties.enum, { each: true }));
		} else {
			switch (properties.type) {
				case EApiPropertyDataType.URL: {
					decorators.push(
						IsUrl(
							{
								protocols: ["https", "http"],
								require_host: true,
								require_protocol: true,
							},
							{ each: true },
						),
					);

					break;
				}

				case EApiPropertyDataType.UUID: {
					decorators.push(IsUUID("all", { each: true }));

					break;
				}

				case EApiPropertyDataType.EMAIL: {
					decorators.push(IsEmail({}, { each: true }));

					break;
				}

				case EApiPropertyDataType.STRING: {
					decorators.push(IsString({ each: true }));

					break;
				}

				case EApiPropertyDataType.UPPERCASE_STRING: {
					decorators.push(IsString({ each: true }), IsUppercase({ each: true }));

					break;
				}

				case EApiPropertyDataType.LOWERCASE_STRING: {
					decorators.push(IsString({ each: true }), IsLowercase({ each: true }));

					break;
				}

				case EApiPropertyDataType.REGEXP: {
					decorators.push(
						Validate(IsRegularExpression, {
							each: true,
							message: `${properties.description} must be valid regular expression string`,
						}),
						Matches(new RegExp(properties.pattern.slice(1, -1))),
						Type(() => RegExp),
					);

					break;
				}

				case EApiPropertyDataType.IP: {
					decorators.push(IsIP(STRING_PROPERTY_API_INTERFACE_CONSTANT.IP_VERSION, { each: true }));

					break;
				}

				default: {
					throw new Error("ApiPropertyString error: Type is not valid for string property: " + properties.type);
				}
			}
		}

		if (properties.pattern) {
			decorators.push(Matches(new RegExp(properties.pattern.slice(1, -1)), { each: true }));
		}

		if (properties.minLength && properties.maxItems) {
			decorators.push(Length(properties.minLength, properties.maxLength, { each: true }));
		}
	} else {
		if (!properties.required) {
			decorators.push(IsOptional());
		}

		if (properties.enum) {
			decorators.push(IsEnum(properties.enum));
		} else {
			switch (properties.type) {
				case EApiPropertyDataType.URL: {
					decorators.push(IsUrl({ protocols: ["https", "http"], require_host: true, require_protocol: true }));

					break;
				}

				case EApiPropertyDataType.UUID: {
					decorators.push(IsUUID());

					break;
				}

				case EApiPropertyDataType.EMAIL: {
					decorators.push(IsEmail());

					break;
				}

				case EApiPropertyDataType.STRING: {
					decorators.push(IsString());

					break;
				}

				case EApiPropertyDataType.UPPERCASE_STRING: {
					decorators.push(IsString(), IsUppercase());

					break;
				}

				case EApiPropertyDataType.LOWERCASE_STRING: {
					decorators.push(IsString(), IsLowercase());

					break;
				}

				case EApiPropertyDataType.REGEXP: {
					decorators.push(
						Validate(IsRegularExpression, { message: `${properties.description} must be valid regular expression string` }),
						Matches(new RegExp(properties.pattern.slice(1, -1))),
						Type(() => RegExp),
					);

					break;
				}

				case EApiPropertyDataType.IP: {
					decorators.push(IsIP(STRING_PROPERTY_API_INTERFACE_CONSTANT.IP_VERSION));

					break;
				}

				case EApiPropertyDataType.DATE_TIME:

				case EApiPropertyDataType.DATE: {
					decorators.push(
						IsDate(),
						Type(() => Date),
					);

					break;
				}

				default: {
					throw new Error("ApiPropertyString error: Type is not valid for string property: " + properties.type);
				}
			}
		}

		if (properties.pattern && properties.type !== EApiPropertyDataType.DATE_TIME && properties.type !== EApiPropertyDataType.DATE) {
			decorators.push(Matches(new RegExp(properties.pattern.slice(1, -1))));
		}

		if (properties.minLength && properties.maxItems) {
			decorators.push(Length(properties.minLength, properties.maxLength));
		}
	}

	return decorators;
}
