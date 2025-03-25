import type { TApiPropertyObjectDynamicWithDiscriminatorProperties } from "./dynamic-with-discriminator-properties.type";
import type { TApiPropertyObjectWithDiscriminatorProperties } from "./with-discriminator-properties.type";
import type { TApiPropertyObjectWithoutDiscriminatorProperties } from "./without-discriminator-properties.type";

export type TApiPropertyObjectProperties = TApiPropertyObjectDynamicWithDiscriminatorProperties | TApiPropertyObjectWithDiscriminatorProperties | TApiPropertyObjectWithoutDiscriminatorProperties;
