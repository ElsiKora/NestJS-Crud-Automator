import { ApiPropertyBoolean } from "../../../../../decorator";

import type { IApiEntity, IDtoGenerateFactory } from "../../../../../interface";
import type { TApiPropertyDescribeBooleanProperties, TApiPropertyDescribeDtoProperties } from "../../../../../type";

export class DtoPropertyFactoryBoolean<E> implements IDtoGenerateFactory<E> {
	create(metadata: TApiPropertyDescribeBooleanProperties, entity: IApiEntity<E>, config: TApiPropertyDescribeDtoProperties): PropertyDecorator {
		return ApiPropertyBoolean({
			description: metadata.description,
			entity,
			...config,
		});
	}
}
