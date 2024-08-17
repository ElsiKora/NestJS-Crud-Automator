import { randomUUID } from "node:crypto";

import { applyDecorators } from "@nestjs/common";

import { ApiProperty, ApiResponseProperty } from "@nestjs/swagger";

import { Expose } from "class-transformer";

import { IsOptional, IsUUID } from "class-validator";

import type { IApiBaseEntity, IApiPropertyUuidProperties } from "../../../interface";
import type { ApiPropertyOptions } from "@nestjs/swagger";

export function ApiPropertyUUID<T extends IApiBaseEntity>(properties: IApiPropertyUuidProperties<T>): <TFunction extends Function, Y>(target: object | TFunction, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void {
	const uuidExample: string = randomUUID();
	validateOptions(uuidExample, properties);

	const apiPropertyOptions: ApiPropertyOptions = buildApiPropertyOptions(uuidExample, properties);
	const decorators: Array<PropertyDecorator> = buildDecorators(properties, apiPropertyOptions);

	return applyDecorators(...decorators);
}

function validateOptions<T extends IApiBaseEntity>(uuidExample: string, properties: IApiPropertyUuidProperties<T>): void {
	const errors: Array<string> = [];
	const uuidRegex: RegExp = /^[\dA-Fa-f]{8}-[\dA-Fa-f]{4}-[1-5][\dA-Fa-f]{3}-[89ABab][\dA-Fa-f]{3}-[\dA-Fa-f]{12}$/;

	if (!properties.response && typeof properties.required !== "boolean") {
		errors.push("Required is not defined");
	}

	if (properties.response && properties.required) {
		errors.push("Required is defined for response");
	}

	if (!uuidRegex.test(uuidExample)) {
		errors.push("Generated UUID does not match UUID pattern: " + uuidExample);
	}

	if (errors.length > 0) {
		throw new Error(`ApiPropertyUUID error: ${errors.join("\n")}`);
	}
}

function buildApiPropertyOptions<T extends IApiBaseEntity>(uuidExample: string, properties: IApiPropertyUuidProperties<T>): ApiPropertyOptions {
	return {
		description: `${properties.entity.name} ${properties.description || "identifier"}`,
		example: uuidExample,
		format: "uuid",
		maxLength: uuidExample.length,
		minLength: uuidExample.length,
		nullable: properties.nullable,
		pattern: "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$",
		required: !properties.response && properties.required,
		type: "string",
	};
}

function buildDecorators<T extends IApiBaseEntity>(options: IApiPropertyUuidProperties<T>, apiPropertyOptions: ApiPropertyOptions): Array<PropertyDecorator> {
	const decorators: Array<PropertyDecorator> = [ApiProperty(apiPropertyOptions)];

	if (options.response) {
		decorators.push(ApiResponseProperty);
	} else {
		if (options.required) {
			decorators.push(IsUUID());
		} else {
			decorators.push(IsOptional(), IsUUID());
		}
	}

	if (options.response && options.expose) {
		decorators.push(Expose());
	}

	return decorators;
}
