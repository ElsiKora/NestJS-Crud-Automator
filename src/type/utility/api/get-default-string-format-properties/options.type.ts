import type { EApiPropertyStringType } from "@enum/decorator/api";
import type { TApiPropertyDefaultStringFormat } from "@type/decorator/api/property";
import type { TApiGetDefaultStringFormatPropertiesBigIntStringOptions } from "@type/utility/api/get-default-string-format-properties/bigint-string";

export type TApiGetDefaultStringFormatPropertiesOptions<TFormat extends TApiPropertyDefaultStringFormat> = [TFormat] extends [EApiPropertyStringType.BIGINT_STRING] ? TApiGetDefaultStringFormatPropertiesBigIntStringOptions : never;
