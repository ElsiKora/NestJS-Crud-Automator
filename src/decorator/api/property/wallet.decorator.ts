import { applyDecorators } from "@nestjs/common";
import { API_PROPERTY_WALLET_INTERFACE_CONSTANT } from "../../../constant";
import type { IApiBaseEntity, IApiPropertyBaseProperties, IApiPropertyNumberProperties } from "../../../interface";
import { EApiPropertyDataType } from "../../../enum";
import { ApiPropertyNumber } from "./number.decorator";

export function ApiPropertyWallet<T extends IApiBaseEntity>(properties: IApiPropertyBaseProperties<T>): <TFunction extends Function, Y>(target: object | TFunction, propertyKey?: string | symbol, descriptor?: TypedPropertyDescriptor<Y>) => void {
	const apiPropertyOptions: IApiPropertyNumberProperties<T> = {
		description: "wallet number",
		entity: properties.entity,
		example: API_PROPERTY_WALLET_INTERFACE_CONSTANT.EXAMPLE,
		expose: properties.expose,
		maximum: API_PROPERTY_WALLET_INTERFACE_CONSTANT.MAXIMUM,
		minimum: API_PROPERTY_WALLET_INTERFACE_CONSTANT.MINIMUM,
		multipleOf: 1,
		nullable: properties.nullable,
		required: !properties.response && properties.required,
		response: properties.response,
		type: EApiPropertyDataType.INTEGER,
	};

	const decorators: Array<PropertyDecorator> = [ApiPropertyNumber({ ...apiPropertyOptions })];

	return applyDecorators(...decorators);
}
