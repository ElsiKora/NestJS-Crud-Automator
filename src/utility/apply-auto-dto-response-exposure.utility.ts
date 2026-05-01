import type { TApiPropertyBaseProperties } from "@type/decorator/api/property/base/properties.type";

import { Exclude, Expose } from "class-transformer";

const AUTO_DTO_RESPONSE_EXPOSURE_METADATA_KEY: string = "crud-automator:auto-dto-response-exposure";

/**
 * Applies class-transformer exposure to neutral manual DTO properties without marking them
 * as Swagger response-only fields.
 *
 * Explicit response-only properties (`isResponse: true`) still rely on the decorator-specific
 * response branch that uses `ApiResponseProperty()`.
 * @param {object} target - Decorated DTO prototype.
 * @param {string | symbol} propertyKey - Decorated property key.
 * @param {TApiPropertyBaseProperties} properties - Crud-automator property options.
 */
export function ApplyAutoDtoResponseExposure(target: object, propertyKey: string | symbol, properties: { isExpose?: boolean } & Pick<TApiPropertyBaseProperties, "isResponse">): void {
	if (!target || properties.isResponse !== undefined) {
		return;
	}

	if (Reflect.getMetadata?.(AUTO_DTO_RESPONSE_EXPOSURE_METADATA_KEY, target, propertyKey)) {
		return;
	}

	if (properties.isExpose === false) {
		Exclude()(target, propertyKey);
	} else {
		Expose()(target, propertyKey);
	}

	Reflect.defineMetadata?.(AUTO_DTO_RESPONSE_EXPOSURE_METADATA_KEY, true, target, propertyKey);
}
