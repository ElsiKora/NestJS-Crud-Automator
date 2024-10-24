import type { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "../../constant";
import type { TApiPropertyDescribeProperties } from "../../type";

export interface IMetadataEntry {
	[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_PROPERTY_NAME]: Partial<TApiPropertyDescribeProperties>;
}
