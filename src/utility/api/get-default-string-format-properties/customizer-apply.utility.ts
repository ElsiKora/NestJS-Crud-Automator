import type { TApiPropertyDefaultStringFormat, TApiPropertyDefaultStringFormatProperties } from "@type/decorator/api/property";
import type { TApiGetDefaultStringFormatPropertiesParameters } from "@type/utility/api";
import type { TApiGetDefaultStringFormatPropertiesCustomizer } from "@type/utility/api/get-default-string-format-properties/customizer";

import { GET_DEFAULT_STRING_FORMAT_PROPERTIES_API_UTILITY_CONSTANT } from "@constant/utility/api";

/**
 * Applies format-specific customizations through the registered customizer map.
 * @param {TFormat} format - Default string format.
 * @param {TApiPropertyDefaultStringFormatProperties} properties - Base properties cloned from defaults.
 * @param {TApiGetDefaultStringFormatPropertiesParameters<TFormat>} parameters - Optional format-specific parameters.
 * @returns {TApiPropertyDefaultStringFormatProperties} Customized properties when a customizer exists.
 * @template TFormat - Default string format type.
 */
export function ApplyGetDefaultStringFormatPropertiesCustomizer<const TFormat extends TApiPropertyDefaultStringFormat>(format: TFormat, properties: TApiPropertyDefaultStringFormatProperties, ...parameters: TApiGetDefaultStringFormatPropertiesParameters<TFormat>): TApiPropertyDefaultStringFormatProperties {
	const customizer: TApiGetDefaultStringFormatPropertiesCustomizer<TFormat> | undefined = GET_DEFAULT_STRING_FORMAT_PROPERTIES_API_UTILITY_CONSTANT.CUSTOMIZER_MAP[format];
	const [options]: TApiGetDefaultStringFormatPropertiesParameters<TFormat> = parameters;

	return customizer?.(properties, options) ?? properties;
}
