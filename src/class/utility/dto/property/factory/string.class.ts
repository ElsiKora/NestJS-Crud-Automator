import { ApiPropertyString } from "../../../../../decorator/api/property/string.decorator";

import type { IApiEntity, IDtoGenerateFactory } from "../../../../../interface";
import type {
	TApiPropertyDescribeDtoProperties,
	TApiPropertyDescribeStringProperties,
	TApiPropertyStringProperties
} from "../../../../../type";

export class DtoPropertyFactoryString<E> implements IDtoGenerateFactory<E> {
	create(metadata: TApiPropertyDescribeStringProperties, entity: IApiEntity<E>, config: TApiPropertyDescribeDtoProperties): PropertyDecorator {
		return ApiPropertyString({
			entity,
			...config,
			...metadata,
		} as unknown as TApiPropertyStringProperties<typeof entity>);
	}
}
