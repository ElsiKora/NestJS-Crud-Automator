import type { ApiPropertyOptions } from "@nestjs/swagger";

import type { TApiPropertyObjectProperties } from "../../../type/decorator/api/property/object-properties.type";

import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiResponseProperty } from "@nestjs/swagger";
import { Exclude, Expose, Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, ArrayNotEmpty, IsArray, IsOptional, ValidateNested } from "class-validator";

export function ApiPropertyObject(options: TApiPropertyObjectProperties): <Y>(target: object, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void {
	validateOptions(options);

	const apiPropertyOptions: ApiPropertyOptions = buildApiPropertyOptions(options);
	const decorators: Array<PropertyDecorator> = buildDecorators(options, apiPropertyOptions);

	return applyDecorators(...decorators);
}

function buildApiPropertyOptions(properties: TApiPropertyObjectProperties): ApiPropertyOptions {
	const apiPropertyOptions: ApiPropertyOptions = {
		description: `${String(properties.entity.name)} ${properties.description ?? ""}`,
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		nullable: properties.isNullable,
		type: properties.type,
	};

	apiPropertyOptions.required = properties.isResponse === false || properties.isResponse === undefined ? properties.isRequired : false;

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

function buildDecorators(properties: TApiPropertyObjectProperties, apiPropertyOptions: ApiPropertyOptions): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [ApiProperty(apiPropertyOptions)];

	decorators.push(...buildResponseDecorators(properties), ...buildRequestDecorators(properties), ...buildTransformDecorators(properties), ...buildObjectValidationDecorators(properties));

	return decorators;
}

function buildObjectValidationDecorators(properties: TApiPropertyObjectProperties): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [];
	const isArray: boolean = properties.isArray ?? false;

	if (!properties.isResponse && properties.shouldValidateNested) {
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		decorators.push(ValidateNested({ each: isArray }));
	}

	return decorators;
}

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

function buildResponseDecorators(properties: TApiPropertyObjectProperties): Array<PropertyDecorator> {
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

function buildTransformDecorators(properties: TApiPropertyObjectProperties): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [];

	decorators.push(Type(() => properties.type as () => any));

	return decorators;
}

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
		throw new Error(`ApiPropertyString error: ${errors.join("\n")}`);
	}
}
