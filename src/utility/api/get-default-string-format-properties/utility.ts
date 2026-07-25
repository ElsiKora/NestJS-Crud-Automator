import type { TApiPropertyDefaultStringFormat, TApiPropertyDefaultStringFormatProperties } from "@type/decorator/api/property";
import type { TApiGetDefaultStringFormatPropertiesParameters } from "@type/utility/api";

import { DEFAULT_STRING_FORMAT_PROPERTY_API_INTERFACE_CONSTANT } from "@constant/interface/api";
import { ApplyGetDefaultStringFormatPropertiesCustomizer } from "@utility/api/get-default-string-format-properties/customizer-apply.utility";
import cloneDeep from "lodash/cloneDeep.js";

/**
 * Returns default format properties for supported string types (EMAIL, IP, URL, UUID).
 * This utility provides standard validation rules including pattern, length constraints,
 * example values and descriptions for common string formats.
 * @param {TApiPropertyDefaultStringFormat} format - The string format type (EMAIL, IP, URL, or UUID)
 * @param {TApiGetDefaultStringFormatPropertiesParameters<TFormat>} parameters - Optional format-specific settings.
 * @returns {TApiPropertyDefaultStringFormatProperties} Default properties for the specified format
 * @example
 * ```typescript
 * const emailDefaults = GetDefaultStringFormatProperties(TApiPropertyDefaultStringFormat.EMAIL);
 * // Returns:
 * // {
 * //   description: "email",
 * //   exampleValue: "user@example.com",
 * //   maxLength: 321,
 * //   minLength: 5,
 * //   pattern: "/^([a-zA-Z0-9_\\-.+])+@([a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,}$/"
 * // }
 * ```
 * @template TFormat - Default string format type.
 */
export function GetDefaultStringFormatProperties<const TFormat extends TApiPropertyDefaultStringFormat>(format: TFormat, ...parameters: TApiGetDefaultStringFormatPropertiesParameters<TFormat>): TApiPropertyDefaultStringFormatProperties {
	const properties: TApiPropertyDefaultStringFormatProperties = cloneDeep(DEFAULT_STRING_FORMAT_PROPERTY_API_INTERFACE_CONSTANT.DEFAULT_FORMAT_PROPERTIES[format]);

	return ApplyGetDefaultStringFormatPropertiesCustomizer(format, properties, ...parameters);
}
