import { applyDecorators } from "@nestjs/common";

import { WALLET_PROPERTY_API_INTERFACE_CONSTANT } from "../../../constant";

import { EApiPropertyDataType } from "../../../enum";

import { ApiPropertyNumber } from "./number.decorator";

import type { IApiBaseEntity } from "../../../interface";
import { TApiPropertyBaseProperties, TApiPropertyNumberProperties } from "src/type";

export function ApiPropertyWallet<T extends IApiBaseEntity>(properties: TApiPropertyBaseProperties<T>): <TFunction extends Function, Y>(target: object | TFunction, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void {
	const apiPropertyOptions: TApiPropertyNumberProperties<T> = {
		description: "wallet number",
		entity: properties.entity,
		example: WALLET_PROPERTY_API_INTERFACE_CONSTANT.EXAMPLE,
		expose: properties.expose,
		maximum: WALLET_PROPERTY_API_INTERFACE_CONSTANT.MAXIMUM,
		minimum: WALLET_PROPERTY_API_INTERFACE_CONSTANT.MINIMUM,
		multipleOf: 1,
		nullable: properties.nullable,
		required: !properties.response && properties.required,
		response: properties.response,
		type: EApiPropertyDataType.INTEGER,
	};

	const decorators: Array<PropertyDecorator> = [ApiPropertyNumber({ ...apiPropertyOptions })];

	return applyDecorators(...decorators);
}
