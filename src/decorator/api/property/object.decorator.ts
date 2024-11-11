import { applyDecorators } from "@nestjs/common";

import { ApiProperty, ApiResponseProperty } from "@nestjs/swagger";

import { Expose, Transform, Type } from "class-transformer";

import { ArrayMaxSize, ArrayMinSize, ArrayNotEmpty, IsArray, IsEnum, IsOptional, ValidateNested } from "class-validator";

import type { IApiBaseEntity } from "../../../interface";
import type { ApiPropertyOptions } from "@nestjs/swagger";
import { TApiPropertyObjectProperties } from "src/type/decorator/api/property/object-properties.interface";

export function ApiPropertyObject<T extends IApiBaseEntity>(options: TApiPropertyObjectProperties<T>): <TFunction extends Function, Y>(target: object | TFunction, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void {
	validateOptions<T>(options);

	const apiPropertyOptions: ApiPropertyOptions = buildApiPropertyOptions<T>(options);
	const decorators: Array<PropertyDecorator> = buildDecorators<T>(options, apiPropertyOptions);

	return applyDecorators(...decorators);
}

function validateOptions<T extends IApiBaseEntity>(properties: TApiPropertyObjectProperties<T>): void {
	const errors: Array<string> = [];

	if (!properties.response && typeof properties.required !== "boolean") {
		errors.push("Required is not defined");
	}

	if (properties.response && properties.required) {
		errors.push("Required is defined for response");
	}

	if (properties.isArray && !properties.nested && !properties.response && !properties.enum) {
		errors.push("Array property must be nested");
	}

	if (properties.isArray && !properties.type && !properties.enum) {
		errors.push("Array property must have type or enum");
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

function buildApiPropertyOptions<T extends IApiBaseEntity>(properties: TApiPropertyObjectProperties<T>): ApiPropertyOptions {
	const apiPropertyOptions: ApiPropertyOptions = {
		description: `${properties.entity.name} ${properties.description || ""}`,
		enumName: properties.enumName ?? "",
		nullable: properties.nullable,
		required: !properties.response && properties.required,
		type: properties.type,
	};

	if (properties.additionalProperties) {
		apiPropertyOptions.additionalProperties = properties.additionalProperties;
	}

	if (properties.default) {
		apiPropertyOptions.default = properties.default;
	}

	if (properties.enum) {
		apiPropertyOptions.enum = properties.enum;
	}

	if (properties.isArray) {
		apiPropertyOptions.isArray = true;
		apiPropertyOptions.minItems = properties.minItems;
		apiPropertyOptions.maxItems = properties.maxItems;
		apiPropertyOptions.uniqueItems = properties.uniqueItems;
		apiPropertyOptions.description = `Array of ${properties.entity.name} ${properties.description || ""}`;
	}

	if (properties.nullable) {
		apiPropertyOptions.nullable = true;
	}

	return apiPropertyOptions;
}

function buildDecorators<T extends IApiBaseEntity>(properties: TApiPropertyObjectProperties<T>, apiPropertyOptions: ApiPropertyOptions): Array<PropertyDecorator> {
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

		if (properties.enum) {
			decorators.push(IsEnum(properties.enum, { each: true }));
		}
	} else {
		if (!properties.required) {
			decorators.push(IsOptional());
		}

		if (properties.enum) {
			decorators.push(IsEnum(properties.enum));
		}
	}

	if (!properties.response && properties.nested && !properties.enum) {
		if (properties.isArray) {
			decorators.push(ValidateNested({ each: true }));
		} else {
			decorators.push(ValidateNested());
		}
	}

	if (!properties.response && properties.isArray && properties.enum) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		decorators.push(Transform(({ value }: any) => (Array.isArray(value) ? value : [value])));
	}

	if (properties.type) {
		decorators.push(Type(() => properties.type as Function));
	}

	return decorators;
}
