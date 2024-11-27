import { ApiPropertyDate } from "../../../../../decorator/api/property/date.decorator";

import type { IApiEntity, IDtoGenerateFactory } from "../../../../../interface";
import type {
	TApiPropertyDescribeDateProperties,
	TApiPropertyDescribeDtoProperties
} from "../../../../../type";

export class DtoPropertyFactoryDate<E> implements IDtoGenerateFactory<E> {
	create(metadata: TApiPropertyDescribeDateProperties, entity: IApiEntity<E>, config: TApiPropertyDescribeDtoProperties): PropertyDecorator {
		const { type, ...restProperties }: TApiPropertyDescribeDateProperties = metadata;

		return ApiPropertyDate({
			entity,
			...config,
			...restProperties,
		});
	}
}
