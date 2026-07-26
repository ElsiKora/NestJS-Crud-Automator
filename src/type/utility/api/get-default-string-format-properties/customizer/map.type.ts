import type { TApiPropertyDefaultStringFormat } from "@type/decorator/api/property";
import type { TApiGetDefaultStringFormatPropertiesCustomizer } from "@type/utility/api/get-default-string-format-properties/customizer/type";

export type TApiGetDefaultStringFormatPropertiesCustomizerMap = Partial<{
	[TFormat in TApiPropertyDefaultStringFormat]: TApiGetDefaultStringFormatPropertiesCustomizer<TFormat>;
}>;
