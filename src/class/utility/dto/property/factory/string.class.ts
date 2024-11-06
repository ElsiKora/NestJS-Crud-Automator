import { ApiPropertyString } from "../../../../../decorator/api/property/string.decorator";

import type { IApiEntity, IApiPropertyStringProperties, IDtoGenerateFactory } from "../../../../../interface";
import type { TApiPropertyDescribeDtoProperties, TApiPropertyDescribeStringProperties } from "../../../../../type";

export class DtoPropertyFactoryString<E> implements IDtoGenerateFactory<E> {
	create(metadata: TApiPropertyDescribeStringProperties, entity: IApiEntity<E>, config: TApiPropertyDescribeDtoProperties): PropertyDecorator {
		return ApiPropertyString({
			entity,
			...config,
			...metadata,
		} as unknown as IApiPropertyStringProperties<typeof entity>);
	}
}
