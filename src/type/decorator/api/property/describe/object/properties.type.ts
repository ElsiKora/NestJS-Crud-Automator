import type { TApiPropertyDescribeObjectDynamicWithDiscriminatorProperties } from "@type/decorator/api/property/describe/object/dynamic-with-discriminator-properties.type";
import type { TApiPropertyDescribeObjectWithDiscriminatorProperties } from "@type/decorator/api/property/describe/object/with-discriminator-properties.type";
import type { TApiPropertyDescribeObjectWithoutDiscriminatorProperties } from "@type/decorator/api/property/describe/object/without-discriminator-properties.type";

export type TApiPropertyDescribeObjectProperties = TApiPropertyDescribeObjectDynamicWithDiscriminatorProperties | TApiPropertyDescribeObjectWithDiscriminatorProperties | TApiPropertyDescribeObjectWithoutDiscriminatorProperties;
