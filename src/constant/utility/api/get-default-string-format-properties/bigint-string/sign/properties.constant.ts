import type { TApiGetDefaultStringFormatPropertiesBigIntStringSignProperties } from "@type/utility/api";

import { EApiGetDefaultStringFormatPropertiesBigIntStringSign } from "@enum/utility/get-default-string-format-properties-bigint-string-sign.enum";

export const SIGN_PROPERTIES_BIGINT_STRING_GET_DEFAULT_STRING_FORMAT_PROPERTIES_API_UTILITY_CONSTANT: Record<EApiGetDefaultStringFormatPropertiesBigIntStringSign, TApiGetDefaultStringFormatPropertiesBigIntStringSignProperties> = {
	[EApiGetDefaultStringFormatPropertiesBigIntStringSign.NEGATIVE]: {
		description: "negative bigint decimal string",
		exampleValue: "-1000",
		maxLength: "-9223372036854775808".length,
		minLength: "-1".length,
		pattern: String.raw`/^-[1-9]\d{0,18}$/`,
	},
	[EApiGetDefaultStringFormatPropertiesBigIntStringSign.SIGNED]: {
		description: "bigint decimal string",
		exampleValue: "1000",
		maxLength: "-9223372036854775808".length,
		minLength: "0".length,
		pattern: String.raw`/^-?(0|[1-9]\d{0,18})$/`,
	},
	[EApiGetDefaultStringFormatPropertiesBigIntStringSign.UNSIGNED]: {
		description: "unsigned bigint decimal string",
		exampleValue: "1000",
		maxLength: "18446744073709551615".length,
		minLength: "0".length,
		pattern: String.raw`/^(0|[1-9]\d{0,19})$/`,
	},
} as const;
