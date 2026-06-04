import type { TApiPropertyDefaultStringFormat } from "@type/decorator/api/property";

import type { TApiGetDefaultStringFormatPropertiesCustomizer } from "./type";

export type TApiGetDefaultStringFormatPropertiesCustomizerMap = Partial<{
	[TFormat in TApiPropertyDefaultStringFormat]: TApiGetDefaultStringFormatPropertiesCustomizer<TFormat>;
}>;
