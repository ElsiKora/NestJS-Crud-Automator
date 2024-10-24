import { ApiPropertyDate } from "../../../../../decorator";

import type { IApiEntity, IDtoGenerateFactory } from "../../../../../interface";
import type { TApiPropertyDescribeDateProperties, TApiPropertyDescribeDtoProperties } from "../../../../../type";

export class DtoPropertyFactoryDate<E> implements IDtoGenerateFactory<E> {
	create(metadata: TApiPropertyDescribeDateProperties, entity: IApiEntity<E>, config: TApiPropertyDescribeDtoProperties): PropertyDecorator {
		return ApiPropertyDate({
			entity,
			...config,
			type: metadata.dataType,
		});
	}
}
