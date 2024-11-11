import type { ApiPropertyOptions } from "@nestjs/swagger";
import type { TApiPropertyBaseProperties } from "src/type";

import type { IApiBaseEntity } from "../../../interface";

import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiResponseProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, ArrayNotEmpty, IsArray, IsBoolean, IsOptional } from "class-validator";

import { EApiPropertyDataType } from "../../../enum";

export function ApiPropertyBoolean<T extends IApiBaseEntity>(properties: TApiPropertyBaseProperties<T>): <TFunction extends Function, Y>(target: object | TFunction, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void {
	validateOptions<T>(properties);

	const apiPropertyOptions: ApiPropertyOptions = buildApiPropertyOptions<T>(properties);
	const decorators: Array<PropertyDecorator> = buildDecorators<T>(properties, apiPropertyOptions);

	return applyDecorators(...decorators);
}

function validateOptions<T extends IApiBaseEntity>(options: TApiPropertyBaseProperties<T>): void {
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

function buildApiPropertyOptions<T extends IApiBaseEntity>(properties: TApiPropertyBaseProperties<T>): ApiPropertyOptions {
	const apiPropertyOptions: ApiPropertyOptions = {
		description: `${properties.entity.name} ${properties.description || ""}`,
		example: true,
		nullable: properties.nullable,
		required: !properties.response && properties.required,
		type: EApiPropertyDataType.BOOLEAN,
	};

	if (properties.isArray) {
		apiPropertyOptions.isArray = true;
		apiPropertyOptions.minItems = properties.minItems;
		apiPropertyOptions.maxItems = properties.maxItems;
		apiPropertyOptions.uniqueItems = properties.uniqueItems;
	}

	return apiPropertyOptions;
}

function buildDecorators<T extends IApiBaseEntity>(properties: TApiPropertyBaseProperties<T>, apiPropertyOptions: ApiPropertyOptions): Array<PropertyDecorator> {
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

		decorators.push(
			IsBoolean({ each: true }),
			Type(() => Boolean),
		);
	} else {
		if (!properties.required) {
			decorators.push(IsOptional());
		}

		decorators.push(
			Type(() => Boolean),
			(target, propertyKey) => {
				// @ts-ignore
				console.log('Значение перед IsBoolean:', target[propertyKey]);
				const result = IsBoolean({ message: "TY UYEBOPK2" })(target, propertyKey);
				console.log('Результат после IsBoolean:', result);
				return result;
			}
		);
	}

	return decorators;
}
