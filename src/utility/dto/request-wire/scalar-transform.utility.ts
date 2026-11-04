import type { TransformFnParams } from "class-transformer";

import { DtoFormBodySource } from "@class/utility/dto/form-body-source.class";
import { REQUEST_WIRE_DTO_CONSTANT } from "@constant/dto/request-wire.constant";
import { EApiDtoType } from "@enum/decorator/api";
import { ClassTransformerAutomatorTransform } from "@utility/class-transformer/automator-transform.utility";
import { GetAutoDtoContext } from "@utility/get/auto-dto-context.utility";

/**
 * Registers the request transform of an `ApiPropertyNumber` or `ApiPropertyBoolean` property, which converts canonical text only where the request carries the value as text.
 * A property of a generated QUERY or PARAMETERS DTO always converts it. Any other property keeps the value as sent, so a JSON body must send a JSON number or boolean and `"5"` fails the validator;
 * the conversion stays on its transform for `DtoRequestWireBindDto`, which adds it to a DTO class that a route reads from a query or a path, and it runs for a form or multipart body.
 * A list property takes a lone value as a one-item list either way.
 * @param {(item: unknown) => unknown} parseItem - Converts one text item, and returns any other value as it is for the validators to reject.
 * @param {boolean} isArray - Whether the property is a list.
 * @returns {PropertyDecorator} Decorator that registers the transform on the property.
 */
export function DtoRequestWireScalarTransform(parseItem: (item: unknown) => unknown, isArray: boolean): PropertyDecorator {
	const parse = (parameters: TransformFnParams): unknown => convert(parameters.value, parseItem, isArray);
	const keep = (parameters: TransformFnParams): unknown => (DtoFormBodySource.has(parameters.obj) ? parse(parameters) : convert(parameters.value, (item: unknown): unknown => item, isArray));

	Reflect.defineMetadata(REQUEST_WIRE_DTO_CONSTANT.TEXT_PARSER_METADATA_KEY, parse, keep);

	return (target: object, propertyKey: string | symbol): void => {
		const dtoType: EApiDtoType | undefined = GetAutoDtoContext(target)?.dtoType;

		if (dtoType === EApiDtoType.QUERY || dtoType === EApiDtoType.PARAMETERS) {
			ClassTransformerAutomatorTransform(parse, { toClassOnly: true })(target, propertyKey);

			return;
		}

		ClassTransformerAutomatorTransform(keep, { toClassOnly: true })(target, propertyKey);
	};
}

/**
 * Converts the items of one request value.
 * A single value sent as a list, such as `{ n: ["007"] }` or `?n=1&n=2`, stays a list for the validator to reject. A lone value of a list, such as `?counts=7`, is a one-item list, and `?counts=1,2` is the single item `1,2`, which is rejected.
 * @param {unknown} value - Request value.
 * @param {(item: unknown) => unknown} convertItem - Converts one item.
 * @param {boolean} isArray - Whether the property is a list.
 * @returns {unknown} The converted value; `undefined` and `null` as they are.
 * @private
 */
function convert(value: unknown, convertItem: (item: unknown) => unknown, isArray: boolean): unknown {
	if (value === undefined || value === null) {
		return value;
	}

	if (!isArray) {
		return Array.isArray(value) ? value : convertItem(value);
	}

	return (Array.isArray(value) ? (value as Array<unknown>) : [value]).map((item: unknown): unknown => convertItem(item));
}
