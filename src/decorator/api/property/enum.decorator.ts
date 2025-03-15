import type { ApiPropertyOptions } from "@nestjs/swagger";

import type { TApiPropertyEnumProperties } from "../../../type/decorator/api/property/enum-properties.type";

import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiResponseProperty } from "@nestjs/swagger";
import { Exclude, Expose } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, ArrayNotEmpty, IsArray, IsEnum, IsOptional } from "class-validator";

export function ApiPropertyEnum(properties: TApiPropertyEnumProperties): <Y>(target: object, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void {
	validateOptions(properties);

	const apiPropertyOptions: ApiPropertyOptions = buildApiPropertyOptions(properties);
	const decorators: Array<PropertyDecorator> = buildDecorators(properties, apiPropertyOptions);

	return applyDecorators(...decorators);
}

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

function buildDecorators(properties: TApiPropertyEnumProperties, apiPropertyOptions: ApiPropertyOptions): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [ApiProperty(apiPropertyOptions)];

	decorators.push(...buildResponseDecorators(properties), ...buildRequestDecorators(properties), ...buildFormatDecorators(properties));

	return decorators;
}

function buildFormatDecorators(properties: TApiPropertyEnumProperties): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [];
	const isArray: boolean = properties.isArray ?? false;

	// eslint-disable-next-line @elsikora/typescript/naming-convention
	decorators.push(IsEnum(properties.enum, { each: isArray }));

	return decorators;
}

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
