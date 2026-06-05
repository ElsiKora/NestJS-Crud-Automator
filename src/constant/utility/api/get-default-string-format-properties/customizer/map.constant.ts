import type { TApiGetDefaultStringFormatPropertiesCustomizerMap } from "@type/utility/api/get-default-string-format-properties/customizer";

import { EApiPropertyStringType } from "@enum/decorator/api";
import { ApplyBigIntStringGetDefaultStringFormatPropertiesOptions } from "@utility/api/get-default-string-format-properties/bigint-string";

export const CUSTOMIZER_MAP_GET_DEFAULT_STRING_FORMAT_PROPERTIES_API_UTILITY_CONSTANT: TApiGetDefaultStringFormatPropertiesCustomizerMap = {
	[EApiPropertyStringType.BIGINT_STRING]: ApplyBigIntStringGetDefaultStringFormatPropertiesOptions,
} as const;
