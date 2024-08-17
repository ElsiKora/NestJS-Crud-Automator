import { MetadataStorage } from "../../../class";
import { API_PROPERTY_DESCRIBE_DECORATOR_CONSTANT } from "../../../constant";

import type { TApiPropertyDescribeProperties } from "../../../type";

export function ApiPropertyDescribe(properties: TApiPropertyDescribeProperties) {
	return (target: Record<any, any>, propertyKey: string): void => {
		const entityName: string = target.constructor.name;
		MetadataStorage.getInstance().setMetadata(entityName, propertyKey, API_PROPERTY_DESCRIBE_DECORATOR_CONSTANT.METADATA_PROPERTY_NAME, properties);
	};
}
