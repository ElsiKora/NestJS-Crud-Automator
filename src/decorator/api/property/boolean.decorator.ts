import type { ApiPropertyOptions } from "@nestjs/swagger";

import type { TApiPropertyBaseProperties } from "../../../type/decorator/api/property/base";

import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiResponseProperty } from "@nestjs/swagger";
import { Exclude, Expose, Transform } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, ArrayNotEmpty, IsArray, IsBoolean, IsOptional } from "class-validator";

import { EApiPropertyDataType } from "../../../enum";

export function ApiPropertyBoolean(properties: TApiPropertyBaseProperties): <Y>(target: object, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void {
	validateOptions(properties);

	const apiPropertyOptions: ApiPropertyOptions = buildApiPropertyOptions(properties);
	const decorators: Array<PropertyDecorator> = buildDecorators(properties, apiPropertyOptions);

	return applyDecorators(...decorators);
}

function buildApiPropertyOptions(properties: TApiPropertyBaseProperties): ApiPropertyOptions {
	const apiPropertyOptions: ApiPropertyOptions = {
		description: `${String(properties.entity.name)} ${properties.description ?? ""}`,
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		nullable: properties.isNullable,
		type: EApiPropertyDataType.BOOLEAN,
	};

	apiPropertyOptions.required = properties.isResponse === false || properties.isResponse === undefined ? properties.isRequired : false;

	if (properties.isArray) {
		apiPropertyOptions.isArray = true;
		apiPropertyOptions.minItems = properties.minItems;
		apiPropertyOptions.maxItems = properties.maxItems;
		apiPropertyOptions.uniqueItems = properties.isUniqueItems;
		apiPropertyOptions.example = [true];
	} else {
		apiPropertyOptions.example = true;
	}

	return apiPropertyOptions;
}

function buildDecorators(properties: TApiPropertyBaseProperties, apiPropertyOptions: ApiPropertyOptions): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [ApiProperty(apiPropertyOptions)];

	decorators.push(...buildResponseDecorators(properties), ...buildRequestDecorators(properties), ...buildFormatDecorators(properties), ...buildTransformDecorators(properties));

	return decorators;
}

function buildFormatDecorators(properties: TApiPropertyBaseProperties): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [];
	const isArray: boolean = properties.isArray ?? false;

	if (properties.isResponse === undefined || !properties.isResponse) {
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		decorators.push(IsBoolean({ each: isArray }));
	}

	return decorators;
}

function buildRequestDecorators(properties: TApiPropertyBaseProperties): Array<PropertyDecorator> {
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

function buildResponseDecorators(properties: TApiPropertyBaseProperties): Array<PropertyDecorator> {
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

function buildTransformDecorators(properties: TApiPropertyBaseProperties): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [];

	if (!properties.isResponse) {
		if (properties.isArray) {
			decorators.push(
				Transform(
					({ value }: { value: unknown }) => {
						if (value === null || value === undefined) {
							return [];
						}

						if (!Array.isArray(value)) {
							const singleValue: unknown = value;

							if (singleValue === undefined || singleValue === null) return [false];

							if (typeof singleValue === "boolean") return [singleValue];

							if (typeof singleValue === "number") return [singleValue !== 0];

							if (typeof singleValue === "string") {
								const normalized: string = singleValue.toLowerCase().trim();

								if (normalized === "true" || normalized === "1") return [true];

								if (normalized === "false" || normalized === "0") return [false];

								return [Boolean(normalized)];
							}

							return [false];
						}

						return value.map((_value: any) => {
							if (_value === undefined || _value === null) return false;

							if (typeof _value === "boolean") return _value;

							if (typeof _value === "number") return _value !== 0;

							if (typeof _value === "string") {
								const normalized: string = _value.toLowerCase().trim();

								if (normalized === "true" || normalized === "1") return true;

								if (normalized === "false" || normalized === "0") return false;

								return Boolean(normalized);
							}

							return false;
						});
					},
					{ toClassOnly: true },
				),
			);
		} else {
			decorators.push(
				Transform(
					({ value }: { value: any }) => {
						if (value === undefined || value === null) return false;

						if (typeof value === "boolean") return value;

						if (typeof value === "number") return value !== 0;

						if (typeof value === "string") {
							value = value.toLowerCase().trim();

							if (value === "true" || value === "1") return true;

							if (value === "false" || value === "0") return false;

							return Boolean(value);
						}

						return false;
					},
					{ toClassOnly: true },
				),
			);
		}
	}

	return decorators;
}

function validateOptions(properties: TApiPropertyBaseProperties): void {
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
		throw new Error(`ApiPropertyBoolean error: ${errors.join("\n")}`);
	}
}
