import type { TApiPropertyDescribeBooleanProperties } from "@type/decorator/api/property/describe/boolean-properties.type";
import type { TApiPropertyDescribeDateProperties } from "@type/decorator/api/property/describe/date-properties.type";
import type { TApiPropertyDescribeEnumProperties } from "@type/decorator/api/property/describe/enum-properties.type";
import type { TApiPropertyDescribeNumberProperties } from "@type/decorator/api/property/describe/number-properties.type";
import type { TApiPropertyDescribeObjectProperties } from "@type/decorator/api/property/describe/object";
import type { TApiPropertyDescribeRelationProperties } from "@type/decorator/api/property/describe/relation-properties.type";
import type { TApiPropertyDescribeStringProperties } from "@type/decorator/api/property/describe/string-properties.type";
import type { TApiPropertyDescribeUuidProperties } from "@type/decorator/api/property/describe/uuid-properties.type";

export type TApiPropertyDescribeProperties = TApiPropertyDescribeBooleanProperties | TApiPropertyDescribeDateProperties | TApiPropertyDescribeEnumProperties | TApiPropertyDescribeNumberProperties | TApiPropertyDescribeObjectProperties | TApiPropertyDescribeRelationProperties | TApiPropertyDescribeStringProperties | TApiPropertyDescribeUuidProperties;
