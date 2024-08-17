import { applyDecorators } from "@nestjs/common";

import { ApiProperty, ApiResponseProperty } from "@nestjs/swagger";

import { Expose, Transform } from "class-transformer";

import { ArrayMaxSize, ArrayMinSize, ArrayNotEmpty, IsArray, IsDivisibleBy, IsEnum, isInt, IsNumber, IsOptional, Max, Min } from "class-validator";

import random from "lodash/random";

import { NUMBER_CONSTANT } from "../../../constant";
import { EApiPropertyDataType, EApiPropertyDataTypeNumber } from "../../../enum";

import type { IApiBaseEntity, IApiPropertyNumberProperties } from "../../../interface";
import type { ApiPropertyOptions } from "@nestjs/swagger";

export function ApiPropertyNumber<T extends IApiBaseEntity>(properties: IApiPropertyNumberProperties<T>): <TFunction extends Function, Y>(target: object | TFunction, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void {
	if (properties.example === undefined) {
		properties.example = random(properties.minimum, properties.maximum);
	}

	validateOptions<T>(properties);

	const apiPropertyOptions: ApiPropertyOptions = buildApiPropertyOptions<T>(properties);
	const decorators: Array<PropertyDecorator> = buildDecorators<T>(properties, apiPropertyOptions);

	return applyDecorators(...decorators);
}

function getFormat<T extends IApiBaseEntity>(properties: IApiPropertyNumberProperties<T>): string {
	switch (properties.type) {
		case EApiPropertyDataType.INTEGER: {
			return properties.maximum <= NUMBER_CONSTANT.MAX_INTEGER && properties.maximum >= NUMBER_CONSTANT.MIN_INTEGER ? "int32" : "int64";
		}

		case EApiPropertyDataType.FLOAT: {
			return "float";
		}

		case EApiPropertyDataType.DOUBLE: {
			return "double";
		}

		default: {
			throw new Error("ApiPropertyNumber error: Format is not defined");
		}
	}
}

function validateOptions<T extends IApiBaseEntity>(properties: IApiPropertyNumberProperties<T>): void {
	const errors: Array<string> = [];

	if (!properties.response && typeof properties.required !== "boolean") {
		errors.push("Required is not defined");
	}

	if (properties.response && properties.required) {
		errors.push("Required is defined for response");
	}

	if (!EApiPropertyDataTypeNumber.has(properties.type)) {
		errors.push("Type is not valid for number property: " + properties.type);
	}

	if (properties.minimum > properties.maximum) {
		errors.push("Minimum is greater than maximum");
	}

	if (properties.example && properties.example < properties.minimum) {
		errors.push("Example is less than minimum");
	}

	if (properties.example && properties.example > properties.maximum) {
		errors.push("Example is greater than maximum");
	}

	if (properties.example && properties.multipleOf && !isInt(properties.example / properties.multipleOf)) {
		errors.push("Example is not a multiple of 'multipleOf' value");
	}

	if (errors.length > 0) {
		throw new Error(`ApiPropertyNumber error: ${errors.join("\n")}`);
	}
}

function buildApiPropertyOptions<T extends IApiBaseEntity>(properties: IApiPropertyNumberProperties<T>): ApiPropertyOptions {
	const apiPropertyOptions: ApiPropertyOptions = {
		description: `${properties.entity.name} ${properties.description || ""}`,
		example: properties.example,
		format: getFormat(properties),
		maximum: properties.maximum,
		minimum: properties.minimum,
		nullable: properties.nullable,
		required: !properties.response && properties.required,
		type: "number",
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
		apiPropertyOptions.type = "number[]";
	}

	return apiPropertyOptions;
}

function buildDecorators<T extends IApiBaseEntity>(properties: IApiPropertyNumberProperties<T>, apiPropertyOptions: ApiPropertyOptions): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [ApiProperty(apiPropertyOptions)];

	if (properties.response) {
		decorators.push(ApiResponseProperty);

		if (properties.expose) {
			decorators.push(Expose());
		}

		decorators.push(
			Transform(
				({ value }: { value: string }) => {
					return Number(value);
				},
				{ toClassOnly: true },
			),
		);
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
			decorators.push(IsNumber({}, { each: true }));
		}

		if (properties.multipleOf) {
			decorators.push(IsDivisibleBy(properties.multipleOf, { each: true }));
		}

		decorators.push(
			Transform(({ value }: { value: Array<string> }) => value.map(Number), { toClassOnly: true }),
			Min(properties.minimum, { each: true }),
			Max(properties.maximum, { each: true }),
		);
	} else {
		if (!properties.required) {
			decorators.push(IsOptional());
		}

		if (properties.enum) {
			decorators.push(IsEnum(properties.enum));
		} else {
			decorators.push(IsNumber());
		}

		if (properties.multipleOf) {
			decorators.push(IsDivisibleBy(properties.multipleOf));
		}

		decorators.push(
			Transform(
				({ value }: { value: string }) => {
					return Number(value);
				},
				{ toClassOnly: true },
			),
			Min(properties.minimum),
			Max(properties.maximum),
		);
	}

	return decorators;
}
