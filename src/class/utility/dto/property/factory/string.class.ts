import { ApiPropertyString } from "../../../../../decorator/api/property/string.decorator";

import type { IApiEntity, IDtoGenerateFactory } from "../../../../../interface";
import type {
	TApiPropertyDescribeDtoProperties,
	TApiPropertyDescribeStringProperties,
} from "../../../../../type";

export class DtoPropertyFactoryString<E> implements IDtoGenerateFactory<E> {
	create(metadata: TApiPropertyDescribeStringProperties, entity: IApiEntity<E>, config: TApiPropertyDescribeDtoProperties): PropertyDecorator {
		const { type, ...restProperties }: TApiPropertyDescribeStringProperties = metadata;

		return ApiPropertyString({
			entity,
			...config,
			...restProperties,
		});
	}
}
