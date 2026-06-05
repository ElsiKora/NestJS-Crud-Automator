import type { TApiPropertyDefaultStringFormatProperties } from "@type/decorator/api/property";
import type { TApiGetDefaultStringFormatPropertiesBigIntStringOptions, TApiGetDefaultStringFormatPropertiesBigIntStringSign } from "@type/utility/api";

import { BIGINT_STRING_GET_DEFAULT_STRING_FORMAT_PROPERTIES_API_UTILITY_CONSTANT } from "@constant/utility/api/get-default-string-format-properties/bigint-string";

/**
 * Applies bigint string-specific options to default string format properties.
 * @param {TApiPropertyDefaultStringFormatProperties} properties - Base properties cloned from defaults.
 * @param {TApiGetDefaultStringFormatPropertiesBigIntStringOptions | undefined} options - Bigint string-specific options.
 * @returns {TApiPropertyDefaultStringFormatProperties} Properties adjusted for bigint string options.
 */
export function ApplyBigIntStringGetDefaultStringFormatPropertiesOptions(properties: TApiPropertyDefaultStringFormatProperties, options: TApiGetDefaultStringFormatPropertiesBigIntStringOptions | undefined): TApiPropertyDefaultStringFormatProperties {
	const sign: TApiGetDefaultStringFormatPropertiesBigIntStringSign = options?.sign ?? BIGINT_STRING_GET_DEFAULT_STRING_FORMAT_PROPERTIES_API_UTILITY_CONSTANT.DEFAULT_SIGN;

	return {
		...properties,
		...BIGINT_STRING_GET_DEFAULT_STRING_FORMAT_PROPERTIES_API_UTILITY_CONSTANT.SIGN_PROPERTIES[sign],
	};
}
