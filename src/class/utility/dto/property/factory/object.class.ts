import type { IApiEntity, IDtoGenerateFactory } from "../../../../../interface";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeObjectProperties, TApiPropertyObjectProperties } from "../../../../../type";

import { ApiPropertyObject } from "../../../../../decorator/api/property/object.decorator";

export class DtoPropertyFactoryObject<E> implements IDtoGenerateFactory<E> {
	create(metadata: TApiPropertyDescribeObjectProperties, entity: IApiEntity<E>, config: TApiPropertyDescribeDtoProperties): PropertyDecorator {
		const properties: TApiPropertyObjectProperties<typeof entity> = {
			entity,
			...config,
			...metadata,
			type: metadata.dataType,
		};

		if (metadata.enum) {
			properties.enum = metadata.enum;
			properties.enumName = metadata.enumName;
		}

		return ApiPropertyObject(properties);
	}
}
