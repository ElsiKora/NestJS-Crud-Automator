import type { TApiPropertyDescribeObjectWithDiscriminatorProperties } from "./with-discriminator-properties.type";
import type { TApiPropertyDescribeObjectWithoutDiscriminatorProperties } from "./without-discriminator-properties.type";

export type TApiPropertyDescribeObjectProperties = TApiPropertyDescribeObjectWithDiscriminatorProperties | TApiPropertyDescribeObjectWithoutDiscriminatorProperties;
