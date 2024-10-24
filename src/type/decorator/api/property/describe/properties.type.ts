import type { TApiPropertyDescribeBooleanProperties } from "./boolean-properties.type";
import type { TApiPropertyDescribeDateProperties } from "./date-properties.type";
import type { TApiPropertyDescribeNumberProperties } from "./number-properties.type";
import type { TApiPropertyDescribeObjectProperties } from "./object-properties.type";
import type { TApiPropertyDescribeRelationProperties } from "./relation-properties.type";
import type { TApiPropertyDescribeStringProperties } from "./string-properties.type";
import type { TApiPropertyDescribeUuidProperties } from "./uuid-properties.type";

export type TApiPropertyDescribeProperties = TApiPropertyDescribeBooleanProperties | TApiPropertyDescribeDateProperties | TApiPropertyDescribeNumberProperties | TApiPropertyDescribeObjectProperties | TApiPropertyDescribeRelationProperties | TApiPropertyDescribeStringProperties | TApiPropertyDescribeUuidProperties;
