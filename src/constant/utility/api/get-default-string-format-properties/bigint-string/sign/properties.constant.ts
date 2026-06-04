/* eslint-disable @elsikora/typescript/no-magic-numbers */
import type { TApiGetDefaultStringFormatPropertiesBigIntStringSign, TApiGetDefaultStringFormatPropertiesBigIntStringSignProperties } from "@type/utility/api";

export const SIGN_PROPERTIES_BIGINT_STRING_GET_DEFAULT_STRING_FORMAT_PROPERTIES_API_UTILITY_CONSTANT: Record<TApiGetDefaultStringFormatPropertiesBigIntStringSign, TApiGetDefaultStringFormatPropertiesBigIntStringSignProperties> = {
	negative: {
		description: "negative bigint decimal string",
		exampleValue: "-1000",
		maxLength: 20,
		minLength: 2,
		pattern: String.raw`/^-[1-9]\d{0,18}$/`,
	},
	signed: {
		description: "bigint decimal string",
		exampleValue: "1000",
		maxLength: 20,
		minLength: 1,
		pattern: String.raw`/^-?(0|[1-9]\d{0,18})$/`,
	},
	unsigned: {
		description: "unsigned bigint decimal string",
		exampleValue: "1000",
		maxLength: 20,
		minLength: 1,
		pattern: String.raw`/^(0|[1-9]\d{0,19})$/`,
	},
} as const;
