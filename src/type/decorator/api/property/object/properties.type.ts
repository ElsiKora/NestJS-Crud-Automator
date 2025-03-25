import type { TApiPropertyObjectWithDiscriminatorProperties } from "./with-discriminator-properties.type";
import type { TApiPropertyObjectWithoutDiscriminatorProperties } from "./without-discriminator-properties.type";

export type TApiPropertyObjectProperties = TApiPropertyObjectWithDiscriminatorProperties | TApiPropertyObjectWithoutDiscriminatorProperties;
