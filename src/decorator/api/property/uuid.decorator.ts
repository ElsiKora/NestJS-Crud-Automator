import type { ApiPropertyOptions } from "@nestjs/swagger";
import type { TApiPropertyUuidProperties } from "src/type";

import { randomUUID } from "node:crypto";

import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiResponseProperty } from "@nestjs/swagger";
import { Exclude, Expose } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, ArrayNotEmpty, IsArray, IsOptional, IsUUID } from "class-validator";

import { EApiPropertyDataType, EApiPropertyStringType } from "../../../enum";

export function ApiPropertyUUID(properties: TApiPropertyUuidProperties): <Y>(target: object, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void {
	const uuidExample: string = randomUUID();

	validateOptions(properties);

	const apiPropertyOptions: ApiPropertyOptions = buildApiPropertyOptions(uuidExample, properties);
	const decorators: Array<PropertyDecorator> = buildDecorators(properties, apiPropertyOptions);

	return applyDecorators(...decorators);
}

function buildApiPropertyOptions(uuidExample: string, properties: TApiPropertyUuidProperties): ApiPropertyOptions {
	const apiPropertyOptions: ApiPropertyOptions = {
		description: `${properties.entity.name} ${properties.description ?? "identifier"}`,
		// eslint-disable-next-line @elsikora-typescript/naming-convention
		nullable: properties.isNullable,
		type: EApiPropertyDataType.STRING,
	};

	if (properties.isResponse === false || properties.isResponse === undefined) {
		apiPropertyOptions.required = properties.isRequired;
	}

	if (properties.isArray) {
		apiPropertyOptions.isArray = true;
		apiPropertyOptions.minItems = properties.minItems;
		apiPropertyOptions.maxItems = properties.maxItems;
		apiPropertyOptions.uniqueItems = properties.isUniqueItems;
		apiPropertyOptions.items = {
			maxLength: uuidExample.length,
			minLength: uuidExample.length,
		};
		apiPropertyOptions.example = [uuidExample];
	} else {
		apiPropertyOptions.minLength = uuidExample.length;
		apiPropertyOptions.maxLength = uuidExample.length;
		apiPropertyOptions.example = uuidExample;
	}

	apiPropertyOptions.format = EApiPropertyStringType.UUID;

	apiPropertyOptions.pattern = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$";

	return apiPropertyOptions;
}

function validateOptions(properties: TApiPropertyUuidProperties): void {
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
		throw new Error(`ApiPropertyUUID error: ${errors.join("\n")}`);
	}
}

function buildResponseDecorators(properties: TApiPropertyUuidProperties): Array<PropertyDecorator> {
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

function buildRequestDecorators(properties: TApiPropertyUuidProperties): Array<PropertyDecorator> {
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

function buildFormatDecorators(properties: TApiPropertyUuidProperties): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [];
	const isArray: boolean = properties.isArray ?? false;

	// eslint-disable-next-line @elsikora-typescript/naming-convention
	decorators.push(IsUUID(undefined, { each: isArray }));

	return decorators;
}

function buildDecorators(properties: TApiPropertyUuidProperties, apiPropertyOptions: ApiPropertyOptions): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [ApiProperty(apiPropertyOptions)];

	decorators.push(...buildResponseDecorators(properties), ...buildRequestDecorators(properties), ...buildFormatDecorators(properties));

	return decorators;
}
