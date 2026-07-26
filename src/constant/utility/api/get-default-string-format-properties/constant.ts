import type { EApiGetDefaultStringFormatPropertiesBigIntStringSign } from "@enum/utility/get-default-string-format-properties-bigint-string-sign.enum";
import type { TApiGetDefaultStringFormatPropertiesBigIntStringSignProperties } from "@type/utility/api";
import type { TApiGetDefaultStringFormatPropertiesCustomizerMap } from "@type/utility/api/get-default-string-format-properties/customizer";

import { BIGINT_STRING_GET_DEFAULT_STRING_FORMAT_PROPERTIES_API_UTILITY_CONSTANT } from "@constant/utility/api/get-default-string-format-properties/bigint-string";
import { CUSTOMIZER_MAP_GET_DEFAULT_STRING_FORMAT_PROPERTIES_API_UTILITY_CONSTANT } from "@constant/utility/api/get-default-string-format-properties/customizer-map.constant";

export const GET_DEFAULT_STRING_FORMAT_PROPERTIES_API_UTILITY_CONSTANT: {
	readonly BIGINT_STRING: {
		readonly DEFAULT_SIGN: EApiGetDefaultStringFormatPropertiesBigIntStringSign;
		readonly SIGN_PROPERTIES: Record<EApiGetDefaultStringFormatPropertiesBigIntStringSign, TApiGetDefaultStringFormatPropertiesBigIntStringSignProperties>;
	};
	readonly CUSTOMIZER_MAP: TApiGetDefaultStringFormatPropertiesCustomizerMap;
} = {
	BIGINT_STRING: BIGINT_STRING_GET_DEFAULT_STRING_FORMAT_PROPERTIES_API_UTILITY_CONSTANT,
	CUSTOMIZER_MAP: CUSTOMIZER_MAP_GET_DEFAULT_STRING_FORMAT_PROPERTIES_API_UTILITY_CONSTANT,
} as const;
