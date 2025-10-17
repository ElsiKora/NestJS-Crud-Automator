import type { TApiPropertyDefaultStringFormat, TApiPropertyDefaultStringFormatProperties } from "@type/decorator/api/property";

import { DEFAULT_STRING_FORMAT_PROPERTY_API_INTERFACE_CONSTANT } from "@constant/interface/api";
import cloneDeep from "lodash/cloneDeep";

/**
 * Returns default format properties for supported string types (EMAIL, IP, URL, UUID).
 * This utility provides standard validation rules including pattern, length constraints,
 * example values and descriptions for common string formats.
 * @param {TApiPropertyDefaultStringFormat} format - The string format type (EMAIL, IP, URL, or UUID)
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
 */
export function GetDefaultStringFormatProperties(format: TApiPropertyDefaultStringFormat): TApiPropertyDefaultStringFormatProperties {
	const properties: TApiPropertyDefaultStringFormatProperties = DEFAULT_STRING_FORMAT_PROPERTY_API_INTERFACE_CONSTANT.DEFAULT_FORMAT_PROPERTIES[format];

	return cloneDeep(properties);
}
