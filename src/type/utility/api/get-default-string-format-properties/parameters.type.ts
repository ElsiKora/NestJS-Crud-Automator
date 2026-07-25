import type { TApiPropertyDefaultStringFormat } from "@type/decorator/api/property";
import type { TApiGetDefaultStringFormatPropertiesOptions } from "@type/utility/api/get-default-string-format-properties/options.type";

export type TApiGetDefaultStringFormatPropertiesParameters<TFormat extends TApiPropertyDefaultStringFormat> = [TApiGetDefaultStringFormatPropertiesOptions<TFormat>] extends [never] ? [] | [undefined] : [options?: TApiGetDefaultStringFormatPropertiesOptions<TFormat>];
