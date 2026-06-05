import type { TApiGetDefaultStringFormatPropertiesBigIntStringSign, TApiGetDefaultStringFormatPropertiesBigIntStringSignProperties } from "@type/utility/api";
import type { TApiGetDefaultStringFormatPropertiesCustomizerMap } from "@type/utility/api/get-default-string-format-properties/customizer";

import { BIGINT_STRING_GET_DEFAULT_STRING_FORMAT_PROPERTIES_API_UTILITY_CONSTANT } from "./bigint-string";
import { CUSTOMIZER_MAP_GET_DEFAULT_STRING_FORMAT_PROPERTIES_API_UTILITY_CONSTANT } from "./customizer";

export const GET_DEFAULT_STRING_FORMAT_PROPERTIES_API_UTILITY_CONSTANT: {
	readonly BIGINT_STRING: {
		readonly DEFAULT_SIGN: TApiGetDefaultStringFormatPropertiesBigIntStringSign;
		readonly SIGN_PROPERTIES: Record<TApiGetDefaultStringFormatPropertiesBigIntStringSign, TApiGetDefaultStringFormatPropertiesBigIntStringSignProperties>;
	};
	readonly CUSTOMIZER_MAP: TApiGetDefaultStringFormatPropertiesCustomizerMap;
} = {
	BIGINT_STRING: BIGINT_STRING_GET_DEFAULT_STRING_FORMAT_PROPERTIES_API_UTILITY_CONSTANT,
	CUSTOMIZER_MAP: CUSTOMIZER_MAP_GET_DEFAULT_STRING_FORMAT_PROPERTIES_API_UTILITY_CONSTANT,
} as const;
