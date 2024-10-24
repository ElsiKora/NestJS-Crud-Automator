import { ApiPropertyObject } from "../../../../../decorator";

import type { IApiEntity, IDtoGenerateFactory } from "../../../../../interface";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeObjectProperties } from "../../../../../type";

export class DtoPropertyFactoryObject<E> implements IDtoGenerateFactory<E> {
	create(metadata: TApiPropertyDescribeObjectProperties, entity: IApiEntity<E>, config: TApiPropertyDescribeDtoProperties): PropertyDecorator {
		return ApiPropertyObject({
			entity,
			...config,
			enum: metadata.enum,
			...metadata,
			type: metadata.dataType,
		});
	}
}
