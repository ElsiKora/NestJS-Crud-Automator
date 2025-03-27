import type { TErrorStringBaseProperties } from "@type/utility";
import type { TErrorStringCompositeProperties } from "@type/utility/error-string/composite-properties.type";

export type TErrorStringProperties<T> = TErrorStringBaseProperties<T> | TErrorStringCompositeProperties<T>;
