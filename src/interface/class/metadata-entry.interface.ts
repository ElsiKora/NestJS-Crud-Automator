import type { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

export interface IMetadataEntry {
	[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_PROPERTY_NAME]: Partial<TApiPropertyDescribeProperties>;
}
