import type { TApiPropertyDescribeObjectDynamicWithDiscriminatorProperties } from "./dynamic-with-discriminator-properties.type";
import type { TApiPropertyDescribeObjectWithDiscriminatorProperties } from "./with-discriminator-properties.type";
import type { TApiPropertyDescribeObjectWithoutDiscriminatorProperties } from "./without-discriminator-properties.type";

export type TApiPropertyDescribeObjectProperties = TApiPropertyDescribeObjectDynamicWithDiscriminatorProperties | TApiPropertyDescribeObjectWithDiscriminatorProperties | TApiPropertyDescribeObjectWithoutDiscriminatorProperties;
