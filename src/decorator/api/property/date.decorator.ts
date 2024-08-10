import { applyDecorators } from "@nestjs/common";

import { Type } from "class-transformer";
import { EApiPropertyDataType, EApiPropertyDateType } from "../../../enum";
import type { IApiBaseEntity, IApiPropertyDateProperties, IApiPropertyStringProperties } from "../../../interface";
import { ApiPropertyString } from "./string.decorator";
import { NUMBER_CONSTANT } from "../../../constant";

function getDescription(type: EApiPropertyDateType): string {
	switch (type) {
		case EApiPropertyDateType.CREATED: {
			return "creation date";
		}

		case EApiPropertyDateType.UPDATED: {
			return "last update date";
		}

		case EApiPropertyDateType.CREATED_AT_FROM: {
			return "createdAt from";
		}

		case EApiPropertyDateType.CREATED_AT_TO: {
			return "createdAt to";
		}

		case EApiPropertyDateType.UPDATED_AT_TO: {
			return "updatedAt to";
		}

		case EApiPropertyDateType.UPDATED_AT_FROM: {
			return "updatedAt from";
		}

		case EApiPropertyDateType.EXPIRES_IN: {
			return "expiration date";
		}

		case EApiPropertyDateType.REFRESH_IN: {
			return "refresh date";
		}

		case EApiPropertyDateType.DATE: {
			return "date";
		}

		case EApiPropertyDateType.RECEIVED_AT_FROM: {
			return "receivedAt from";
		}

		case EApiPropertyDateType.RECEIVED_AT_TO: {
			return "receivedAt to";
		}

		case EApiPropertyDateType.RECEIVED_AT: {
			return "receivedAt date";
		}

		default: {
			return "";
		}
	}
}

export function ApiPropertyDate<T extends IApiBaseEntity>(properties: IApiPropertyDateProperties<T>): <TFunction extends Function, Y>(target: object | TFunction, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void {
	validateOptions<T>(properties);

	const startOfYearUTCDate: string = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1, 0, 0, 0, 0)).toISOString();

	const apiPropertyStringOptions: IApiPropertyStringProperties<T> = {
		description: getDescription(properties.type),
		entity: properties.entity,
		example: startOfYearUTCDate,
		expose: properties.expose,
		format: EApiPropertyDataType.DATE_TIME,
		maxLength: startOfYearUTCDate.length,
		minLength: startOfYearUTCDate.length,
		nullable: properties.nullable,
		pattern: "/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z$/",
		required: !properties.response && properties.required,
		response: properties.response,
		type: EApiPropertyDataType.DATE_TIME,
	};

	const decorators: Array<PropertyDecorator> = [ApiPropertyString({ ...apiPropertyStringOptions })];

	if (!properties.response) {
		decorators.push(Type(() => Date));
	}

	return applyDecorators(...decorators);
}

function validateOptions<T extends IApiBaseEntity>(properties: IApiPropertyDateProperties<T>): void {
	const errors: Array<string> = [];

	if (!properties.response && typeof properties.required !== "boolean") {
		errors.push("Required is not defined");
	}

	if (properties.response && properties.required) {
		errors.push("Required is defined for response");
	}

	if (errors.length > NUMBER_CONSTANT.ZERO_LIST_LENGTH) {
		throw new Error(`ApiPropertyDate error: ${errors.join("\n")}`);
	}
}
