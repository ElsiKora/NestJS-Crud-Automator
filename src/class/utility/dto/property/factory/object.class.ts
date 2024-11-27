import type { IApiEntity, IDtoGenerateFactory } from "../../../../../interface";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeObjectProperties } from "../../../../../type";

import { ApiPropertyObject } from "../../../../../decorator/api/property/object.decorator";

export class DtoPropertyFactoryObject<E> implements IDtoGenerateFactory<E> {
	create(metadata: TApiPropertyDescribeObjectProperties, entity: IApiEntity<E>, config: TApiPropertyDescribeDtoProperties): PropertyDecorator {
		const { dataType, type, ...restProperties }: TApiPropertyDescribeObjectProperties = metadata;

		return ApiPropertyObject({
			entity,
			type: dataType,
			...config,
			...restProperties,
		});
	}
}
