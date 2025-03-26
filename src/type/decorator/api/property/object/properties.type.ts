import type { TApiPropertyObjectDynamicWithDiscriminatorProperties } from "@type/decorator/api/property/object/dynamic-with-discriminator-properties.type";
import type { TApiPropertyObjectWithDiscriminatorProperties } from "@type/decorator/api/property/object/with-discriminator-properties.type";
import type { TApiPropertyObjectWithoutDiscriminatorProperties } from "@type/decorator/api/property/object/without-discriminator-properties.type";

export type TApiPropertyObjectProperties = TApiPropertyObjectDynamicWithDiscriminatorProperties | TApiPropertyObjectWithDiscriminatorProperties | TApiPropertyObjectWithoutDiscriminatorProperties;
