import { ApiPropertyObject } from "../../../../../decorator";

import type { IApiEntity, IDtoGenerateFactory } from "../../../../../interface";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeObjectProperties } from "../../../../../type";

export class DtoPropertyFactoryObject implements IDtoGenerateFactory {
	create(metadata: TApiPropertyDescribeObjectProperties, entity: IApiEntity, config: TApiPropertyDescribeDtoProperties): PropertyDecorator {
		return ApiPropertyObject({
			entity,
			...config,
			enum: metadata.enum,
			...metadata,
		});
	}
}
