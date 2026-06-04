import type { TApiPropertyDefaultStringFormat, TApiPropertyDefaultStringFormatProperties } from "@type/decorator/api/property";

import type { TApiGetDefaultStringFormatPropertiesOptions } from "../options.type";

export type TApiGetDefaultStringFormatPropertiesCustomizer<TFormat extends TApiPropertyDefaultStringFormat> = (properties: TApiPropertyDefaultStringFormatProperties, options: TApiGetDefaultStringFormatPropertiesOptions<TFormat> | undefined) => TApiPropertyDefaultStringFormatProperties;
