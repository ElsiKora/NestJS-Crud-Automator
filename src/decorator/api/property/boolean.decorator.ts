import { applyDecorators } from "@nestjs/common";

import { ApiProperty, ApiResponseProperty } from "@nestjs/swagger";
import { Expose, Transform } from "class-transformer";

import { ArrayMaxSize, ArrayMinSize, ArrayNotEmpty, IsArray, IsBoolean, IsOptional } from "class-validator";

import type { IApiBaseEntity, IApiPropertyBaseProperties } from "../../../interface";
import type { ApiPropertyOptions } from "@nestjs/swagger";

export function ApiPropertyBoolean<T extends IApiBaseEntity>(properties: IApiPropertyBaseProperties<T>): <TFunction extends Function, Y>(target: object | TFunction, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void {
	validateOptions<T>(properties);

	const apiPropertyOptions: ApiPropertyOptions = buildApiPropertyOptions<T>(properties);
	const decorators: Array<PropertyDecorator> = buildDecorators<T>(properties, apiPropertyOptions);

	return applyDecorators(...decorators);
}

function validateOptions<T extends IApiBaseEntity>(options: IApiPropertyBaseProperties<T>): void {
	const errors: Array<string> = [];

	if (!options.response && typeof options.required !== "boolean") {
		errors.push("Required is not defined");
	}

	if (options.response && options.required) {
		errors.push("Required is defined for response");
	}

	if (errors.length > 0) {
		throw new Error(`ApiPropertyBoolean error: ${errors.join("\n")}`);
	}
}

function buildApiPropertyOptions<T extends IApiBaseEntity>(properties: IApiPropertyBaseProperties<T>): ApiPropertyOptions {
	const apiPropertyOptions: ApiPropertyOptions = {
		description: `${properties.entity.name} ${properties.description || ""}`,
		example: true,
		nullable: properties.nullable,
		required: !properties.response && properties.required,
		type: "boolean",
	};

	if (properties.isArray) {
		apiPropertyOptions.isArray = true;
		apiPropertyOptions.minItems = properties.minItems;
		apiPropertyOptions.maxItems = properties.maxItems;
		apiPropertyOptions.uniqueItems = properties.uniqueItems;
		apiPropertyOptions.type = "boolean[]";
	} else {
		apiPropertyOptions.type = "boolean";
	}

	return apiPropertyOptions;
}

function buildDecorators<T extends IApiBaseEntity>(properties: IApiPropertyBaseProperties<T>, apiPropertyOptions: ApiPropertyOptions): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [ApiProperty(apiPropertyOptions)];

	if (properties.response) {
		decorators.push(ApiResponseProperty);

		if (properties.expose) {
			decorators.push(Expose());
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

		decorators.push(IsBoolean({ each: true }));
	} else {
		if (!properties.required) {
			decorators.push(IsOptional());
		}

		decorators.push(
			IsBoolean(),
			Transform(({ value }: any) => {
				return value === "true" || value === true || value === 1 || value === "1";
			}),
		);
	}

	return decorators;
}
