import type { ApiPropertyOptions } from "@nestjs/swagger";

import type { TApiPropertyNumberProperties } from "../../../type/decorator/api/property/number-properties.type";

import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiResponseProperty } from "@nestjs/swagger";
import { Exclude, Expose, Transform, Type } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, ArrayNotEmpty, IsArray, IsDivisibleBy, IsInt, isInt, IsNumber, IsOptional, Max, Min } from "class-validator";
import random from "lodash/random";

import { NUMBER_CONSTANT } from "../../../constant";
import { EApiPropertyDataType, EApiPropertyNumberType } from "../../../enum";

export function ApiPropertyNumber(properties: TApiPropertyNumberProperties): <Y>(target: object, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void {
	if (properties.exampleValue === undefined) {
		properties.exampleValue = random(properties.minimum, properties.maximum);
	}

	validateOptions(properties);

	const apiPropertyOptions: ApiPropertyOptions = buildApiPropertyOptions(properties);
	const decorators: Array<PropertyDecorator> = buildDecorators(properties, apiPropertyOptions);

	return applyDecorators(...decorators);
}

function buildApiPropertyOptions(properties: TApiPropertyNumberProperties): ApiPropertyOptions {
	const apiPropertyOptions: ApiPropertyOptions = {
		description: `${String(properties.entity.name)} ${properties.description ?? ""}`,
		format: getFormat(properties),
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		nullable: properties.isNullable,
		type: getType(properties),
	};

	apiPropertyOptions.required = properties.isResponse === false || properties.isResponse === undefined ? properties.isRequired : false;

	if (properties.isArray) {
		apiPropertyOptions.isArray = true;
		apiPropertyOptions.minItems = properties.minItems;
		apiPropertyOptions.maxItems = properties.maxItems;
		apiPropertyOptions.uniqueItems = properties.isUniqueItems;
		apiPropertyOptions.example = Array.isArray(properties.exampleValue) ? properties.exampleValue : [properties.exampleValue];
	} else {
		apiPropertyOptions.example = properties.exampleValue;
	}

	apiPropertyOptions.minimum = properties.minimum;
	apiPropertyOptions.maximum = properties.maximum;

	if ((properties.isResponse === false || properties.isResponse === undefined) && properties.multipleOf !== undefined) {
		apiPropertyOptions.multipleOf = properties.multipleOf;
	}

	return apiPropertyOptions;
}

function buildDecorators(properties: TApiPropertyNumberProperties, apiPropertyOptions: ApiPropertyOptions): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [ApiProperty(apiPropertyOptions)];

	decorators.push(...buildResponseDecorators(properties), ...buildRequestDecorators(properties), ...buildFormatDecorators(properties), ...buildTransformDecorators(properties), ...buildNumberValidationDecorators(properties));

	return decorators;
}

function buildFormatDecorators(properties: TApiPropertyNumberProperties): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [];
	const isArray: boolean = properties.isArray ?? false;

	if (properties.isResponse === undefined || !properties.isResponse) {
		switch (properties.format) {
			case EApiPropertyNumberType.DOUBLE: {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				decorators.push(IsNumber({}, { each: isArray }));

				break;
			}

			case EApiPropertyNumberType.INTEGER: {
				// eslint-disable-next-line @elsikora/typescript/naming-convention
				decorators.push(IsInt({ each: isArray }));

				break;
			}

			default: {
				throw new Error(`ApiPropertyNumber error: Format is not valid for number property: ${String(properties.format)}`);
			}
		}

		decorators.push(Type(() => Number));
	}

	return decorators;
}

function buildNumberValidationDecorators(properties: TApiPropertyNumberProperties): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [];
	const isArray: boolean = properties.isArray ?? false;

	if ((properties.isResponse === false || properties.isResponse === undefined) && properties.multipleOf !== undefined) {
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		decorators.push(IsDivisibleBy(properties.multipleOf, { each: isArray }), Min(properties.minimum, { each: isArray }), Max(properties.maximum, { each: isArray }));
	}

	return decorators;
}

function buildRequestDecorators(properties: TApiPropertyNumberProperties): Array<PropertyDecorator> {
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

function buildResponseDecorators(properties: TApiPropertyNumberProperties): Array<PropertyDecorator> {
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

function buildTransformDecorators(properties: TApiPropertyNumberProperties): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [];

	if (!properties.isResponse) {
		if (properties.isArray) {
			decorators.push(Transform(({ value }: { value: Array<string> }) => value.map(Number), { toClassOnly: true }));
		} else {
			decorators.push(Transform(({ value }: { value: string }) => Number(value), { toClassOnly: true }));
		}
	}

	return decorators;
}

function getFormat(properties: TApiPropertyNumberProperties): string {
	switch (properties.format) {
		case EApiPropertyNumberType.DOUBLE: {
			return EApiPropertyNumberType.DOUBLE;
		}

		case EApiPropertyNumberType.INTEGER: {
			return properties.maximum <= NUMBER_CONSTANT.MAX_INTEGER && properties.maximum >= NUMBER_CONSTANT.MIN_INTEGER ? "int32" : "int64";
		}

		default: {
			throw new Error("ApiPropertyNumber error: Format is not defined");
		}
	}
}

function getType(properties: TApiPropertyNumberProperties): EApiPropertyDataType.INTEGER | EApiPropertyDataType.NUMBER {
	switch (properties.format) {
		case EApiPropertyNumberType.DOUBLE: {
			return EApiPropertyDataType.NUMBER;
		}

		case EApiPropertyNumberType.INTEGER: {
			return EApiPropertyDataType.INTEGER;
		}
	}
}

function validateOptions(properties: TApiPropertyNumberProperties): void {
	const errors: Array<string> = [];

	if (properties.minimum > properties.maximum) {
		errors.push("'minimum' is greater than maximum");
	}

	if (properties.multipleOf !== undefined) {
		if (Array.isArray(properties.exampleValue)) {
			for (const example of properties.exampleValue) {
				if (!isInt(example / properties.multipleOf)) {
					errors.push("'exampleValue' is not a multiple of 'multipleOf' value: " + String(example));
				}
			}
		} else if (properties.exampleValue !== undefined && !isInt(properties.exampleValue / properties.multipleOf)) {
			errors.push("'exampleValue' is not a multiple of 'multipleOf' value: " + String(properties.exampleValue));
		}
	}

	if (Array.isArray(properties.exampleValue)) {
		for (const example of properties.exampleValue) {
			if (example < properties.minimum) {
				errors.push("'exampleValue' is less than 'minimum': " + String(example));
			}
		}
	} else if (properties.exampleValue !== undefined && properties.exampleValue < properties.minimum) {
		errors.push("'exampleValue' is less than 'minimum': " + String(properties.exampleValue));
	}

	if (Array.isArray(properties.exampleValue)) {
		for (const example of properties.exampleValue) {
			if (example > properties.maximum) {
				errors.push("'exampleValue' is greater than 'maximum': " + String(example));
			}
		}
	} else if (properties.exampleValue !== undefined && properties.exampleValue > properties.maximum) {
		errors.push("'exampleValue' is greater than 'maximum': " + String(properties.exampleValue));
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
		throw new Error(`ApiPropertyNumber error: ${errors.join("\n")}`);
	}
}
